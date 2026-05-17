import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { users, tasks, adminVideoKeys, balanceTransactions, appSettings } from '@/db/schema';
import { and, eq, inArray, sql, gt, asc } from 'drizzle-orm';
import { runFreepikCall } from '@/lib/freepikQueue';
import { deleteFromR2, getR2KeyFromUrl } from '@/lib/r2';
import { decrypt } from '@/lib/crypto';

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
      return handlePaygGenerate(req, session.id);
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

/** Safely delete files dari R2 — unlimited operations, gratis. */
async function cleanupBlobs(urls: (string | null | undefined)[]) {
  for (const url of urls) {
    if (!url) continue;
    const key = getR2KeyFromUrl(url);
    if (key) {
      try {
        await deleteFromR2(key);
      } catch (e) {
        console.warn(`[Cleanup] Failed to delete R2 key: ${key}`, e);
      }
    }
  }
}

// ─── PAYG Model Definitions ──────────────────────────────────────────
type PaygModel = 'kling_std' | 'kling_pro' | 'veo_720' | 'veo_1080' | 'grok_720';

const PAYG_MODEL_CONFIG: Record<PaygModel, {
  provider: 'freepik' | 'geminigen';
  settingsKey: string;
  source: string;
  engine: string;
  model: string;
}> = {
  kling_std: {
    provider: 'freepik',
    settingsKey: 'price_kling_std',
    source: 'payg_freepik_pool',
    engine: 'kling',
    model: 'motion_control_std',
  },
  kling_pro: {
    provider: 'freepik',
    settingsKey: 'price_kling_pro',
    source: 'payg_freepik_pool',
    engine: 'kling',
    model: 'motion_control_pro',
  },
  veo_720: {
    provider: 'geminigen',
    settingsKey: 'price_veo_720',
    source: 'payg_geminigen_pool',
    engine: 'veo',
    model: 'veo-3.1-fast',
  },
  veo_1080: {
    provider: 'geminigen',
    settingsKey: 'price_veo_1080',
    source: 'payg_geminigen_pool',
    engine: 'veo',
    model: 'veo-3.1-fast',
  },
  grok_720: {
    provider: 'geminigen',
    settingsKey: 'price_grok_720',
    source: 'payg_geminigen_pool',
    engine: 'grok',
    model: 'grok-3',
  },
};

/** Handle PAYG video generation flow. */
async function handlePaygGenerate(req: Request, userId: string) {
  const {
    videoUrl, imageUrl, prompt, character_orientation, cfg_scale, model, engine, paygModel, duration,
  } = await req.json();

  // ── Validate paygModel ──
  if (!paygModel || !PAYG_MODEL_CONFIG[paygModel as PaygModel]) {
    return NextResponse.json({ error: 'Model PAYG tidak valid.' }, { status: 400 });
  }

  const config = PAYG_MODEL_CONFIG[paygModel as PaygModel];

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
  }
  if ((paygModel === 'kling_std' || paygModel === 'kling_pro') && !videoUrl) {
    return NextResponse.json({ error: 'Video URL is required for Kling Motion Control.' }, { status: 400 });
  }

  // ── Concurrency check ──
  const cutoff = new Date(Date.now() - TASK_MAX_AGE_MS);
  await db.update(tasks).set({ status: 'failed' as any })
    .where(
      and(
        eq(tasks.userId, userId),
        inArray(tasks.status, ['queued', 'processing']),
        sql`${tasks.createdAt} <= ${cutoff}`,
      ),
    );

  const preCount = await countActive(userId);
  if (preCount >= MAX_CONCURRENT_PER_USER) {
    await cleanupBlobs([videoUrl, imageUrl]);
    return NextResponse.json({
      error: `Batas maksimum ${MAX_CONCURRENT_PER_USER} proses berjalan tercapai. Tunggu salah satu selesai.`,
      code: 'TOO_MANY_ACTIVE',
      active: preCount,
      limit: MAX_CONCURRENT_PER_USER,
    }, { status: 429 });
  }

  // ── Get cost from appSettings ──
  const [setting] = await db.select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, config.settingsKey))
    .limit(1);

  const cost = parseInt(setting?.value || '0', 10);
  if (!cost || cost <= 0) {
    return NextResponse.json({ error: 'Harga model belum dikonfigurasi. Hubungi admin.' }, { status: 500 });
  }

  // ── Check balance ──
  const [userRow] = await db.select({
    balance: users.balance,
    totalGenerate: users.totalGenerate,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!userRow || userRow.balance < cost) {
    await cleanupBlobs([videoUrl, imageUrl]);
    const bal = userRow?.balance ?? 0;
    return NextResponse.json({
      error: `Saldo tidak cukup. Saldo: Rp ${bal.toLocaleString('id-ID')}, Biaya: Rp ${cost.toLocaleString('id-ID')}`,
    }, { status: 402 });
  }

  // ── Get pool API key (sticky failover) ──
  const [poolKey] = await db.select()
    .from(adminVideoKeys)
    .where(
      and(
        eq(adminVideoKeys.provider, config.provider),
        eq(adminVideoKeys.status, 'active'),
        eq(adminVideoKeys.isActive, true),
      ),
    )
    .orderBy(asc(adminVideoKeys.lastUsedAt))
    .limit(1);

  if (!poolKey) {
    await cleanupBlobs([videoUrl, imageUrl]);
    return NextResponse.json({
      error: 'Server sedang tidak tersedia. Hubungi admin.',
    }, { status: 503 });
  }

  let decryptedKey: string;
  try {
    decryptedKey = decrypt(poolKey.apiKeyEncrypted);
  } catch (e) {
    console.error('[PAYG] Failed to decrypt pool key:', e);
    await cleanupBlobs([videoUrl, imageUrl]);
    return NextResponse.json({ error: 'Server error. Hubungi admin.' }, { status: 500 });
  }

  // ── Call provider API ──
  let taskId: string | null = null;
  let apiResponse: Response;

  try {
    if (config.provider === 'freepik') {
      // Kling Motion Control via Freepik
      const endpoint = paygModel === 'kling_pro'
        ? 'https://api.freepik.com/v1/ai/video/kling-v2-6-motion-control-pro'
        : 'https://api.freepik.com/v1/ai/video/kling-v2-6-motion-control-std';

      const payload = {
        video_url: videoUrl,
        image_url: imageUrl,
        prompt: prompt || '',
        character_orientation: character_orientation || 'video',
        cfg_scale: typeof cfg_scale === 'number' ? cfg_scale : 0.5,
      };

      apiResponse = await runFreepikCall(() => fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-freepik-api-key': decryptedKey,
        },
        body: JSON.stringify(payload),
      }));
    } else {
      // Geminigen (veo / grok) — multipart/form-data format
      const endpoint = config.engine === 'veo'
        ? 'https://api.geminigen.ai/uapi/v1/video-gen/veo'
        : 'https://api.geminigen.ai/uapi/v1/video-gen/grok';

      const formData = new FormData();
      formData.append('prompt', prompt || 'Generate video from reference image');

      if (config.engine === 'veo') {
        // Veo 3.1 Fast: model=veo-3.1-fast, duration fixed 8s, resolution 720p/1080p
        formData.append('model', 'veo-3.1-fast');
        formData.append('resolution', paygModel === 'veo_1080' ? '1080p' : '720p');
        formData.append('duration', '8');
        formData.append('aspect_ratio', '16:9');
        if (imageUrl) formData.append('file_urls', imageUrl);
        formData.append('mode_image', 'frame');
      } else {
        // Grok AI: model=grok-3, duration from request (6 or 10), resolution 720p, aspect_ratio landscape
        formData.append('model', 'grok-3');
        formData.append('resolution', '720p');
        formData.append('duration', String(duration || 6));
        formData.append('aspect_ratio', 'landscape');
        formData.append('mode', 'custom');
        if (imageUrl) formData.append('file_urls', imageUrl);
      }

      apiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': decryptedKey,
        },
        body: formData,
      });
    }

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({ message: `HTTP ${apiResponse.status}` }));
      console.error(`[PAYG] API Error (${config.provider}):`, JSON.stringify(errorData, null, 2));

      // Mark key based on HTTP status
      const newStatus = apiResponse.status === 429 ? 'limit_reached' : 'error';
      await db.update(adminVideoKeys).set({
        status: newStatus,
        lastError: JSON.stringify(errorData).slice(0, 500),
        errorCount: sql`${adminVideoKeys.errorCount} + 1`,
      }).where(eq(adminVideoKeys.id, poolKey.id));

      await cleanupBlobs([videoUrl, imageUrl]);
      // User-facing error tanpa expose provider name
      let userMessage = 'Generate gagal. ';
      if (apiResponse.status === 429) {
        userMessage += 'Server sedang sibuk. Coba lagi dalam beberapa menit.';
      } else if (apiResponse.status === 400) {
        userMessage += 'File atau prompt tidak valid. Pastikan gambar/video sesuai format.';
      } else if (apiResponse.status === 402 || apiResponse.status === 403) {
        userMessage += 'Akses ditolak. Hubungi admin.';
      } else {
        userMessage += 'Terjadi kesalahan pada server AI. Coba lagi nanti.';
      }
      return NextResponse.json({ error: userMessage }, { status: apiResponse.status >= 500 ? 502 : apiResponse.status });
    }

    const responseData = await apiResponse.json();
    console.log(`[PAYG] Response from ${config.provider}:`, JSON.stringify(responseData).slice(0, 500));

    // Extract task_id from response — try multiple possible paths
    taskId = responseData?.data?.task_id
      || responseData?.task_id
      || responseData?.uuid
      || responseData?.data?.uuid
      || responseData?.data?.id?.toString()
      || responseData?.id?.toString()
      || null;
    if (!taskId) {
      console.error(`[PAYG] No task_id in response:`, responseData);
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({ error: 'Server AI tidak merespon dengan benar. Coba lagi.' }, { status: 500 });
    }
  } catch (e: any) {
    console.error(`[PAYG] Network error calling ${config.provider}:`, e);
    await cleanupBlobs([videoUrl, imageUrl]);
    return NextResponse.json({ error: 'Gagal terhubung ke server AI. Coba lagi nanti.' }, { status: 502 });
  }

  // ── API call succeeded — now charge balance atomically ──
  const [deducted] = await db.update(users)
    .set({ balance: sql`${users.balance} - ${cost}` })
    .where(and(eq(users.id, userId), sql`${users.balance} >= ${cost}`))
    .returning({ balance: users.balance });

  if (!deducted) {
    // Race condition: balance became insufficient between check and deduction
    await cleanupBlobs([videoUrl, imageUrl]);
    return NextResponse.json({
      error: 'Saldo tidak cukup (race condition). Silakan coba lagi.',
    }, { status: 402 });
  }

  // ── Insert balance transaction ──
  const modelLabel = paygModel.replace('_', ' ').toUpperCase();
  await db.insert(balanceTransactions).values({
    id: crypto.randomUUID(),
    userId,
    type: 'usage',
    amount: -cost,
    balanceBefore: deducted.balance + cost,
    balanceAfter: deducted.balance,
    description: `Generate ${modelLabel}`,
    taskId,
  });

  // ── Insert task to DB ──
  await db.insert(tasks).values({
    id: taskId,
    userId,
    prompt: prompt || null,
    videoUrl: videoUrl || null,
    imageUrl,
    characterOrientation: character_orientation || null,
    engine: config.engine,
    model: config.model,
    status: 'processing',
    costRupiah: cost,
    source: config.source,
  });

  // ── Post-check concurrency race ──
  const postCount = await countActive(userId);
  if (postCount > MAX_CONCURRENT_PER_USER) {
    console.warn(`[PAYG Race] User ${userId} post-insert count=${postCount}, rolling back ${taskId}`);
    await db.delete(tasks).where(eq(tasks.id, taskId));
    // Refund balance
    await db.update(users).set({ balance: sql`${users.balance} + ${cost}` }).where(eq(users.id, userId));
    await db.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      userId,
      type: 'refund',
      amount: cost,
      balanceBefore: deducted.balance,
      balanceAfter: deducted.balance + cost,
      description: `Refund ${modelLabel} (race condition)`,
      taskId,
    });
    await cleanupBlobs([videoUrl, imageUrl]);
    return NextResponse.json({
      error: `Batas ${MAX_CONCURRENT_PER_USER} proses bersamaan tercapai (race). Silakan coba lagi.`,
      code: 'TOO_MANY_ACTIVE',
      active: postCount,
      limit: MAX_CONCURRENT_PER_USER,
    }, { status: 429 });
  }

  // ── Mark key as used ──
  await db.update(adminVideoKeys).set({
    usageCount: sql`${adminVideoKeys.usageCount} + 1`,
    lastUsedAt: new Date(),
  }).where(eq(adminVideoKeys.id, poolKey.id));

  // ── Increment totalGenerate ──
  await db.update(users)
    .set({ totalGenerate: (userRow.totalGenerate || 0) + 1 })
    .where(eq(users.id, userId));

  return NextResponse.json({
    success: true,
    taskId,
    active: postCount,
    limit: MAX_CONCURRENT_PER_USER,
  });
}
