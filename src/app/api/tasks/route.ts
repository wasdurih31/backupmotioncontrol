import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    return payload as { id: string; role: string; accessCode: string };
  } catch (_error) {
    return null;
  }
}

/**
 * ETag diturunkan dari snapshot kolom yang mempengaruhi UI
 * (id, status, resultUrl, expiresAt, createdAt) agar:
 *   - Client polling berikutnya cukup mengirim If-None-Match.
 *   - Kalau tidak ada perubahan, server balas 304 (body kosong) → FOT
 *     turun drastis untuk polling list.
 */
function computeEtag(data: unknown[]): string {
  const summary = data.map((d: any) => [
    d.id, d.status, d.resultUrl, d.expiresAt, d.createdAt,
  ]);
  const hash = createHash('sha1').update(JSON.stringify(summary)).digest('hex');
  return `W/"${hash}"`;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userTasks = await db.select().from(tasks)
      .where(eq(tasks.userId, session.id))
      .orderBy(desc(tasks.createdAt));

    const etag = computeEtag(userTasks);

    // Cek If-None-Match header — kalau sama dengan etag sekarang, balas 304.
    const h = await headers();
    const inm = h.get('if-none-match');
    if (inm && inm === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, must-revalidate',
        },
      });
    }

    return NextResponse.json({ data: userTasks }, {
      headers: {
        ETag: etag,
        'Cache-Control': 'private, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Fetch Tasks Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
