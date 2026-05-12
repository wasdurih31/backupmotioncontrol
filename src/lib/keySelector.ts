import { db } from '@/db';
import { adminAiKeys } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';

export interface SelectedKey {
  id: string;
  apiKey: string; // decrypted
  provider: string;
}

/**
 * Select the least-used active key for a provider.
 * Returns null if no active keys available.
 */
export async function selectKey(provider: string): Promise<SelectedKey | null> {
  const keys = await db.select()
    .from(adminAiKeys)
    .where(and(eq(adminAiKeys.provider, provider), eq(adminAiKeys.isActive, true)))
    .orderBy(asc(adminAiKeys.usageCount))
    .limit(5); // get top 5 least-used

  if (keys.length === 0) return null;

  // Pick the least-used one
  const chosen = keys[0];
  
  try {
    const apiKey = decrypt(chosen.apiKeyEncrypted);
    return { id: chosen.id, apiKey, provider: chosen.provider };
  } catch {
    return null;
  }
}

/**
 * Mark a key as used (increment counter + update timestamp).
 */
export async function markKeyUsed(keyId: string): Promise<void> {
  const existing = await db.select({ usageCount: adminAiKeys.usageCount })
    .from(adminAiKeys).where(eq(adminAiKeys.id, keyId)).limit(1);
  if (existing.length) {
    await db.update(adminAiKeys).set({
      usageCount: (existing[0].usageCount || 0) + 1,
      lastUsedAt: new Date(),
      lastError: null,
    }).where(eq(adminAiKeys.id, keyId));
  }
}

/**
 * Mark a key as errored.
 */
export async function markKeyError(keyId: string, error: string): Promise<void> {
  await db.update(adminAiKeys).set({
    lastError: error,
    lastUsedAt: new Date(),
  }).where(eq(adminAiKeys.id, keyId));
}

/**
 * Try calling a provider with failover across multiple keys.
 * `callFn` receives the decrypted API key and should return the result.
 * If it throws, the next key is tried.
 */
export async function callWithFailover<T>(
  provider: string,
  callFn: (apiKey: string) => Promise<T>,
): Promise<T> {
  const keys = await db.select()
    .from(adminAiKeys)
    .where(and(eq(adminAiKeys.provider, provider), eq(adminAiKeys.isActive, true)))
    .orderBy(asc(adminAiKeys.usageCount))
    .limit(10);

  if (keys.length === 0) {
    throw new Error(`Tidak ada API key aktif untuk provider "${provider}". Admin perlu menambahkan key di panel admin.`);
  }

  let lastError: Error | null = null;

  for (const key of keys) {
    let decryptedKey: string;
    try {
      decryptedKey = decrypt(key.apiKeyEncrypted);
    } catch {
      continue; // skip corrupted keys
    }

    try {
      const result = await callFn(decryptedKey);
      // Success — mark used
      await markKeyUsed(key.id);
      return result;
    } catch (err: any) {
      lastError = err;
      await markKeyError(key.id, err.message?.slice(0, 200) || 'Unknown error');
      // Continue to next key
    }
  }

  throw new Error(lastError?.message || `Semua API key untuk "${provider}" gagal. Coba lagi nanti.`);
}
