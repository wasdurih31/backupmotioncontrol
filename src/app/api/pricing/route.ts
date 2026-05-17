import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { inArray } from 'drizzle-orm';

const PRICING_KEYS = [
  'price_kling_std',
  'price_kling_pro',
  'price_veo_720',
  'price_veo_1080',
  'price_grok_720',
  'whatsapp_admin_link',
  'byok_signup_link',
];

/**
 * GET /api/pricing
 * Returns PAYG model pricing from appSettings.
 * Public endpoint (no auth required) — prices are not sensitive.
 */
export async function GET() {
  try {
    const rows = await db.select({ key: appSettings.key, value: appSettings.value })
      .from(appSettings)
      .where(inArray(appSettings.key, PRICING_KEYS));

    const pricing: Record<string, number> = {};
    for (const row of rows) {
      pricing[row.key] = parseInt(row.value || '0', 10);
    }

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('Pricing API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
