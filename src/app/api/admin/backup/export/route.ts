import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allUsers = await db.select().from(users);
    
    // Format to exclude id
    const exportedUsers = allUsers.map(user => {
      const { id, ...userData } = user;
      return userData;
    });

    return new NextResponse(JSON.stringify(exportedUsers, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="users_backup_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json({ error: 'Failed to export users' }, { status: 500 });
  }
}
