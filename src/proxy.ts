import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define protected paths
  const isDashboardPath = pathname.startsWith('/dashboard');
  const isAdminPath = pathname.startsWith('/admin');
  const isAdminApiPath = pathname.startsWith('/api/admin');
  const isAuthPage = pathname === '/login' || pathname === '/ammarbilal/login';

  // If not a protected path or auth page, skip
  if (!isDashboardPath && !isAdminPath && !isAdminApiPath && !isAuthPage) {
    return NextResponse.next();
  }

  const session = request.cookies.get('session')?.value;
  let decodedToken: any = null;

  if (session) {
    try {
      const { payload } = await jwtVerify(session, JWT_SECRET);
      decodedToken = payload;
    } catch (error) {
      console.log('Invalid token in middleware');
    }
  }

  // API Protection
  if (isAdminApiPath) {
    if (!decodedToken || decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Redirect authenticated users away from login pages
  if (isAuthPage && decodedToken) {
    if (decodedToken.role === 'admin' && pathname === '/ammarbilal/login') {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else if (decodedToken.role === 'user' && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect Dashboard
  if (isDashboardPath) {
    if (!decodedToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Admins are allowed to visit the dashboard area as well
    if (decodedToken.role !== 'user' && decodedToken.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Protect Admin Panel
  if (isAdminPath) {
    if (!decodedToken || decodedToken.role !== 'admin') {
      return NextResponse.redirect(new URL('/ammarbilal/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/login',
    '/ammarbilal/login',
  ],
};
