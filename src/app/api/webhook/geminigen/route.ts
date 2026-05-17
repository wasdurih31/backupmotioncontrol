import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/webhook/geminigen
 * Webhook endpoint yang dipanggil oleh geminigen.ai saat video selesai/gagal.
 * Tidak perlu auth — geminigen yang memanggil.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Webhook geminigen] Received:', JSON.stringify(body).slice(0, 500));

    // Format dari geminigen:
    // { "event": "image.generated", "timestamp": "...", "data": { "id": "uuid", "status": "completed", "url": "https://...", "user_id": "..." } }
    const event = body?.event;
    const data = body?.data;

    if (!data) {
      console.warn('[Webhook geminigen] No data in payload');
      return NextResponse.json({ received: true, warning: 'no data' });
    }

    // Extract fields
    const taskUuid = data?.id || data?.uuid || body?.uuid || body?.id;
    const status = data?.status || body?.status;
    const videoUrl = data?.url || data?.video_url || data?.output_url || data?.media_url || null;

    if (!taskUuid) {
      console.warn('[Webhook geminigen] No task ID in payload:', body);
      return NextResponse.json({ received: true, warning: 'no id' });
    }

    console.log(`[Webhook geminigen] event=${event}, id=${taskUuid}, status=${status}, url=${videoUrl?.slice(0, 80)}`);

    // Cari task di DB — coba match by id langsung, atau by uuid string
    let [task] = await db.select().from(tasks).where(eq(tasks.id, taskUuid)).limit(1);

    // Kalau tidak ketemu, mungkin id format berbeda — coba tanpa prefix
    if (!task && typeof taskUuid === 'string') {
      // Geminigen mungkin kirim numeric id, tapi kita simpan uuid
      console.warn(`[Webhook geminigen] Task ${taskUuid} not found, trying alternate lookup`);
      return NextResponse.json({ received: true, warning: 'task not found' });
    }

    if (!task) {
      return NextResponse.json({ received: true, warning: 'task not found' });
    }

    // Sudah final — skip
    if (task.status === 'success' || task.status === 'failed') {
      return NextResponse.json({ received: true, already_final: true });
    }

    // Determine outcome
    const isCompleted = status === 'completed' || status === 'success';
    const isFailed = status === 'failed' || status === 'error';

    if (isCompleted && videoUrl) {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await db.update(tasks).set({
        status: 'success' as any,
        resultUrl: videoUrl,
        prompt: null,
        expiresAt,
        videoUrl: null,
        imageUrl: null,
      }).where(eq(tasks.id, task.id));

      console.log(`[Webhook geminigen] Task ${task.id} → SUCCESS, video: ${videoUrl.slice(0, 80)}`);
    } else if (isFailed) {
      await db.update(tasks).set({
        status: 'failed' as any,
        videoUrl: null,
        imageUrl: null,
      }).where(eq(tasks.id, task.id));

      console.log(`[Webhook geminigen] Task ${task.id} → FAILED`);
    } else if (isCompleted && !videoUrl) {
      console.warn(`[Webhook geminigen] Task ${task.id} completed but no video URL in payload`);
      await db.update(tasks).set({
        status: 'success' as any,
        resultUrl: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }).where(eq(tasks.id, task.id));
    } else {
      console.log(`[Webhook geminigen] Task ${task.id} — unhandled status: ${status}`);
    }

    return NextResponse.json({ received: true, status: 'ok' });
  } catch (error) {
    console.error('[Webhook geminigen] Error:', error);
    // Return 200 even on error — prevent geminigen from retrying endlessly
    return NextResponse.json({ received: true, error: 'internal' }, { status: 200 });
  }
}

// Also handle GET for webhook verification (some services ping GET first)
export async function GET() {
  return NextResponse.json({ status: 'webhook active' });
}
