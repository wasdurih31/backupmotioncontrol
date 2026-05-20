import { db } from '@/db';
import { tasks, adminVideoKeys } from '@/db/schema';
import { eq, and, lt, asc, inArray } from 'drizzle-orm';
import { deleteFromR2, getR2KeyFromUrl } from '@/lib/r2';
import { freepikFetch } from '@/lib/proxyFetch';
import { decrypt } from '@/lib/crypto';

// Result video berlaku 30 menit setelah selesai.
export const RESULT_TTL_MS = 30 * 60 * 1000;

// ─── Startup Poll Flag ──────────────────────────────────────────────
// Pada cold start (setelah restart/deploy), polling Freepik dijalankan
// SATU KALI untuk catch-up webhook yang mungkin terlewat saat server mati.
// Setelah itu, semua update mengandalkan webhook saja.
let _startupPollDone = false;

/** Delete files dari R2 — gratis unlimited operations. */
async function cleanupBlobs(urls: (string | null | undefined)[]) {
  for (const url of urls) {
    if (!url) continue;
    const key = getR2KeyFromUrl(url);
    if (key) {
      await deleteFromR2(key);
    }
  }
}

/** Opportunistic cleanup: hapus blob dari task yang sudah expired. */
export async function cleanupExpiredTasks() {
  try {
    const expired = await db.select({ id: tasks.id, resultUrl: tasks.resultUrl })
      .from(tasks)
      .where(and(eq(tasks.status, 'success'), lt(tasks.expiresAt, new Date())))
      .limit(10);

    for (const task of expired) {
      await cleanupBlobs([task.resultUrl]);
      await db.update(tasks)
        .set({ resultUrl: null, status: 'expired' as any })
        .where(eq(tasks.id, task.id));
    }
  } catch (e) {
    console.warn('[Cleanup] Error cleaning expired tasks:', e);
  }
}

type DbTask = typeof tasks.$inferSelect;

/**
 * One-time startup poll: cek semua Freepik tasks yang masih "processing" di DB.
 * Dijalankan sekali saat cold start untuk catch-up webhook yang mungkin
 * terlewat saat server down. Setelah ini, semua update lewat webhook.
 */
async function runStartupPoll(): Promise<void> {
  if (_startupPollDone) return;
  _startupPollDone = true;

  try {
    // Ambil semua task Freepik yang masih processing
    const freepikEngines = ['kling', 'kling_v3', 'kling_v3_i2v', 'kling_pro', 'kling_2_1_pro', 'pixverse', 'wan_2_5'];
    const pendingTasks = await db.select()
      .from(tasks)
      .where(and(
        eq(tasks.status, 'processing'),
        // Engine bukan veo/grok (itu geminigen, bukan freepik)
      ))
      .limit(50);

    // Filter hanya Freepik tasks (bukan veo/grok)
    const freepikTasks = pendingTasks.filter(
      t => t.engine !== 'veo' && t.engine !== 'grok'
    );

    if (freepikTasks.length === 0) {
      console.log('[Startup Poll] ✅ No pending Freepik tasks — nothing to catch up');
      return;
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log(`[Startup Poll] 🔄 Catching up ${freepikTasks.length} pending Freepik task(s)`);
    console.log('═══════════════════════════════════════════════════════');

    // Kumpulkan API keys yang dibutuhkan
    // PAYG tasks: pakai pool key
    // BYOK tasks: pakai user key
    const { users } = await import('@/db/schema');

    for (const task of freepikTasks) {
      try {
        let apiKey: string | null = null;

        if (task.source === 'payg_freepik_pool') {
          // PAYG: ambil pool key
          const [poolKey] = await db.select()
            .from(adminVideoKeys)
            .where(and(
              eq(adminVideoKeys.provider, 'freepik'),
              eq(adminVideoKeys.status, 'active'),
              eq(adminVideoKeys.isActive, true),
            ))
            .orderBy(asc(adminVideoKeys.lastUsedAt))
            .limit(1);
          if (poolKey) {
            try { apiKey = decrypt(poolKey.apiKeyEncrypted); } catch { /* skip */ }
          }
        } else {
          // BYOK: ambil user key
          const [u] = await db.select({ apiKey: users.apiKey })
            .from(users)
            .where(eq(users.id, task.userId))
            .limit(1);
          if (u?.apiKey) apiKey = u.apiKey;
        }

        if (!apiKey) {
          console.warn(`[Startup Poll] No API key for task ${task.id}, skipping`);
          continue;
        }

        // Poll Freepik / Magnific
        const pollingEndpoint = task.engine === 'wan_2_5'
          ? `https://api.magnific.com/v1/ai/image-to-video/wan-2-5-i2v-1080p/${task.id}`
          : task.engine === 'kling_v3'
          ? `https://api.magnific.com/v1/ai/video/kling-v3-motion-control-${task.model === 'motion_control_pro' ? 'pro' : 'std'}/${task.id}`
          : task.engine === 'kling_v3_i2v'
          ? `https://api.magnific.com/v1/ai/video/kling-v3/${task.id}`
          : task.engine === 'pixverse'
          ? `https://api.freepik.com/v1/ai/image-to-video/pixverse-v5/${task.id}`
          : task.engine === 'kling_2_1_pro'
          ? `https://api.freepik.com/v1/ai/image-to-video/kling-v2-1/${task.id}`
          : `https://api.freepik.com/v1/ai/image-to-video/kling-v2-6/${task.id}`;

        const res = await freepikFetch(pollingEndpoint, {
          headers: {
            'Accept': 'application/json',
            'x-freepik-api-key': apiKey,
            'x-magnific-api-key': apiKey,
          },
        });

        if (!res.ok) {
          console.warn(`[Startup Poll] Task ${task.id}: HTTP ${res.status}, skipping`);
          continue;
        }

        const freepikData = await res.json();
        const remoteTask = freepikData.data;
        const rs = remoteTask?.status;

        if (rs === 'COMPLETED' || rs === 'completed' || rs === 'success') {
          const resultUrl = (Array.isArray(remoteTask.generated) && remoteTask.generated.length > 0)
            ? remoteTask.generated[0]
            : remoteTask.video?.url || remoteTask.result?.video?.url || remoteTask.url || null;

          const expiresAt = new Date(Date.now() + RESULT_TTL_MS);
          await db.update(tasks).set({
            status: 'success' as any,
            resultUrl,
            prompt: null,
            expiresAt,
            videoUrl: null,
            imageUrl: null,
          }).where(eq(tasks.id, task.id));
          await cleanupBlobs([task.videoUrl, task.imageUrl]);

          console.log(`[Startup Poll] ✅ Task ${task.id} → SUCCESS (caught up)`);
        } else if (rs === 'FAILED' || rs === 'failed' || rs === 'error') {
          await db.update(tasks).set({
            status: 'failed' as any,
            videoUrl: null,
            imageUrl: null,
          }).where(eq(tasks.id, task.id));
          await cleanupBlobs([task.videoUrl, task.imageUrl]);

          console.log(`[Startup Poll] ❌ Task ${task.id} → FAILED (caught up)`);
        } else {
          console.log(`[Startup Poll] ⏳ Task ${task.id} still ${rs}, will wait for webhook`);
        }
      } catch (e) {
        console.warn(`[Startup Poll] Error polling task ${task.id}:`, e);
      }
    }

    console.log('[Startup Poll] ✅ Catch-up complete — switching to webhook-only mode');
  } catch (e) {
    console.error('[Startup Poll] Error:', e);
  }
}

/**
 * Poll status 1 task dan sinkronkan ke DB.
 * - Freepik: webhook primary, startup poll catch-up (1x saja)
 * - Geminigen: webhook primary + polling fallback
 */
export async function pollAndUpdateTask(task: DbTask, apiKey: string): Promise<DbTask> {
  // Sudah final — tidak perlu hit provider.
  if (task.status === 'success' || task.status === 'failed' || task.status === 'expired') {
    return task;
  }

  // Route to appropriate handler based on engine
  if (task.engine === 'veo' || task.engine === 'grok') {
    // Geminigen.ai: polling sebagai fallback (webhook primary).
    return await pollGeminigenTask(task);
  }

  // Freepik tasks: jalankan startup poll 1x, lalu cukup return dari DB.
  if (!_startupPollDone) {
    await runStartupPoll();
    // Re-fetch task dari DB karena mungkin sudah diupdate oleh startup poll
    const [refreshed] = await db.select().from(tasks).where(eq(tasks.id, task.id)).limit(1);
    return refreshed || task;
  }

  // Jika di local development (atau localhost URL), polling fallback jalan terus karena webhook tidak bisa dipanggil.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
    return await pollFreepikTaskLocally(task, apiKey);
  }

  // Setelah startup poll selesai: hanya mengandalkan webhook
  return task;
}

async function pollFreepikTaskLocally(task: DbTask, apiKey: string): Promise<DbTask> {
  const pollingEndpoint = task.engine === 'wan_2_5'
    ? `https://api.magnific.com/v1/ai/image-to-video/wan-2-5-i2v-1080p/${task.id}`
    : task.engine === 'kling_v3'
    ? `https://api.magnific.com/v1/ai/video/kling-v3-motion-control-${task.model === 'motion_control_pro' ? 'pro' : 'std'}/${task.id}`
    : task.engine === 'kling_v3_i2v'
    ? `https://api.magnific.com/v1/ai/video/kling-v3/${task.id}`
    : task.engine === 'pixverse'
    ? `https://api.freepik.com/v1/ai/image-to-video/pixverse-v5/${task.id}`
    : task.engine === 'kling_2_1_pro'
    ? `https://api.freepik.com/v1/ai/image-to-video/kling-v2-1/${task.id}`
    : `https://api.freepik.com/v1/ai/image-to-video/kling-v2-6/${task.id}`;

  try {
    const res = await freepikFetch(pollingEndpoint, {
      headers: {
        'Accept': 'application/json',
        'x-freepik-api-key': apiKey,
        'x-magnific-api-key': apiKey,
      },
    });

    if (!res.ok) return task;
    const freepikData = await res.json();
    const remoteTask = freepikData.data;

    if (!remoteTask) return task;

    const rs = remoteTask.status || remoteTask.state;
    if (rs === 'COMPLETED' || rs === 'completed' || rs === 'success') {
      let resultUrl = remoteTask.video?.url || remoteTask.video_url || remoteTask.result?.url || null;
      if (!resultUrl) resultUrl = typeof remoteTask.result === 'string' ? remoteTask.result : null;

      const expiresAt = new Date(Date.now() + RESULT_TTL_MS);
      await db.update(tasks).set({
        status: 'success' as any,
        resultUrl,
        prompt: null,
        expiresAt,
        videoUrl: null,
        imageUrl: null,
      }).where(eq(tasks.id, task.id));
      await cleanupBlobs([task.videoUrl, task.imageUrl]);

      return { ...task, status: 'success', resultUrl, expiresAt, prompt: null, videoUrl: null, imageUrl: null };
    } else if (rs === 'FAILED' || rs === 'failed' || rs === 'error') {
      await db.update(tasks).set({
        status: 'failed' as any,
        videoUrl: null,
        imageUrl: null,
      }).where(eq(tasks.id, task.id));
      await cleanupBlobs([task.videoUrl, task.imageUrl]);

      return { ...task, status: 'failed', videoUrl: null, imageUrl: null };
    }
  } catch (e) {
    console.warn(`[Local Poll] Error polling task ${task.id}:`, e);
  }
  return task;
}

/**
 * Poll geminigen.ai task (veo / grok engines).
 * Uses admin pool key since PAYG users don't have their own geminigen key.
 * Tries multiple endpoint formats as fallback to webhook.
 */
async function pollGeminigenTask(task: DbTask): Promise<DbTask> {
  // Get geminigen pool key (sticky: oldest last_used_at)
  const [poolKey] = await db.select()
    .from(adminVideoKeys)
    .where(
      and(
        eq(adminVideoKeys.provider, 'geminigen'),
        eq(adminVideoKeys.status, 'active'),
        eq(adminVideoKeys.isActive, true),
      ),
    )
    .orderBy(asc(adminVideoKeys.lastUsedAt))
    .limit(1);

  if (!poolKey) {
    console.warn(`[Poll ${task.id}] No active geminigen pool key available for polling.`);
    return task;
  }

  let decryptedKey: string;
  try {
    decryptedKey = decrypt(poolKey.apiKeyEncrypted);
  } catch (e) {
    console.warn(`[Poll ${task.id}] Failed to decrypt geminigen pool key.`);
    return task;
  }

  // Try multiple endpoint formats — geminigen docs are unclear on polling
  const taskIdForPoll = task.freepikTaskId || task.id; // numeric id or uuid
  const endpoints = [
    // Format 1: /uapi/v1/video-gen/{engine}/{id}
    task.engine === 'veo'
      ? `https://api.geminigen.ai/uapi/v1/video-gen/veo/${taskIdForPoll}`
      : `https://api.geminigen.ai/uapi/v1/video-gen/grok/${taskIdForPoll}`,
    // Format 2: /uapi/v1/tasks/{uuid}
    `https://api.geminigen.ai/uapi/v1/tasks/${task.id}`,
    // Format 3: /uapi/v1/video-gen/status/{id}
    `https://api.geminigen.ai/uapi/v1/video-gen/status/${taskIdForPoll}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'x-api-key': decryptedKey,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        // 404 = endpoint doesn't exist, try next
        if (res.status === 404) continue;
        // Other errors — skip polling entirely
        return task;
      }

      const data = await res.json();
      console.log(`[Poll ${task.id}] geminigen response from ${endpoint}:`, JSON.stringify(data).slice(0, 300));

      // Extract status — geminigen uses numeric status: 1=processing, 2=completed, 3=failed
      const remoteStatus = data?.data?.status ?? data?.status ?? data?.status_desc;
      let newStatus: string = task.status;
      let resultUrl: string | null = task.resultUrl;

      const isCompleted = remoteStatus === 2 || remoteStatus === 'completed' || remoteStatus === 'success' || remoteStatus === 'COMPLETED';
      const isFailed = remoteStatus === 3 || remoteStatus === 4 || remoteStatus === 'failed' || remoteStatus === 'error' || remoteStatus === 'FAILED';

      if (isCompleted) {
        newStatus = 'success';
        resultUrl = data?.data?.video_url || data?.video_url
          || data?.data?.url || data?.url
          || data?.data?.output_url || data?.output_url
          || data?.data?.result?.url || data?.data?.media_url
          || null;
      } else if (isFailed) {
        newStatus = 'failed';
      } else {
        newStatus = 'processing';
      }

      if (newStatus === task.status) {
        return task;
      }

      if (newStatus === 'success') {
        const expiresAt = new Date(Date.now() + RESULT_TTL_MS);
        await db.update(tasks).set({
          status: 'success' as any,
          resultUrl,
          prompt: null,
          expiresAt,
          videoUrl: null,
          imageUrl: null,
        }).where(eq(tasks.id, task.id));
        await cleanupBlobs([task.videoUrl, task.imageUrl]);

        task.status = 'success' as any;
        task.resultUrl = resultUrl;
        task.prompt = null;
        task.expiresAt = expiresAt;
        task.videoUrl = null;
        task.imageUrl = null;
      } else if (newStatus === 'failed') {
        await db.update(tasks).set({
          status: 'failed' as any,
          videoUrl: null,
          imageUrl: null,
        }).where(eq(tasks.id, task.id));
        await cleanupBlobs([task.videoUrl, task.imageUrl]);

        task.status = 'failed' as any;
        task.videoUrl = null;
        task.imageUrl = null;
      } else {
        await db.update(tasks).set({ status: newStatus as any }).where(eq(tasks.id, task.id));
        task.status = newStatus as any;
      }

      return task;
    } catch (e) {
      // Network error on this endpoint — try next
      continue;
    }
  }

  // All endpoints failed (404) — rely on webhook, return task as-is from DB
  return task;
}
