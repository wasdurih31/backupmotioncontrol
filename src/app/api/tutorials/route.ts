import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { tutorials, users } from '@/db/schema';
import { desc, eq, or, inArray } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's account type to filter tutorials by visibility
    const [user] = await db.select({ accountType: users.accountType })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1);

    const accountType = user?.accountType || 'byok';

    // Filter: show tutorials where visibility = 'all' OR visibility matches user's accountType
    const allTutorials = await db.select()
      .from(tutorials)
      .where(
        or(
          eq(tutorials.visibility, 'all'),
          eq(tutorials.visibility, accountType),
        )
      )
      .orderBy(desc(tutorials.createdAt));

    return NextResponse.json({ data: allTutorials });
  } catch (error) {
    console.error('Tutorials GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
