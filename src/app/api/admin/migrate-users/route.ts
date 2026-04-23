import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    // Basic auth check for migration script
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data } = body; // Expecting { data: [{ identifier: '..', accessCode: '..' }] }

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format. Expected an array.' }, { status: 400 });
    }

    const newUsers = data.map((user: any) => ({
      id: `USR-${uuidv4().substring(0, 8).toUpperCase()}`,
      email: user.email || null,
      phone: user.phone || null,
      accessCode: user.accessCode,
      role: 'user',
      totalGenerate: 0,
    }));

    // Bulk insert using Drizzle
    // .onConflictDoNothing() prevents errors if a user already exists (we'll check by id here, or we can just omit it since id is random, wait actually email/phone aren't primary keys. For now, since it's a one-time migration, just insert)
    const result = await db.insert(users).values(newUsers);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully migrated ${newUsers.length} users.`,
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
