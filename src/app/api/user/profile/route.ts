import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    return payload as { id: string; role: string; accessCode: string };
  } catch (error) {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin session — no DB user row, return admin profile directly
    if (session.role === 'admin') {
      return NextResponse.json({
        id: 'admin',
        email: 'admin',
        phone: null,
        role: 'admin',
        totalGenerate: 0,
        hasApiKey: true,
      });
    }

    const userResult = await db.select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      accessCode: users.accessCode,
      role: users.role,
      totalGenerate: users.totalGenerate,
      hasApiKey: users.apiKey, // just checking if it exists
    }).from(users).where(eq(users.id, session.id)).limit(1);

    if (!userResult.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const user = userResult[0];
    return NextResponse.json({
      ...user,
      hasApiKey: !!user.hasApiKey, // boolean
    });
  } catch (error) {
    console.error('Profile GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { apiKey } = await req.json();

    await db.update(users)
      .set({ apiKey: apiKey || null })
      .where(eq(users.id, session.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile PUT Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
