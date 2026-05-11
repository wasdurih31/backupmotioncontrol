import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, tutorials } from '@/db/schema';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Export SEMUA data user termasuk id, apiKey, subscription dates, dll.
    const allUsers = await db.select().from(users);

    // Export SEMUA tutorial.
    const allTutorials = await db.select().from(tutorials);

    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      users: allUsers,
      tutorials: allTutorials,
    };

    const filename = `backup_full_${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json({ error: 'Failed to export database' }, { status: 500 });
  }
}
