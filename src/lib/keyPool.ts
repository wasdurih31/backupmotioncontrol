import { db } from '@/db';
import { adminVideoKeys, keyEndpointLimits } from '@/db/schema';
import { and, eq, asc, gt, sql } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';

/**
 * Get an active pool key for a specific provider + endpoint.
 * Excludes keys that are globally disabled/errored AND keys that are
 * specifically limited on the requested endpoint (per-endpoint daily limit).
 *
 * Returns null if no key available.
 */
export async function getPoolKey(provider: 'freepik' | 'geminigen', endpoint: string) {
  const now = new Date();

  // 1. Get all active keys for this provider
  const activeKeys = await db.select()
    .from(adminVideoKeys)
    .where(
      and(
        eq(adminVideoKeys.provider, provider),
        eq(adminVideoKeys.status, 'active'),
        eq(adminVideoKeys.isActive, true),
      ),
    )
    .orderBy(asc(adminVideoKeys.lastUsedAt));

  if (activeKeys.length === 0) return null;

  // 2. Get endpoint limits that are still active (not expired)
  const activeLimits = await db.select({ keyId: keyEndpointLimits.keyId })
    .from(keyEndpointLimits)
    .where(
      and(
        eq(keyEndpointLimits.endpoint, endpoint),
        gt(keyEndpointLimits.expiresAt, now),
      ),
    );

  const limitedKeyIds = new Set(activeLimits.map(l => l.keyId));

  // 3. Find first key that is NOT limited on this endpoint
  const availableKey = activeKeys.find(k => !limitedKeyIds.has(k.id));

  if (!availableKey) return null;

  // 4. Decrypt and return
  let decryptedKey: string;
  try {
    decryptedKey = decrypt(availableKey.apiKeyEncrypted);
  } catch {
    return null;
  }

  return {
    id: availableKey.id,
    decryptedKey,
    raw: availableKey,
  };
}

/**
 * Mark a key as limited on a specific endpoint.
 * Does NOT change the global key status — key remains 'active' for other endpoints.
 * Limit expires after 24 hours.
 */
export async function markKeyEndpointLimit(keyId: string, endpoint: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

  // Upsert: kalau sudah ada record untuk key+endpoint ini, update expiresAt
  const existing = await db.select({ id: keyEndpointLimits.id })
    .from(keyEndpointLimits)
    .where(
      and(
        eq(keyEndpointLimits.keyId, keyId),
        eq(keyEndpointLimits.endpoint, endpoint),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db.update(keyEndpointLimits)
      .set({ limitedAt: now, expiresAt })
      .where(eq(keyEndpointLimits.id, existing[0].id));
  } else {
    await db.insert(keyEndpointLimits).values({
      id: crypto.randomUUID(),
      keyId,
      endpoint,
      limitedAt: now,
      expiresAt,
    });
  }

  // Log
  console.log(`[KeyPool] Key ${keyId.slice(0, 8)}... marked LIMITED on endpoint "${endpoint}" until ${expiresAt.toISOString()}`);
}

/**
 * Mark key used (increment usage, update lastUsedAt).
 */
export async function markKeyUsed(keyId: string) {
  await db.update(adminVideoKeys).set({
    usageCount: sql`${adminVideoKeys.usageCount} + 1`,
    lastUsedAt: new Date(),
  }).where(eq(adminVideoKeys.id, keyId));
}

/**
 * Mark key with a hard error (non-limit). This marks the key globally unusable.
 * Use for auth errors (401), payment errors (402), etc.
 */
export async function markKeyGlobalError(keyId: string, errorMsg: string) {
  await db.update(adminVideoKeys).set({
    status: 'error',
    lastError: errorMsg.slice(0, 500),
    errorCount: sql`${adminVideoKeys.errorCount} + 1`,
  }).where(eq(adminVideoKeys.id, keyId));
}

/**
 * Cleanup expired endpoint limits (housekeeping).
 * Call periodically to keep the table small.
 */
export async function cleanupExpiredLimits() {
  const now = new Date();
  await db.delete(keyEndpointLimits)
    .where(sql`${keyEndpointLimits.expiresAt} < ${now}`);
}

/**
 * Extract a short endpoint identifier from a full URL.
 * e.g. "https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std" → "kling-v3-motion-control-std"
 */
export function extractEndpointId(url: string): string {
  try {
    const path = new URL(url).pathname;
    // Take last meaningful segment(s)
    const parts = path.split('/').filter(Boolean);
    // Skip common prefixes: v1, ai, video, image-to-video
    const meaningful = parts.filter(p => !['v1', 'ai', 'video', 'image-to-video'].includes(p));
    return meaningful.join('/') || parts[parts.length - 1] || url;
  } catch {
    return url;
  }
}
