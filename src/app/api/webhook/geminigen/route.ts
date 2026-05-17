import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, users, balanceTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

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
    const event = body?.event || body?.event_name;
    const data = body?.data;

    if (!data) {
      console.warn('[Webhook geminigen] No data in payload');
      return NextResponse.json({ received: true, warning: 'no data' });
    }

    // Extract fields
    const rawId = data?.id || data?.uuid || body?.uuid || body?.id;
    const taskUuid = rawId != null ? String(rawId) : null;
    const status = data?.status || body?.status;
    const videoUrl = data?.url || data?.video_url || data?.output_url || data?.media_url || null;

    if (!taskUuid) {
      console.warn('[Webhook geminigen] No task ID in payload:', body);
      return NextResponse.json({ received: true, warning: 'no id' });
    }

    console.log(`[Webhook geminigen] event=${event}, id=${taskUuid}, status=${status}, url=${videoUrl?.slice(0, 80)}`);

    // Cari task di DB — coba match by id langsung (uuid), atau by freepikTaskId (numeric id)
    let [task] = await db.select().from(tasks).where(eq(tasks.id, taskUuid)).limit(1);

    // Kalau tidak ketemu by primary key, coba lookup by freepikTaskId (numeric id dari geminigen)
    if (!task && typeof taskUuid === 'string') {
      [task] = await db.select().from(tasks).where(eq(tasks.freepikTaskId, taskUuid)).limit(1);
      if (task) {
        console.log(`[Webhook geminigen] Found task via freepikTaskId lookup: ${task.id}`);
      }
    }

    if (!task) {
      console.warn(`[Webhook geminigen] Task ${taskUuid} not found in DB (tried id + freepikTaskId)`);
      return NextResponse.json({ received: true, warning: 'task not found' });
    }

    // Sudah final — skip
    if (task.status === 'success' || task.status === 'failed') {
      return NextResponse.json({ received: true, already_final: true });
    }

    // Determine outcome
    const isCompleted = status === 'completed' || status === 'success' || status === 2;
    const isFailed = status === 'failed' || status === 'error' || status === 3 || status === 4;

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

      // ── Refund saldo untuk PAYG task yang gagal ──
      if (task.costRupiah && task.costRupiah > 0) {
        const [refunded] = await db.update(users)
          .set({ balance: sql`${users.balance} + ${task.costRupiah}` })
          .where(eq(users.id, task.userId))
          .returning({ balance: users.balance });

        if (refunded) {
          await db.insert(balanceTransactions).values({
            id: crypto.randomUUID(),
            userId: task.userId,
            type: 'refund',
            amount: task.costRupiah,
            balanceBefore: refunded.balance - task.costRupiah,
            balanceAfter: refunded.balance,
            description: `Refund generate gagal (webhook)`,
            taskId: task.id,
          });
          console.log(`[Webhook geminigen] Refunded Rp ${task.costRupiah} to user ${task.userId}`);
        }
      }

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
