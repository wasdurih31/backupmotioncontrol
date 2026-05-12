import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { userAiSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';
import crypto from 'crypto';

const SUPPORTED_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
];

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await db.select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, session.id))
      .limit(1);

    if (!result.length) {
      return NextResponse.json({
        hasKey: false,
        maskedKey: null,
        selectedModel: null,
        provider: 'google',
      });
    }

    const settings = result[0];
    let maskedKey: string | null = null;
    if (settings.apiKeyEncrypted) {
      try {
        const decrypted = decrypt(settings.apiKeyEncrypted);
        maskedKey = maskApiKey(decrypted);
      } catch {
        maskedKey = '****';
      }
    }

    return NextResponse.json({
      hasKey: !!settings.apiKeyEncrypted,
      maskedKey,
      selectedModel: settings.selectedModel,
      provider: settings.provider,
    });
  } catch (error) {
    console.error('AI Settings GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { apiKey, selectedModel } = await req.json();

    if (!selectedModel || !SUPPORTED_MODELS.includes(selectedModel)) {
      return NextResponse.json({ error: 'Model tidak valid. Pilih model yang tersedia.' }, { status: 400 });
    }

    if (!apiKey || apiKey.trim().length < 10) {
      return NextResponse.json({ error: 'API key tidak valid.' }, { status: 400 });
    }

    const encryptedKey = encrypt(apiKey.trim());

    // Upsert: cek apakah sudah ada row untuk user ini.
    const existing = await db.select({ id: userAiSettings.id })
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, session.id))
      .limit(1);

    if (existing.length) {
      await db.update(userAiSettings).set({
        apiKeyEncrypted: encryptedKey,
        selectedModel,
        updatedAt: new Date(),
      }).where(eq(userAiSettings.userId, session.id));
    } else {
      await db.insert(userAiSettings).values({
        id: crypto.randomUUID(),
        userId: session.id,
        provider: 'google',
        apiKeyEncrypted: encryptedKey,
        selectedModel,
      });
    }

    return NextResponse.json({ success: true, maskedKey: maskApiKey(apiKey.trim()) });
  } catch (error) {
    console.error('AI Settings PUT Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
