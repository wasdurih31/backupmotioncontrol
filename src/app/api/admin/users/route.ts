import { NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, desc, and, or, ne } from 'drizzle-orm';

export async function GET() {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      accessCode: users.accessCode,
      role: users.role,
      totalGenerate: users.totalGenerate,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      isActive: users.isActive,
      subscriptionStart: users.subscriptionStart,
      subscriptionEnd: users.subscriptionEnd,
      apiKey: users.apiKey,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Admin Users GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { identifier, accessCode, subscriptionStart, subscriptionEnd } = await req.json();

    if (!identifier || !accessCode) {
      return NextResponse.json({ error: 'Identifier and Access Code are required' }, { status: 400 });
    }

    const isEmail = identifier.includes('@');
    const processedEmail = isEmail ? identifier.toLowerCase() : null;
    const processedPhone = !isEmail ? identifier : null;
    const processedAccessCode = accessCode.toUpperCase();

    // Check for uniqueness
    const conditions = [];
    if (processedEmail) conditions.push(eq(users.email, processedEmail));
    if (processedPhone) conditions.push(eq(users.phone, processedPhone));
    if (processedAccessCode) conditions.push(eq(users.accessCode, processedAccessCode));

    if (conditions.length > 0) {
      const existingUser = await db.select().from(users).where(or(...conditions)).limit(1);
      
      if (existingUser.length > 0) {
        return NextResponse.json({ error: 'Email, No HP, atau Kode Akses sudah digunakan oleh user lain.' }, { status: 409 });
      }
    }

    const id = `USR-${Math.floor(100000 + Math.random() * 900000)}`;

    await db.insert(users).values({
      id,
      email: processedEmail,
      phone: processedPhone,
      accessCode: processedAccessCode,
      role: 'user',
      isActive: true,
      subscriptionStart: subscriptionStart ? new Date(subscriptionStart) : null,
      subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : null,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Admin Users POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, isActive, subscriptionEnd, subscriptionStart, identifier, accessCode } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (subscriptionEnd !== undefined) updateData.subscriptionEnd = subscriptionEnd ? new Date(subscriptionEnd) : null;
    if (subscriptionStart !== undefined) updateData.subscriptionStart = subscriptionStart ? new Date(subscriptionStart) : null;
    
    let processedEmail = null;
    let processedPhone = null;
    let processedAccessCode = null;

    if (identifier !== undefined && identifier.trim() !== '') {
      const isEmail = identifier.includes('@');
      processedEmail = isEmail ? identifier.toLowerCase() : null;
      processedPhone = !isEmail ? identifier : null;
      updateData.email = processedEmail;
      updateData.phone = processedPhone;
    }

    if (accessCode !== undefined && accessCode.trim() !== '') {
      processedAccessCode = accessCode.toUpperCase();
      updateData.accessCode = processedAccessCode;
    }

    // Uniqueness check for patch
    if (processedEmail || processedPhone || processedAccessCode) {
       const conditions = [];
       if (processedEmail) conditions.push(eq(users.email, processedEmail));
       if (processedPhone) conditions.push(eq(users.phone, processedPhone));
       if (processedAccessCode) conditions.push(eq(users.accessCode, processedAccessCode));
       
       if (conditions.length > 0) {
         const existingUser = await db.select().from(users).where(
           and(
             or(...conditions),
             ne(users.id, id)
           )
         ).limit(1);

         if (existingUser.length > 0) {
           return NextResponse.json({ error: 'Email, No HP, atau Kode Akses sudah digunakan oleh user lain.' }, { status: 409 });
         }
       }
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Users PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Users DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
