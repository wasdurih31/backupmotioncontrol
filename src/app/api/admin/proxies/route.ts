import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { proxyAccounts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

async function isAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return false;
  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    return (payload as any).role === 'admin';
  } catch { return false; }
}

/** GET — List all proxies */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await db.select().from(proxyAccounts).orderBy(desc(proxyAccounts.createdAt));
  return NextResponse.json({ data: rows });
}

/** POST — Add single proxy */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { proxyUrl, label } = await req.json();
  if (!proxyUrl) return NextResponse.json({ error: 'Proxy URL is required' }, { status: 400 });

  const id = crypto.randomUUID();
  await db.insert(proxyAccounts).values({ id, proxyUrl, label: label || null });
  return NextResponse.json({ success: true, id });
}

/** PATCH — Bulk import proxies (one URL per line) */
export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { proxies } = await req.json();
  if (!proxies || typeof proxies !== 'string') {
    return NextResponse.json({ error: 'proxies string required' }, { status: 400 });
  }

  const lines = proxies.split('\n').map((l: string) => l.trim()).filter(Boolean);
  if (lines.length === 0) return NextResponse.json({ error: 'No proxies provided' }, { status: 400 });

  // Get existing proxy URLs for deduplication
  const existing = await db.select({ proxyUrl: proxyAccounts.proxyUrl }).from(proxyAccounts);
  const existingSet = new Set(existing.map(e => e.proxyUrl));

  const toInsert = lines
    .filter((url: string) => !existingSet.has(url))
    .map((url: string) => ({
      id: crypto.randomUUID(),
      proxyUrl: url,
      label: null as string | null,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ message: 'All proxies already exist', added: 0 });
  }

  await db.insert(proxyAccounts).values(toInsert);
  return NextResponse.json({ success: true, added: toInsert.length, skipped: lines.length - toInsert.length });
}

/** PUT — Update single proxy (label, isActive) */
export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, label, isActive } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof label === 'string') updates.label = label;
  if (typeof isActive === 'boolean') updates.isActive = isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  await db.update(proxyAccounts).set(updates).where(eq(proxyAccounts.id, id));
  return NextResponse.json({ success: true });
}

/** DELETE — Remove single proxy */
export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await db.delete(proxyAccounts).where(eq(proxyAccounts.id, id));
  return NextResponse.json({ success: true });
}
