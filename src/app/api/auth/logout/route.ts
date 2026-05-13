import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

export async function POST() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;

  // Sebelum hapus session, mark semua task aktif user sebagai failed.
  if (session) {
    try {
      const { payload } = await jwtVerify(session, JWT_SECRET);
      const userId = (payload as any).id;
      if (userId && userId !== 'admin') {
        await db.update(tasks)
          .set({ status: 'failed' as any, videoUrl: null, imageUrl: null })
          .where(
            and(
              eq(tasks.userId, userId),
              inArray(tasks.status, ['queued', 'processing']),
            ),
          );
        console.log(`[Logout] Cancelled all active tasks for user ${userId}`);
      }
    } catch (_e) {
      // Token invalid/expired — skip cleanup, just logout
    }
  }

  cookieStore.delete('session');
  return NextResponse.json({ success: true });
}
