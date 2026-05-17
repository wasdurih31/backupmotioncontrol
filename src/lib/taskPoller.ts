import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';

// Result video berlaku 30 menit setelah selesai.
export const RESULT_TTL_MS = 30 * 60 * 1000;

/** Safely delete blobs — never throw. */
async function cleanupBlobs(_urls: (string | null | undefined)[]) {
  // DISABLED: Vercel Blob "Advanced Operations" limit reached.
  // Blobs accumulate in storage. Manual cleanup via dashboard monthly.
  return;
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
 * Poll status 1 task ke Freepik dan sinkronkan ke DB.
 * Mengembalikan task terbaru (sudah ter-update jika ada perubahan).
 */
export async function pollAndUpdateTask(task: DbTask, apiKey: string): Promise<DbTask> {
  // Sudah final — tidak perlu hit Freepik.
  if (task.status === 'success' || task.status === 'failed' || task.status === 'expired') {
    return task;
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
