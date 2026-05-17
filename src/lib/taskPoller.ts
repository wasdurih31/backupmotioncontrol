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
    return pollGeminigenTask(task);
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

  const endpoint = task.engine === 'veo'
    ? `https://api.geminigen.ai/uapi/v1/video-gen/veo/${task.id}`
    : `https://api.geminigen.ai/uapi/v1/video-gen/grok/${task.id}`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${decryptedKey}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return task;
    }

    const data = await res.json();
    // Parse response: look for status and video URL
    const remoteStatus = data?.data?.status || data?.status;
    let newStatus: string = task.status;
    let resultUrl: string | null = task.resultUrl;

    if (remoteStatus === 'completed' || remoteStatus === 'success' || remoteStatus === 'COMPLETED') {
      newStatus = 'success';
      resultUrl = data?.data?.video_url || data?.data?.url || data?.video_url || data?.url
        || data?.data?.result?.url || null;
    } else if (remoteStatus === 'failed' || remoteStatus === 'error' || remoteStatus === 'FAILED') {
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
    console.warn(`[Poll ${task.id}] geminigen error:`, e);
    return task;
  }
}
