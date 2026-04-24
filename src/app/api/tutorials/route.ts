import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { tutorials } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allTutorials = await db.select()
      .from(tutorials)
      .orderBy(desc(tutorials.createdAt));

    return NextResponse.json({ data: allTutorials });
  } catch (error) {
    console.error('Tutorials GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
