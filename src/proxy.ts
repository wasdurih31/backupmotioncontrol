import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define protected paths
  const isDashboardPath = pathname.startsWith('/dashboard');
  const isAdminPath = pathname.startsWith('/admin');
  const isAuthPage = pathname === '/login' || pathname === '/ammarbilal/login';

  // If not a protected path or auth page, skip
  if (!isDashboardPath && !isAdminPath && !isAuthPage) {
    return NextResponse.next();
  }

  const session = request.cookies.get('session')?.value;
  let decodedToken = null;

  if (session) {
    try {
      const { payload } = await jwtVerify(session, JWT_SECRET);
      decodedToken = payload as any;
    } catch (error) {
      console.log('Invalid token in middleware');
    }
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
    // Strictly block admin from dashboard or vice versa? 
    // Usually admin has access to admin panel. Let's say user only for dashboard
    if (decodedToken.role !== 'user') {
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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
