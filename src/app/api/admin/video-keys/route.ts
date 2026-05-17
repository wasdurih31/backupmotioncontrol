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
    const { id, isActive, status } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const updateData: Record<string, any> = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (status) updateData.status = status;

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
