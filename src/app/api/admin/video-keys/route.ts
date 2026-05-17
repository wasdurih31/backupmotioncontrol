import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { db } from '@/db';
import { adminVideoKeys } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';
import crypto from 'crypto';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await db.select().from(adminVideoKeys).orderBy(desc(adminVideoKeys.createdAt));

    const masked = keys.map((k) => {
      let maskedKey = '****';
      try {
        maskedKey = maskApiKey(decrypt(k.apiKeyEncrypted));
      } catch { /* ignore */ }
      return {
        id: k.id,
        provider: k.provider,
        label: k.label,
        maskedKey,
        status: k.status,
        isActive: k.isActive,
        usageCount: k.usageCount,
        lastUsedAt: k.lastUsedAt,
        lastError: k.lastError,
        createdAt: k.createdAt,
      };
    });

    return NextResponse.json({ data: masked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { provider, apiKey, label } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'Provider dan API key wajib diisi.' }, { status: 400 });
    }

    if (!['freepik', 'geminigen'].includes(provider)) {
      return NextResponse.json({ error: 'Provider harus freepik atau geminigen.' }, { status: 400 });
    }

    // Check max keys per provider
    const existing = await db.select({ id: adminVideoKeys.id })
      .from(adminVideoKeys)
      .where(eq(adminVideoKeys.provider, provider));

    const maxKeys = provider === 'freepik' ? 100 : 2;
    if (existing.length >= maxKeys) {
      return NextResponse.json({
        error: `Maksimum ${maxKeys} key untuk provider ${provider}.`,
      }, { status: 400 });
    }

    const encrypted = encrypt(apiKey.trim());

    await db.insert(adminVideoKeys).values({
      id: crypto.randomUUID(),
      provider,
      apiKeyEncrypted: encrypted,
      label: label || `${provider} key`,
      status: 'active',
      isActive: true,
      usageCount: 0,
      errorCount: 0,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, isActive, status, label } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const updateData: Record<string, any> = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (status) updateData.status = status;
    if (typeof label === 'string') updateData.label = label;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await db.update(adminVideoKeys).set(updateData).where(eq(adminVideoKeys.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.delete(adminVideoKeys).where(eq(adminVideoKeys.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/video-keys
 * Bulk import API keys — satu key per baris.
 */
export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { provider, keys: rawKeys, labelPrefix } = await req.json();

    if (!provider || !['freepik', 'geminigen'].includes(provider)) {
      return NextResponse.json({ error: 'Provider harus freepik atau geminigen.' }, { status: 400 });
    }

    if (!rawKeys || typeof rawKeys !== 'string' || !rawKeys.trim()) {
      return NextResponse.json({ error: 'Masukkan minimal 1 API key.' }, { status: 400 });
    }

    // Parse keys: satu per baris, trim, skip kosong, skip duplikat
    const keyLines = rawKeys
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    const uniqueKeys = [...new Set(keyLines)];

    if (uniqueKeys.length === 0) {
      return NextResponse.json({ error: 'Tidak ada key valid yang ditemukan.' }, { status: 400 });
    }

    // Check max keys per provider
    const existing = await db.select({ id: adminVideoKeys.id })
      .from(adminVideoKeys)
      .where(eq(adminVideoKeys.provider, provider));

    const maxKeys = provider === 'freepik' ? 100 : 2;
    const available = maxKeys - existing.length;

    if (available <= 0) {
      return NextResponse.json({
        error: `Provider ${provider} sudah penuh (${existing.length}/${maxKeys}).`,
      }, { status: 400 });
    }

    // Trim to available slots
    const keysToInsert = uniqueKeys.slice(0, available);
    const skipped = uniqueKeys.length - keysToInsert.length;

    // Build values for batch insert
    const prefix = labelPrefix?.trim() || (provider === 'freepik' ? 'Freepik Key' : 'Geminigen Key');
    const startNumber = existing.length + 1;

    const values = keysToInsert.map((key, i) => ({
      id: crypto.randomUUID(),
      provider,
      apiKeyEncrypted: encrypt(key),
      label: `${prefix} #${startNumber + i}`,
      status: 'active' as const,
      isActive: true,
      usageCount: 0,
      errorCount: 0,
    }));

    // Batch insert
    await db.insert(adminVideoKeys).values(values);

    return NextResponse.json({
      success: true,
      inserted: keysToInsert.length,
      skipped,
      total: existing.length + keysToInsert.length,
      max: maxKeys,
    });
  } catch (error: any) {
    console.error('[Bulk Import] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
