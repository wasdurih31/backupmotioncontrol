import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { users, balanceTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const LYNK_MERCHANT_KEY = process.env.LYNK_MERCHANT_KEY || '';

/**
 * Verifikasi signature webhook Lynk.id
 * Formula: SHA256(amount + refId + message_id + merchantKey)
 */
function validateSignature(
  refId: string,
  amount: string,
  messageId: string,
  receivedSignature: string,
): boolean {
  if (!LYNK_MERCHANT_KEY) {
    console.warn('[Webhook Lynk] LYNK_MERCHANT_KEY not configured — skipping signature check');
    return true; // Allow in dev/testing
  }
  const signatureString = amount + refId + messageId + LYNK_MERCHANT_KEY;
  const calculated = crypto.createHash('sha256').update(signatureString).digest('hex');
  return calculated === receivedSignature;
}

/**
 * Parse nominal dari title produk Lynk.id
 * Contoh: "10.000 Top Up" → 10000, "25.000 Top Up" → 25000
 */
function parseAmountFromTitle(title: string): number {
  // Cari angka dengan titik pemisah ribuan: "10.000", "25.000", "50.000"
  const match = title.match(/([\d.]+)/);
  if (!match) return 0;
  // Hapus titik pemisah ribuan → parse integer
  const cleaned = match[1].replace(/\./g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * POST /api/webhook/lynk
 * Webhook dari Lynk.id saat payment berhasil.
 * Otomatis top-up saldo PAYG berdasarkan User ID dari form questions.
 */
export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-lynk-signature') || '';
    const body = await req.json();

    console.log('═══════════════════════════════════════════════════════');
    console.log('[Webhook Lynk] 📩 Payment webhook received');
    console.log('[Webhook Lynk] Event:', body?.event);
    console.log('[Webhook Lynk] Body:', JSON.stringify(body).slice(0, 1000));
    console.log('═══════════════════════════════════════════════════════');

    // ── Validasi event ──
    const event = body?.event;
    const data = body?.data;

    if (event !== 'payment.received' || data?.message_action !== 'SUCCESS') {
      console.log('[Webhook Lynk] Skipped — not a successful payment event');
      return NextResponse.json({ received: true, skipped: true });
    }

    const messageData = data?.message_data;
    if (!messageData) {
      console.warn('[Webhook Lynk] No message_data in payload');
      return NextResponse.json({ received: true, warning: 'no message_data' });
    }

    // ── Extract fields ──
    const refId = messageData.refId || '';
    const messageId = data.message_id || '';
    const grandTotal = messageData.totals?.grandTotal ?? 0;
    const customerEmail = messageData.customer?.email || '';
    const items = messageData.items || [];
    const firstItem = items[0] || {};
    const productTitle = firstItem.title || '';

    // Parse User ID dari questions field
    let userId = '';
    try {
      if (firstItem.questions) {
        const questions = typeof firstItem.questions === 'string'
          ? JSON.parse(firstItem.questions)
          : firstItem.questions;
        // Coba beberapa kemungkinan key
        userId = questions['USER ID'] || questions['User ID'] || questions['user_id'] || questions['userId'] || '';
      }
    } catch (e) {
      console.warn('[Webhook Lynk] Failed to parse questions:', firstItem.questions);
    }

    console.log('[Webhook Lynk] Parsed:');
    console.log(`  refId: ${refId}`);
    console.log(`  messageId: ${messageId}`);
    console.log(`  grandTotal: ${grandTotal}`);
    console.log(`  email: ${customerEmail}`);
    console.log(`  productTitle: ${productTitle}`);
    console.log(`  userId: ${userId}`);

    // ── Verifikasi signature ──
    const amountStr = String(grandTotal);
    if (!validateSignature(refId, amountStr, messageId, signature)) {
      console.error('[Webhook Lynk] ❌ Signature verification FAILED');
      return NextResponse.json({ received: true, error: 'invalid signature' }, { status: 200 });
    }
    console.log('[Webhook Lynk] ✅ Signature verified');

    // ── Idempotency check — cek apakah messageId sudah pernah diproses ──
    const [existingTx] = await db.select({ id: balanceTransactions.id })
      .from(balanceTransactions)
      .where(eq(balanceTransactions.description, `Lynk topup: ${messageId}`))
      .limit(1);

    if (existingTx) {
      console.log(`[Webhook Lynk] ⚠️ Duplicate — messageId ${messageId} already processed`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // ── Cari user by ID ──
    if (!userId) {
      console.error('[Webhook Lynk] ❌ No User ID in payment form');
      return NextResponse.json({ received: true, error: 'no user id' }, { status: 200 });
    }

    const [user] = await db.select({ id: users.id, balance: users.balance, accountType: users.accountType })
      .from(users)
      .where(eq(users.id, userId.trim()))
      .limit(1);

    if (!user) {
      console.error(`[Webhook Lynk] ❌ User not found: "${userId}"`);
      return NextResponse.json({ received: true, error: 'user not found' }, { status: 200 });
    }

    // ── Tentukan nominal top-up ──
    // Prioritas: grandTotal (production) → parse dari title (testing)
    let topupAmount = grandTotal;
    if (topupAmount <= 0) {
      topupAmount = parseAmountFromTitle(productTitle);
      console.log(`[Webhook Lynk] grandTotal=0, parsed from title "${productTitle}" → ${topupAmount}`);
    }

    if (topupAmount <= 0) {
      console.error('[Webhook Lynk] ❌ Cannot determine topup amount');
      return NextResponse.json({ received: true, error: 'zero amount' }, { status: 200 });
    }

    // ── Tambah saldo ──
    const [updated] = await db.update(users)
      .set({ balance: sql`${users.balance} + ${topupAmount}` })
      .where(eq(users.id, user.id))
      .returning({ balance: users.balance });

    if (!updated) {
      console.error(`[Webhook Lynk] ❌ Failed to update balance for user ${user.id}`);
      return NextResponse.json({ received: true, error: 'update failed' }, { status: 200 });
    }

    // ── Catat transaksi ──
    await db.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      type: 'topup',
      amount: topupAmount,
      balanceBefore: updated.balance - topupAmount,
      balanceAfter: updated.balance,
      description: `Lynk topup: ${messageId}`,
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log(`[Webhook Lynk] ✅ TOP-UP SUCCESS`);
    console.log(`[Webhook Lynk] 👤 User: ${user.id} (${customerEmail})`);
    console.log(`[Webhook Lynk] 💰 Amount: Rp ${topupAmount.toLocaleString('id-ID')}`);
    console.log(`[Webhook Lynk] 📊 New balance: Rp ${updated.balance.toLocaleString('id-ID')}`);
    console.log('═══════════════════════════════════════════════════════');

    return NextResponse.json({ received: true, status: 'ok', topup: topupAmount });
  } catch (error) {
    console.error('[Webhook Lynk] Error:', error);
    return NextResponse.json({ received: true, error: 'internal' }, { status: 200 });
  }
}

// GET for health check
export async function GET() {
  return NextResponse.json({ status: 'lynk webhook active' });
}
