import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET;
if (!JWT_SECRET_STRING && process.env.NODE_ENV === 'production') {
  console.warn('CRITICAL: JWT_SECRET is not defined in production environment!');
}

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING || 'universeai-super-secret-key-2026');

export interface SessionPayload {
  id: string;
  role: string;
  accessCode: string;
  username?: string;
}

/**
 * Extracts and verifies the session from cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;

    const { payload } = await jwtVerify(session, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Checks if the current session belongs to an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === 'admin';
}

/**
 * Returns the JWT secret for use in other files
 */
export function getJwtSecret() {
  return JWT_SECRET;
}
