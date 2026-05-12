import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { db } from '@/db';
import { adminAiKeys } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';
import crypto from 'crypto';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await db.select().from(adminAiKeys).orderBy(desc(adminAiKeys.createdAt));

    // Mask API keys for display
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

    if (!['openrouter', 'groq'].includes(provider)) {
      return NextResponse.json({ error: 'Provider harus openrouter atau groq.' }, { status: 400 });
    }

    const encrypted = encrypt(apiKey.trim());

    await db.insert(adminAiKeys).values({
      id: crypto.randomUUID(),
      provider,
      apiKeyEncrypted: encrypted,
      label: label || `${provider} key`,
      isActive: true,
      usageCount: 0,
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
    const { id, isActive } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.update(adminAiKeys).set({ isActive }).where(eq(adminAiKeys.id, id));
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

    await db.delete(adminAiKeys).where(eq(adminAiKeys.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
