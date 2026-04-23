import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { count, sum, sql } from 'drizzle-orm';

export async function GET() {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Total Users
    const userCountResult = await db.select({ value: count() }).from(users);
    const totalUsers = userCountResult[0].value;

    // 2. Total Generations
    const genCountResult = await db.select({ value: sum(users.totalGenerate) }).from(users);
    const totalGenerations = Number(genCountResult[0].value || 0);

    // 3. Active Today (last 24h)
    const activeTodayResult = await db.select({ value: count() })
      .from(users)
      .where(sql`last_login_at >= now() - interval '24 hours'`);
    const activeToday = activeTodayResult[0].value;

    // 4. Success Rate
    const taskStats = await db.select({
      status: tasks.status,
      count: count(),
    }).from(tasks).groupBy(tasks.status);

    let totalTasks = 0;
    let successTasks = 0;
    taskStats.forEach(s => {
      totalTasks += s.count;
      if (s.status === 'success') successTasks += s.count;
    });
    const successRate = totalTasks > 0 ? ((successTasks / totalTasks) * 100).toFixed(1) : "100";

    return NextResponse.json({
      totalUsers,
      totalGenerations,
      activeToday,
      successRate: `${successRate}%`,
    });
  } catch (error) {
    console.error('Admin Stats GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
