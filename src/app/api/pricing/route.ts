import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { inArray } from 'drizzle-orm';

const PRICING_KEYS = [
  'price_kling_std',
  'price_kling_pro',
  'price_kling_v3_std',
  'price_kling_v3_pro',
  'price_kling_v3_i2v_std',
  'price_kling_v3_i2v_pro',
  'price_veo_720',
  'price_veo_1080',
  'price_grok_720',
  'price_wan_2_5',
];

const STRING_KEYS = [
  'whatsapp_admin_link',
  'byok_signup_link',
  'topup_amount_1',
  'topup_amount_2',
  'topup_amount_3',
  'topup_link_1',
  'topup_link_2',
  'topup_link_3',
  'topup_support_text',
  'topup_support_link',
  'topup_support_icon',
  'topup_tutorial_text',
  'topup_tutorial_link',
  'topup_tutorial_icon',
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
      .where(inArray(appSettings.key, [...PRICING_KEYS, ...STRING_KEYS]));

    const pricing: Record<string, number> = {};
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (PRICING_KEYS.includes(row.key)) {
        pricing[row.key] = parseInt(row.value || '0', 10);
      } else {
        settings[row.key] = row.value || '';
      }
    }

    return NextResponse.json({ pricing, settings });
  } catch (error) {
    console.error('Pricing API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
