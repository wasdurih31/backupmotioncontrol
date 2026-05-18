import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { freepikFetch } from '@/lib/proxyFetch';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

async function getAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    if (payload.role !== 'admin') return null;
    return payload as { id: string; role: string };
  } catch (_error) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    const payload = {
      webhook_url: "https://www.example.com/webhook",
      image: "https://d.tmpfile.link/public/2026-05-18/6214cb10-8337-436d-80cd-5f41d2cd04fc/buat_wanita_pada_Photorealistic_portrait%2C_character_design_focus%2C_202604300625.jpeg_menjaadi_202605100950.jpeg",
      prompt: "wanita menari playfull",
      negative_prompt: "<string>",
      cfg_scale: 0.5,
      duration: "5"
    };

    const res = await freepikFetch('https://api.magnific.com/v1/ai/image-to-video/kling-v2-5-pro', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-magnific-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      const text = await res.text();
      return NextResponse.json({ error: 'Failed to parse JSON', details: text, status: res.status }, { status: 500 });
    }

    if (!res.ok) {
      return NextResponse.json({ 
        error: data.message || 'Validation failed', 
        details: data, 
        status: res.status 
      }, { status: 400 });
    }

    return NextResponse.json({ data, status: res.status });
  } catch (error: any) {
    console.error('Validate Key Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
