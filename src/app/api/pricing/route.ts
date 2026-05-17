import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';

/**
 * GET /api/pricing — public endpoint (no auth required).
 * Return harga terbaru dari app_settings untuk ditampilkan di landing page.
 */
export async function GET() {
  try {
    const rows = await db.select().from(appSettings);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value || '';
    }

    return NextResponse.json({
      kling_std: parseInt(settings.price_kling_std) || 650,
      kling_pro: parseInt(settings.price_kling_pro) || 1000,
      veo_720: parseInt(settings.price_veo_720) || 600,
      veo_1080: parseInt(settings.price_veo_1080) || 1000,
      grok_720: parseInt(settings.price_grok_720) || 800,
      whatsapp_link: settings.whatsapp_admin_link || '',
      byok_link: settings.byok_signup_link || '',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    // Fallback defaults kalau DB error
    return NextResponse.json({
      kling_std: 650, kling_pro: 1000, veo_720: 600, veo_1080: 1000, grok_720: 800,
      whatsapp_link: '', byok_link: '',
    });
  }
}
