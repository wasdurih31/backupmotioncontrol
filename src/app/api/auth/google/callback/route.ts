import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

/**
 * GET /api/auth/google/callback
 * Google redirects here after user consents.
 * Exchange code → tokens → get user info → create/find user → set session cookie.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=google_denied', request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Google token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }

    // 2. Get user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoRes.json();
    if (!googleUser.sub || !googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // 3. Find or create user in DB
    let existingUser = await db.select()
      .from(users)
      .where(and(eq(users.oauthProvider, 'google'), eq(users.oauthSubject, googleUser.sub)))
      .limit(1);

    // Juga cek by email (kalau user sudah ada dari BYOK tapi belum punya oauth)
    if (!existingUser.length) {
      existingUser = await db.select()
        .from(users)
        .where(eq(users.email, googleUser.email))
        .limit(1);
    }

    let userId: string;

    if (existingUser.length) {
      // User sudah ada — update OAuth info & last login
      userId = existingUser[0].id;
      await db.update(users).set({
        oauthProvider: 'google',
        oauthSubject: googleUser.sub,
        lastLoginAt: new Date(),
        // Kalau user existing BYOK login via Google, JANGAN ubah account_type
        // Hanya set oauth fields agar bisa login via Google juga
      }).where(eq(users.id, userId));
    } else {
      // User baru — buat akun PAYG
      userId = `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      await db.insert(users).values({
        id: userId,
        email: googleUser.email,
        role: 'user',
        accountType: 'payg',
        balance: 0,
        oauthProvider: 'google',
        oauthSubject: googleUser.sub,
        isActive: true,
        totalGenerate: 0,
      });
    }

    // 4. Buat JWT session (sama format dengan login BYOK existing)
    const token = await new SignJWT({
      id: userId,
      role: 'user',
      accessCode: existingUser.length ? existingUser[0].accessCode || '' : '',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(JWT_SECRET);

    // 5. Set cookie & redirect ke dashboard
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
