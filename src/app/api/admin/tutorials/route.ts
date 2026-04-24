import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { db } from '@/db';
import { tutorials } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allTutorials = await db.select()
      .from(tutorials)
      .orderBy(desc(tutorials.createdAt));

    return NextResponse.json({ data: allTutorials });
  } catch (error) {
    console.error('Admin Tutorials GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, content, mediaUrl, mediaType, link } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const id = `TUT-${Math.floor(10000 + Math.random() * 90000)}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    await db.insert(tutorials).values({
      id,
      title,
      slug,
      content: content || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      link: link || null,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Admin Tutorials POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, title, content, mediaUrl, mediaType, link } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const updateData: any = { updatedAt: new Date() };
    if (title !== undefined) {
      updateData.title = title;
      updateData.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    if (content !== undefined) updateData.content = content;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (mediaType !== undefined) updateData.mediaType = mediaType;
    if (link !== undefined) updateData.link = link;

    await db.update(tutorials).set(updateData).where(eq(tutorials.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Tutorials PUT Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.delete(tutorials).where(eq(tutorials.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Tutorials DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
