import { NextResponse } from 'next/server';

/**
 * POST /api/webhook/lynk
 * Debug endpoint — log semua payload dari Lynk.id untuk analisis format.
 * Setelah format diketahui, akan diimplementasi logic top-up/subscription.
 */
export async function POST(req: Request) {
  try {
    // Log semua headers
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = await req.json().catch(() => null);
    const rawText = body ? JSON.stringify(body) : '(empty or non-JSON)';

    console.log('═══════════════════════════════════════════════════════');
    console.log('[Webhook Lynk] 📩 RECEIVED WEBHOOK');
    console.log('═══════════════════════════════════════════════════════');
    console.log('[Webhook Lynk] Headers:', JSON.stringify(headers, null, 2));
    console.log('[Webhook Lynk] Body:', rawText.slice(0, 2000));
    console.log('[Webhook Lynk] Signature:', headers['x-lynk-signature'] || 'NOT PRESENT');
    console.log('═══════════════════════════════════════════════════════');

    // Extract known fields from docs
    if (body) {
      console.log('[Webhook Lynk] Parsed fields:');
      console.log('  refId:', body.refId ?? body.ref_id ?? body.reference_id ?? 'N/A');
      console.log('  amount:', body.amount ?? body.grandTotal ?? body.grand_total ?? body.total ?? 'N/A');
      console.log('  message_id:', body.message_id ?? body.messageId ?? body.trx_id ?? 'N/A');
      console.log('  email:', body.email ?? body.buyer_email ?? body.customer_email ?? 'N/A');
      console.log('  name:', body.name ?? body.buyer_name ?? body.customer_name ?? 'N/A');
      console.log('  status:', body.status ?? body.payment_status ?? 'N/A');
      console.log('  All keys:', Object.keys(body).join(', '));
    }

    return NextResponse.json({ received: true, status: 'ok' });
  } catch (error) {
    console.error('[Webhook Lynk] Error:', error);
    return NextResponse.json({ received: true, error: 'internal' }, { status: 200 });
  }
}

// GET for health check / verification
export async function GET() {
  return NextResponse.json({ status: 'lynk webhook active' });
}
