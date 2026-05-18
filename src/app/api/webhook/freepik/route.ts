import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, users, balanceTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const RESULT_TTL_MS = 30 * 60 * 1000; // 30 menit

/**
 * POST /api/webhook/freepik
 * Universal webhook — dipanggil oleh Freepik saat video generation selesai/gagal.
 * Tidak perlu signature verification karena setiap user BYOK punya akun sendiri.
 * Payload mirip response GET status task.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('═══════════════════════════════════════════════════════');
    console.log('[Webhook Freepik] 📩 Received webhook');
    console.log('[Webhook Freepik] Payload:', JSON.stringify(body).slice(0, 800));
    console.log('═══════════════════════════════════════════════════════');

    // Extract task data — Freepik webhook mirrors the GET status response
    const data = body?.data || body;
    const taskId = data?.task_id || body?.task_id || data?.id || body?.id;

    if (!taskId) {
      console.warn('[Webhook Freepik] No task_id in payload');
      return NextResponse.json({ received: true, warning: 'no task_id' });
    }

    // Find task in DB
    const [task] = await db.select().from(tasks).where(eq(tasks.id, String(taskId))).limit(1);

    if (!task) {
      console.warn(`[Webhook Freepik] Task ${taskId} not found in DB`);
      return NextResponse.json({ received: true, warning: 'task not found' });
    }

    // Already final — skip
    if (task.status === 'success' || task.status === 'failed' || task.status === 'expired') {
      console.log(`[Webhook Freepik] Task ${taskId} already ${task.status}, skipping`);
      return NextResponse.json({ received: true, already_final: true });
    }

    // Determine status
    const remoteStatus = data?.status || body?.status;
    const isCompleted = remoteStatus === 'COMPLETED' || remoteStatus === 'completed' || remoteStatus === 'success';
    const isFailed = remoteStatus === 'FAILED' || remoteStatus === 'failed' || remoteStatus === 'error';

    // Extract result video URL
    const resultUrl = (Array.isArray(data?.generated) && data.generated.length > 0)
      ? data.generated[0]
      : data?.video?.url || data?.result?.video?.url || data?.url || null;

    if (isCompleted && resultUrl) {
      const expiresAt = new Date(Date.now() + RESULT_TTL_MS);
      await db.update(tasks).set({
        status: 'success' as any,
        resultUrl,
        prompt: null,
        expiresAt,
        videoUrl: null,
        imageUrl: null,
      }).where(eq(tasks.id, task.id));

      console.log(`[Webhook Freepik] ✅ Task ${task.id} → SUCCESS`);
      console.log(`[Webhook Freepik] 🎬 Video: ${resultUrl.slice(0, 100)}`);
    } else if (isCompleted && !resultUrl) {
      console.warn(`[Webhook Freepik] Task ${task.id} completed but no video URL`);
      await db.update(tasks).set({
        status: 'success' as any,
        resultUrl: null,
        expiresAt: new Date(Date.now() + RESULT_TTL_MS),
      }).where(eq(tasks.id, task.id));
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
            description: `Refund generate gagal (Freepik webhook)`,
            taskId: task.id,
          });
          console.log(`[Webhook Freepik] 💰 Refunded Rp ${task.costRupiah} to user ${task.userId}`);
        }
      }

      console.log(`[Webhook Freepik] ❌ Task ${task.id} → FAILED`);
    } else {
      // Status lain (PROCESSING, IN_QUEUE, dll) — update status di DB
      console.log(`[Webhook Freepik] 🔄 Task ${task.id} — status update: ${remoteStatus}`);
      await db.update(tasks).set({ status: 'processing' as any }).where(eq(tasks.id, task.id));
    }

    return NextResponse.json({ received: true, status: 'ok' });
  } catch (error) {
    console.error('[Webhook Freepik] Error:', error);
    // Return 200 to prevent Freepik from retrying endlessly
    return NextResponse.json({ received: true, error: 'internal' }, { status: 200 });
  }
}

// GET for webhook health check
export async function GET() {
  return NextResponse.json({ status: 'freepik webhook active' });
}
