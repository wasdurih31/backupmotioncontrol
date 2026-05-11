import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cleanupExpiredTasks, pollAndUpdateTask } from '@/lib/taskPoller';

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Background cleanup.
    cleanupExpiredTasks();

    const taskResult = await db.select().from(tasks).where(
      and(eq(tasks.id, taskId), eq(tasks.userId, session.id)),
    ).limit(1);

    if (!taskResult.length) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    let task = taskResult[0];

    // Kalau sudah final, langsung return.
    if (task.status === 'success' || task.status === 'failed' || task.status === 'expired') {
      return NextResponse.json({ data: task });
    }

    const userResult = await db.select({ apiKey: users.apiKey }).from(users)
      .where(eq(users.id, session.id)).limit(1);
    if (!userResult.length || !userResult[0].apiKey) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 400 });
    }

    task = await pollAndUpdateTask(task, userResult[0].apiKey as string);
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Status Polling Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
