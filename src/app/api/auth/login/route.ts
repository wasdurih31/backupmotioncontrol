import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or, and } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

export async function POST(req: Request) {
  try {
    const { identifier, accessCode } = await req.json();

    if (!identifier || !accessCode) {
      return NextResponse.json({ error: 'Identifier dan Kode Akses wajib diisi.' }, { status: 400 });
    }

    // Clean up input
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanAccessCode = accessCode.trim().toUpperCase();

    // Query user
    const userResult = await db.select().from(users).where(
      and(
        eq(users.accessCode, cleanAccessCode),
        or(
          eq(users.email, cleanIdentifier),
          eq(users.phone, cleanIdentifier)
        )
      )
    ).limit(1);

    const user = userResult[0];

    if (!user) {
      return NextResponse.json({ error: 'Kode Akses atau Email/No HP tidak valid.' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Akun Anda tidak aktif. Silakan hubungi admin.' }, { status: 403 });
    }

    // Update lastLoginAt
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Create JWT Token
    const token = await new SignJWT({ 
      id: user.id, 
      role: user.role,
      accessCode: user.accessCode 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // 7 days expiration
      .sign(JWT_SECRET);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        apiKey: user.apiKey ? true : false,
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
