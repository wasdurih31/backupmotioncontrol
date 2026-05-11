import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { desc, eq, sql, or, ilike, and, type SQL } from 'drizzle-orm';
import { isAdmin } from '@/lib/auth';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function GET(request: Request) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSizeRaw));
    const q = (searchParams.get('q') || '').trim();

    // Bangun filter pencarian. Cocokkan terhadap email, phone, atau
    // access code (case-insensitive, substring).
    const filters: SQL[] = [];
    if (q) {
      const pattern = `%${q}%`;
      const searchFilter = or(
        ilike(users.email, pattern),
        ilike(users.phone, pattern),
        ilike(users.accessCode, pattern),
      );
      if (searchFilter) filters.push(searchFilter);
    }
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Hitung total untuk pagination.
    const totalRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(tasks)
      .innerJoin(users, eq(tasks.userId, users.id))
      .where(whereClause);
    const total = totalRows[0]?.c ?? 0;

    // Ambil data halaman yang diminta.
    const offset = (page - 1) * pageSize;
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
      .where(whereClause)
      .orderBy(desc(tasks.createdAt))
      .limit(pageSize)
      .offset(offset);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      data: activities,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Admin Activity Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
