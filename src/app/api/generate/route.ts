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

    const { videoUrl, imageUrl, prompt, character_orientation, cfg_scale } = await req.json();

    if (!videoUrl || !imageUrl) {
      return NextResponse.json({ error: 'Video and Image URLs are required' }, { status: 400 });
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

// Since blobs are uploaded with public access, we can use the URLs directly.
// No signed URL generation is needed.


    // Call Freepik API using signed URLs
    const freepikRes = await fetch('https://api.freepik.com/v1/ai/video/kling-v2-6-motion-control-std', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-freepik-api-key': user.apiKey as string,
      },
      body: JSON.stringify({
        reference_video_url: videoUrl,
        character_image_url: imageUrl,
        prompt: prompt || "",
        character_orientation: character_orientation || "video",
        cfg_scale: typeof cfg_scale === 'number' ? cfg_scale : 0.5,
      }),
    });

    const freepikData = await freepikRes.json();

    // HTTP error (non‑2xx)
    if (!freepikRes.ok) {
      console.error('Freepik API Error:', freepikData);
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({ error: freepikData.message || 'Failed to generate video' }, { status: freepikRes.status });
    }

    // API‑level failure (success flag false)
    if (!freepikData.success) {
      console.error('Freepik API reported failure:', freepikData);
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({ error: freepikData.message || 'Freepik generation failed' }, { status: freepikData.status || 500 });
    }


    const taskId = freepikData?.data?.task_id;
    if (!taskId) {
      await cleanupBlobs([videoUrl, imageUrl]);
      return NextResponse.json({ error: 'Invalid response from Freepik API' }, { status: 500 });
    }

    // Insert task to DB — store source blob URLs so we can clean them up later
    await db.insert(tasks).values({
      id: taskId,
      userId: user.id,
      prompt: prompt || null,
      videoUrl: videoUrl,   // source blob — will be deleted after success
      imageUrl: imageUrl,   // source blob — will be deleted after success
      characterOrientation: character_orientation || 'video',
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
