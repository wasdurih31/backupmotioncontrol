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

    // Extract UUID dan status dari payload
    // Format kemungkinan: { uuid, status, video_url, ... } atau { data: { uuid, ... } }
    const uuid = body?.uuid || body?.data?.uuid || body?.task_id || body?.data?.task_id || body?.id?.toString();
    const status = body?.status ?? body?.data?.status;
    const videoUrl = body?.video_url || body?.data?.video_url
      || body?.output_url || body?.data?.output_url
      || body?.url || body?.data?.url
      || body?.media_url || body?.data?.media_url
      || body?.result?.url || body?.data?.result?.url
      || null;

    if (!uuid) {
      console.warn('[Webhook geminigen] No UUID in payload:', body);
      return NextResponse.json({ received: true, warning: 'no uuid' });
    }

    console.log(`[Webhook geminigen] UUID=${uuid}, status=${status}, videoUrl=${videoUrl?.slice(0, 80)}`);

    // Cari task di DB berdasarkan UUID
    const [task] = await db.select().from(tasks).where(eq(tasks.id, uuid)).limit(1);

    if (!task) {
      console.warn(`[Webhook geminigen] Task ${uuid} not found in DB`);
      return NextResponse.json({ received: true, warning: 'task not found' });
    }

    // Sudah final — skip
    if (task.status === 'success' || task.status === 'failed') {
      return NextResponse.json({ received: true, already_final: true });
    }

    // Determine new status
    // Geminigen numeric: 1=processing, 2=completed, 3+=failed
    const isCompleted = status === 2 || status === 'completed' || status === 'success';
    const isFailed = status === 3 || status === 4 || status === 'failed' || status === 'error';

    if (isCompleted && videoUrl) {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 menit
      await db.update(tasks).set({
        status: 'success' as any,
        resultUrl: videoUrl,
        prompt: null,
        expiresAt,
        videoUrl: null,
        imageUrl: null,
      }).where(eq(tasks.id, uuid));

      console.log(`[Webhook geminigen] Task ${uuid} → SUCCESS, video: ${videoUrl.slice(0, 60)}`);
    } else if (isFailed) {
      await db.update(tasks).set({
        status: 'failed' as any,
        videoUrl: null,
        imageUrl: null,
      }).where(eq(tasks.id, uuid));

      console.log(`[Webhook geminigen] Task ${uuid} → FAILED`);
    } else if (isCompleted && !videoUrl) {
      // Completed tapi tidak ada video URL — coba extract dari body lain
      console.warn(`[Webhook geminigen] Task ${uuid} completed but no video URL found in:`, JSON.stringify(body).slice(0, 300));
      // Tetap mark success, mungkin URL ada di field lain
      await db.update(tasks).set({
        status: 'success' as any,
        resultUrl: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }).where(eq(tasks.id, uuid));
    }

    return NextResponse.json({ received: true, status: 'ok' });
  } catch (error) {
    console.error('[Webhook geminigen] Error:', error);
    return NextResponse.json({ received: true, error: 'internal' }, { status: 200 });
    // Return 200 even on error — prevent geminigen from retrying
  }
}

// Also handle GET for webhook verification (some services ping GET first)
export async function GET() {
  return NextResponse.json({ status: 'webhook active' });
}
