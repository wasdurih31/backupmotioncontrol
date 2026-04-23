import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Admin check
    if (!await isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get stats
    const successCount = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, 'success')));

    const failedCount = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, 'failed')));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        accessCode: user.accessCode,
        apiKey: user.apiKey,
        isActive: user.isActive,
        subscriptionEnd: user.subscriptionEnd,
        totalGenerate: user.totalGenerate,
      },
      stats: {
        success: Number(successCount[0]?.count || 0),
        failed: Number(failedCount[0]?.count || 0),
      }
    });

  } catch (error: any) {
    console.error('User Stats Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
