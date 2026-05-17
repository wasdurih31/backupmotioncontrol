import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { del } from '@vercel/blob';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { and, eq, inArray, sql, gt } from 'drizzle-orm';
import { runFreepikCall } from '@/lib/freepikQueue';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

// Maksimum task berjalan bersamaan per user (status: queued / processing).
const MAX_CONCURRENT_PER_USER = 5;
// Task yang lebih tua dari ini dianggap expired/orphan dan tidak dihitung.
const TASK_MAX_AGE_MS = 40 * 60 * 1000; // 40 menit

async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    return payload as { id: string; role: string; accessCode: string };
  } catch (_error) {
    return null;
  }
}

/** Hitung task aktif user (queued + processing) yang belum expired. */
async function countActive(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - TASK_MAX_AGE_MS);
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        inArray(tasks.status, ['queued', 'processing']),
        gt(tasks.createdAt, cutoff),
      ),
    );
  return rows[0]?.c ?? 0;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Account type check ──
    const [accountCheck] = await db.select({
      accountType: users.accountType,
      subscriptionEnd: users.subscriptionEnd,
    }).from(users).where(eq(users.id, session.id)).limit(1);

    if (!accountCheck) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (accountCheck.accountType === 'payg') {
      return NextResponse.json({
        error: 'Fitur generate untuk akun PAYG sedang dalam pengembangan.',
      }, { status: 400 });
    }

    if (accountCheck.accountType === 'byok') {
      if (!accountCheck.subscriptionEnd || new Date(accountCheck.subscriptionEnd) < new Date()) {
        return NextResponse.json({
          error: 'Subscription BYOK Anda sudah habis. Perpanjang untuk melanjutkan generate.',
        }, { status: 403 });
      }
    }

    const {
      videoUrl, imageUrl, prompt, character_orientation, cfg_scale, model, engine,
      resolution, duration, negative_prompt, style,
    } = await req.json();

    if (!imageUrl || (engine === 'kling' && !videoUrl)) {
      return NextResponse.json({ error: 'Image (and Video for Kling) URLs are required' }, { status: 400 });
    }

    // ── Pre-check slot concurrency user ──
    // Juga bersihkan task orphan (stuck >40 menit) agar tidak blokir user.
    const cutoff = new Date(Date.now() - TASK_MAX_AGE_MS);
    await db.update(tasks).set({ status: 'failed' as any })
      .where(
        and(
          eq(tasks.userId, session.id),
          inArray(tasks.status, ['queued', 'processing']),
          // Task yang createdAt <= cutoff = sudah expired
          sql`${tasks.createdAt} <= ${cutoff}`,
        ),
      );

    const preCount = await countActive(session.id);
    if (preCount >= MAX_CONCURRENT_PER_USER) {
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({
        error: `Batas maksimum ${MAX_CONCURRENT_PER_USER} proses berjalan tercapai. Tunggu salah satu selesai sebelum memulai baru.`,
        code: 'TOO_MANY_ACTIVE',
        active: preCount,
        limit: MAX_CONCURRENT_PER_USER,
      }, { status: 429 });
    }

    // ── Ambil API key user ──
    const userResult = await db.select({
      id: users.id,
      apiKey: users.apiKey,
      totalGenerate: users.totalGenerate,
    }).from(users).where(eq(users.id, session.id)).limit(1);

    if (!userResult.length || !userResult[0].apiKey) {
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({ error: 'API Key not found. Please configure it in Profile Settings.' }, { status: 400 });
    }

    const user = userResult[0];

    // ── Tentukan endpoint & payload Freepik ──
    let endpoint = '';
    let payload: Record<string, unknown> = {};

    if (engine === 'pixverse') {
      endpoint = 'https://api.freepik.com/v1/ai/image-to-video/pixverse-v5';
      payload = {
        image_url: imageUrl,
        prompt: prompt,
        resolution: resolution || '720p',
        duration: duration || 5,
        negative_prompt: negative_prompt || '',
        art_style: style || undefined,
      };
    } else if (engine === 'kling_2_1_pro') {
      endpoint = 'https://api.freepik.com/v1/ai/image-to-video/kling-v2-1-pro';
      payload = {
        image: imageUrl,
        prompt: prompt,
        duration: duration ? duration.toString() : '5',
        cfg_scale: typeof cfg_scale === 'number' ? cfg_scale : 0.5,
      };
      if (negative_prompt) {
        (payload as Record<string, unknown>).negative_prompt = negative_prompt;
      }
    } else {
      // Kling (default)
      endpoint = model === 'pro'
        ? 'https://api.freepik.com/v1/ai/video/kling-v2-6-motion-control-pro'
        : 'https://api.freepik.com/v1/ai/video/kling-v2-6-motion-control-std';

      payload = {
        video_url: videoUrl,
        image_url: imageUrl,
        prompt: prompt || '',
        character_orientation: character_orientation || 'video',
        cfg_scale: typeof cfg_scale === 'number' ? cfg_scale : 0.5,
      };
    }

    // ── Serialisasi call ke Freepik (untuk POST submit) ──
    const freepikRes = await runFreepikCall(() => fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-freepik-api-key': user.apiKey as string,
      },
      body: JSON.stringify(payload),
    }));

    const freepikData = await freepikRes.json();

    if (!freepikRes.ok) {
      console.error('Freepik API Error Full:', JSON.stringify(freepikData, null, 2));
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({
        error: `${freepikData.message || 'Failed to generate video'}: ${JSON.stringify(freepikData)}`,
      }, { status: freepikRes.status });
    }

    const taskId = freepikData?.data?.task_id || freepikData?.task_id;
    if (!taskId) {
      console.error('Freepik API unrecognized success response:', freepikData);
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({ error: 'Invalid response from Freepik API' }, { status: 500 });
    }

    // ── Simpan task ke DB ──
    await db.insert(tasks).values({
      id: taskId,
      userId: user.id,
      prompt: prompt || null,
      videoUrl: videoUrl || null,
      imageUrl: imageUrl,
      characterOrientation: character_orientation || null,
      engine: engine || 'kling',
      model: model || 'motion_control_std',
      status: 'processing',
    });

    // ── Post-check: detect race condition ──
    // Kalau antara pre-check dan insert tadi ada request lain yang juga lolos
    // dan membuat total > MAX, rollback row ini dan tolak user yang "kalah".
    const postCount = await countActive(user.id);
    if (postCount > MAX_CONCURRENT_PER_USER) {
      console.warn(`[Race] User ${user.id} post-insert count=${postCount}, rolling back ${taskId}`);
      // Hapus row yang baru saja dibuat — user harus submit ulang.
      await db.delete(tasks).where(eq(tasks.id, taskId));
      await cleanupBlobs([videoUrl, imageUrl]);
      // NOTE: task di sisi Freepik tetap berjalan dan akan expired sendiri.
      // Tidak perfect tapi dalam praktik jarang tercapai karena frontend
      // sudah disable tombol saat isSubmitting.
      return NextResponse.json({
        error: `Batas ${MAX_CONCURRENT_PER_USER} proses bersamaan tercapai (race). Silakan coba lagi.`,
        code: 'TOO_MANY_ACTIVE',
        active: postCount,
        limit: MAX_CONCURRENT_PER_USER,
      }, { status: 429 });
    }

    // Naikkan totalGenerate
    await db.update(users)
      .set({ totalGenerate: (user.totalGenerate || 0) + 1 })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      taskId,
      active: postCount,
      limit: MAX_CONCURRENT_PER_USER,
    });
  }
  catch (error) {
    console.error('Generate Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** Safely delete blobs — never throw even if deletion fails */
async function cleanupBlobs(urls: (string | null | undefined)[]) {
  for (const url of urls) {
    if (url && url.includes('blob.vercel-storage.com')) {
      try {
        await del(url);
        console.log(`[Cleanup] Deleted blob: ${url.slice(0, 60)}...`);
      } catch (e) {
        console.warn(`[Cleanup] Failed to delete blob: ${url}`, e);
      }
    }
  }
}
