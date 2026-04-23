import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch activities joined with users
    const activities = await db.select({
      id: tasks.id,
      status: tasks.status,
      prompt: tasks.prompt,
      resultUrl: tasks.resultUrl,
      createdAt: tasks.createdAt,
      accessCode: users.accessCode,
      userIdentifier: sql<string>`COALESCE(${users.email}, ${users.phone}, 'Unknown User')`,
    })
    .from(tasks)
    .innerJoin(users, eq(tasks.userId, users.id))
    .orderBy(desc(tasks.createdAt))
    .limit(100);

    return NextResponse.json(activities);

  } catch (error: any) {
    console.error('Admin Activity Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
