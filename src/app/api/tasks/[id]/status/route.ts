import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { del } from '@vercel/blob';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

// Result video will be available for 30 minutes
const RESULT_TTL_MS = 30 * 60 * 1000;

async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    return payload as { id: string; role: string; accessCode: string };
  } catch (error) {
    return null;
  }
}

/** Safely delete blobs — never throw */
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

/** Opportunistic cleanup: delete expired tasks' result videos */
async function cleanupExpiredTasks() {
  try {
    const expiredTasks = await db.select({
      id: tasks.id,
      resultUrl: tasks.resultUrl,
    })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'success'),
          lt(tasks.expiresAt, new Date())
        )
      )
      .limit(10);

    for (const task of expiredTasks) {
      // Delete result video blob
      await cleanupBlobs([task.resultUrl]);

      // Clear the result URL and mark expired
      await db.update(tasks).set({
        resultUrl: null,
        status: 'expired' as any,
      }).where(eq(tasks.id, task.id));

      console.log(`[Cleanup] Expired task ${task.id} — result blob deleted`);
    }
  } catch (e) {
    console.warn('[Cleanup] Error cleaning expired tasks:', e);
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Run opportunistic cleanup of expired tasks in background
    cleanupExpiredTasks();

    // Get task from DB
    const taskResult = await db.select().from(tasks).where(
      and(eq(tasks.id, taskId), eq(tasks.userId, session.id))
    ).limit(1);

    if (!taskResult.length) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskResult[0];

    // If already finalized in DB, return it
    if (task.status === 'success' || task.status === 'failed') {
      return NextResponse.json({ data: task });
    }

    // Get user's API Key
    const userResult = await db.select({ apiKey: users.apiKey }).from(users).where(eq(users.id, session.id)).limit(1);
    if (!userResult.length || !userResult[0].apiKey) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 400 });
    }

    const apiKey = userResult[0].apiKey;

    // Determine polling endpoint based on task engine
    const pollingEndpoint = task.engine === 'pixverse'
      ? `https://api.freepik.com/v1/ai/image-to-video/pixverse-v5/${taskId}`
      : task.engine === 'kling_2_1_pro'
      ? `https://api.freepik.com/v1/ai/image-to-video/kling-v2-1/${taskId}`
      : `https://api.freepik.com/v1/ai/image-to-video/kling-v2-6/${taskId}`;

    // Poll Freepik API
    const freepikRes = await fetch(pollingEndpoint, {
      headers: {
        'Accept': 'application/json',
        'x-freepik-api-key': apiKey as string,
      },
    });

    const freepikData = await freepikRes.json();

    // Debug log — helps diagnose response structure issues
    console.log(`[Poll ${taskId}] Freepik HTTP ${freepikRes.status}:`, JSON.stringify(freepikData).slice(0, 500));

    if (!freepikRes.ok) {
      // Don't mark as failed immediately for temporary API errors
      return NextResponse.json({ data: task });
    }

    const remoteTask = freepikData.data;
    let newStatus = task.status;
    let resultUrl = task.resultUrl;

    if (remoteTask.status === 'COMPLETED' || remoteTask.status === 'completed' || remoteTask.status === 'success') {
      newStatus = 'success';
      // Freepik returns generated video URLs in the `generated` array
      resultUrl = (Array.isArray(remoteTask.generated) && remoteTask.generated.length > 0)
        ? remoteTask.generated[0]
        : remoteTask.video?.url || remoteTask.result?.video?.url || remoteTask.url || null;
      console.log(`[Poll ${taskId}] Extracted resultUrl:`, resultUrl);
    } else if (remoteTask.status === 'FAILED' || remoteTask.status === 'failed' || remoteTask.status === 'error') {
      newStatus = 'failed';
    } else {
      // CREATED, IN_PROGRESS, etc.
      newStatus = 'processing';
    }

    // Update DB if status changed
    if (newStatus !== task.status) {
      if (newStatus === 'success') {
        // ── SUCCESS: Clean up source files + set expiry + clear prompt ──
        const expiresAt = new Date(Date.now() + RESULT_TTL_MS);

        await db.update(tasks).set({
          status: 'success' as any,
          resultUrl: resultUrl,
          prompt: null,       // ← Clear prompt from DB
          expiresAt: expiresAt,
        }).where(eq(tasks.id, taskId));

        // Delete source video and image blobs from Vercel Blob
        await cleanupBlobs([task.videoUrl, task.imageUrl]);

        // Clear source URLs from DB
        await db.update(tasks).set({
          videoUrl: null,
          imageUrl: null,
        }).where(eq(tasks.id, taskId));

        console.log(`[Task ${taskId}] SUCCESS — source blobs deleted, prompt cleared, expires at ${expiresAt.toISOString()}`);

        task.status = 'success' as any;
        task.resultUrl = resultUrl;
        task.prompt = null;
        task.expiresAt = expiresAt;
        task.videoUrl = null;
        task.imageUrl = null;

      } else if (newStatus === 'failed') {
        // ── FAILED: Clean up source files — user will re-upload ──
        await cleanupBlobs([task.videoUrl, task.imageUrl]);

        await db.update(tasks).set({
          status: 'failed' as any,
          videoUrl: null,
          imageUrl: null,
        }).where(eq(tasks.id, taskId));

        console.log(`[Task ${taskId}] FAILED — source blobs deleted`);

        task.status = 'failed' as any;
        task.videoUrl = null;
        task.imageUrl = null;

      } else {
        await db.update(tasks).set({
          status: newStatus as any,
        }).where(eq(tasks.id, taskId));
        task.status = newStatus as any;
      }
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Status Polling Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
