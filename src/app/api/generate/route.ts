import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { del } from '@vercel/blob';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    return payload as { id: string; role: string; accessCode: string };
  } catch (error) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { 
      videoUrl, imageUrl, prompt, character_orientation, cfg_scale, model, engine,
      resolution, duration, negative_prompt, style
    } = await req.json();

    if (!imageUrl || (engine === 'kling' && !videoUrl)) {
      return NextResponse.json({ error: 'Image (and Video for Kling) URLs are required' }, { status: 400 });
    }

    // Get user's API Key
    const userResult = await db.select({
      id: users.id,
      apiKey: users.apiKey,
      totalGenerate: users.totalGenerate,
    }).from(users).where(eq(users.id, session.id)).limit(1);

    if (!userResult.length || !userResult[0].apiKey) {
      return NextResponse.json({ error: 'API Key not found. Please configure it in Profile Settings.' }, { status: 400 });
    }

    const user = userResult[0];

    // Determine Freepik endpoint and payload
    let endpoint = '';
    let payload: any = {};

    if (engine === 'pixverse') {
      endpoint = 'https://api.freepik.com/v1/ai/image-to-video/pixverse-v5';
      payload = {
        image_url: imageUrl,
        prompt: prompt,
        resolution: resolution || "720p",
        duration: duration || 5,
        negative_prompt: negative_prompt || "",
        art_style: style || undefined,
      };
    } else {
      // Kling (default)
      endpoint = model === 'pro' 
        ? 'https://api.freepik.com/v1/ai/video/kling-v2-6-motion-control-pro'
        : 'https://api.freepik.com/v1/ai/video/kling-v2-6-motion-control-std';
      
      payload = {
        video_url: videoUrl,
        image_url: imageUrl,
        prompt: prompt || "",
        character_orientation: character_orientation || "video",
        cfg_scale: typeof cfg_scale === 'number' ? cfg_scale : 0.5,
      };
    }

    // Call Freepik API
    const freepikRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-freepik-api-key': user.apiKey as string,
      },
      body: JSON.stringify(payload),
    });

    const freepikData = await freepikRes.json();

    // HTTP error (non‑2xx)
    if (!freepikRes.ok) {
      console.error('Freepik API Error Full:', JSON.stringify(freepikData, null, 2));
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({ error: `${freepikData.message || 'Failed to generate video'}: ${JSON.stringify(freepikData)}` }, { status: freepikRes.status });
    }

    const taskId = freepikData?.data?.task_id || freepikData?.task_id;
    if (!taskId) {
      console.error('Freepik API unrecognized success response:', freepikData);
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({ error: 'Invalid response from Freepik API' }, { status: 500 });
    }

    // Insert task to DB — store source blob URLs so we can clean them up later
    await db.insert(tasks).values({
      id: taskId,
      userId: user.id,
      prompt: prompt || null,
      videoUrl: videoUrl || null,   
      imageUrl: imageUrl,   
      characterOrientation: character_orientation || null,
      engine: engine || 'kling',
      model: model || 'motion_control_std',
      status: 'processing',
    });

    // Increment totalGenerate
    await db.update(users)
      .set({ totalGenerate: (user.totalGenerate || 0) + 1 })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true, taskId });
  }
  catch (error) {
    console.error('Generate Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** Safely delete blobs — never throw even if deletion fails */
async function cleanupBlobs(urls: (string | null | undefined)[]) {
  for (const url of urls) {
    if (url && url.includes('blob.vercel-storage.com')) {
      try {
        await del(url);
        console.log(`[Cleanup] Deleted blob: ${url.slice(0, 60)}...`);
      } catch (e) {
        console.warn(`[Cleanup] Failed to delete blob: ${url}`, e);
      }
    }
  }
}
