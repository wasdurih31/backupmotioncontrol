import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { cleanupExpiredTasks, pollAndUpdateTask } from '@/lib/taskPoller';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

// Maksimum task id yang boleh dicek dalam 1 request (sesuai batas slot user).
const MAX_IDS_PER_REQUEST = 10;

async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    return payload as { id: string; role: string; accessCode: string };
  } catch (_error) {
    return null;
  }
}

/**
 * Batch endpoint untuk cek banyak task sekaligus.
 * Query: /api/tasks/status?ids=taskA,taskB,taskC
 * Response: { data: [{ id, status, resultUrl, expiresAt }, ...] }
 *
 * Hemat FOT dibanding polling individual per task.
 * Freepik dipanggil sekuensial (lewat pollAndUpdateTask) untuk tiap task yang
 * belum final; task yang sudah final dikembalikan langsung dari DB tanpa
 * memanggil Freepik lagi.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const idsParam = url.searchParams.get('ids') || '';
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ data: [] });
    }
    if (ids.length > MAX_IDS_PER_REQUEST) {
      return NextResponse.json({
        error: `Terlalu banyak id (max ${MAX_IDS_PER_REQUEST}).`,
      }, { status: 400 });
    }

    // Background cleanup.
    cleanupExpiredTasks();

    // Ambil semua task milik user ini yang id-nya cocok.
    const rows = await db.select().from(tasks).where(
      and(eq(tasks.userId, session.id), inArray(tasks.id, ids)),
    );

    if (rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Cek apakah ada task yang belum final — baru ambil apiKey kalau perlu.
    const needsPolling = rows.some(
      (t) => t.status !== 'success' && t.status !== 'failed' && t.status !== 'expired',
    );

    let apiKey: string | null = null;
    if (needsPolling) {
      // For PAYG users with freepik pool tasks, get pool key instead of user key
      const needsFreepikPolling = rows.some(
        (t) => t.status !== 'success' && t.status !== 'failed' && t.status !== 'expired'
          && t.engine !== 'veo' && t.engine !== 'grok',
      );

      if (needsFreepikPolling) {
        const u = await db.select({ apiKey: users.apiKey, accountType: users.accountType }).from(users)
          .where(eq(users.id, session.id)).limit(1);
        if (u.length) {
          if (u[0].accountType === 'payg') {
            // PAYG: get freepik pool key for polling
            const { adminVideoKeys } = await import('@/db/schema');
            const { asc } = await import('drizzle-orm');
            const { decrypt } = await import('@/lib/crypto');
            const [poolKey] = await db.select()
              .from(adminVideoKeys)
              .where(and(
                eq(adminVideoKeys.provider, 'freepik'),
                eq(adminVideoKeys.status, 'active'),
                eq(adminVideoKeys.isActive, true),
              ))
              .orderBy(asc(adminVideoKeys.lastUsedAt))
              .limit(1);
            if (poolKey) {
              try { apiKey = decrypt(poolKey.apiKeyEncrypted); } catch (_e) { /* ignore */ }
            }
          } else if (u[0].apiKey) {
            apiKey = u[0].apiKey;
          }
        }
      }
    }

    // Poll sekuensial. Untuk task yang sudah final, helper mengembalikan
    // objek task langsung tanpa memanggil Freepik.
    const results = [] as Array<{
      id: string;
      status: string;
      resultUrl: string | null;
      expiresAt: Date | null;
    }>;

    for (const task of rows) {
      const updated = apiKey ? await pollAndUpdateTask(task, apiKey) : task;
      results.push({
        id: updated.id,
        status: updated.status,
        resultUrl: updated.resultUrl,
        expiresAt: updated.expiresAt,
      });
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Batch Status Polling Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
