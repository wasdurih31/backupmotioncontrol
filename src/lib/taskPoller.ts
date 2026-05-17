import { db } from '@/db';
import { tasks, adminVideoKeys } from '@/db/schema';
import { eq, and, lt, asc } from 'drizzle-orm';
import { deleteFromR2, getR2KeyFromUrl } from '@/lib/r2';
import { decrypt } from '@/lib/crypto';

// Result video berlaku 30 menit setelah selesai.
export const RESULT_TTL_MS = 30 * 60 * 1000;

/** Delete files dari R2 — gratis unlimited operations. */
async function cleanupBlobs(urls: (string | null | undefined)[]) {
  for (const url of urls) {
    if (!url) continue;
    const key = getR2KeyFromUrl(url);
    if (key) {
      await deleteFromR2(key);
    }
    // Juga handle legacy Vercel Blob URLs (skip, tidak bisa delete lagi)
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
 * Poll status 1 task ke Freepik/Geminigen dan sinkronkan ke DB.
 * Mengembalikan task terbaru (sudah ter-update jika ada perubahan).
 */
export async function pollAndUpdateTask(task: DbTask, apiKey: string): Promise<DbTask> {
  // Sudah final — tidak perlu hit provider.
  if (task.status === 'success' || task.status === 'failed' || task.status === 'expired') {
    return task;
  }

  // Route to appropriate poller based on engine
  if (task.engine === 'veo' || task.engine === 'grok') {
    // Geminigen.ai: coba polling sebagai fallback (webhook adalah primary).
    // Jika polling gagal (404/error), tetap return task dari DB.
    return await pollGeminigenTask(task);
  }

  const pollingEndpoint = task.engine === 'pixverse'
    ? `https://api.freepik.com/v1/ai/image-to-video/pixverse-v5/${task.id}`
    : task.engine === 'kling_2_1_pro'
    ? `https://api.freepik.com/v1/ai/image-to-video/kling-v2-1/${task.id}`
    : `https://api.freepik.com/v1/ai/image-to-video/kling-v2-6/${task.id}`;

  try {
    const freepikRes = await fetch(pollingEndpoint, {
      headers: {
        'Accept': 'application/json',
        'x-freepik-api-key': apiKey,
      },
    });

    if (!freepikRes.ok) {
      // Error sementara — biarkan status tetap.
      return task;
    }

    const freepikData = await freepikRes.json();
    const remoteTask = freepikData.data;

    let newStatus: string = task.status;
    let resultUrl: string | null = task.resultUrl;

    const rs = remoteTask?.status;
    if (rs === 'COMPLETED' || rs === 'completed' || rs === 'success') {
      newStatus = 'success';
      resultUrl = (Array.isArray(remoteTask.generated) && remoteTask.generated.length > 0)
        ? remoteTask.generated[0]
        : remoteTask.video?.url || remoteTask.result?.video?.url || remoteTask.url || null;
    } else if (rs === 'FAILED' || rs === 'failed' || rs === 'error') {
      newStatus = 'failed';
    } else {
      newStatus = 'processing';
    }

    if (newStatus === task.status) {
      return task;
    }

    // Status berubah — update DB.
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
    console.warn(`[Poll ${task.id}] error:`, e);
    return task;
  }
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
