import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { userAiSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';

// Model name mapping ke Gemini API model ID.
const MODEL_MAP: Record<string, string> = {
  'gemini-3.1-flash-lite': 'gemini-2.0-flash-lite',
  'gemini-3.1-flash-lite-preview': 'gemini-2.0-flash-lite',
  'gemini-3-flash-preview': 'gemini-2.0-flash',
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
};

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ambil AI settings user.
    const settings = await db.select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, session.id))
      .limit(1);

    if (!settings.length || !settings[0].apiKeyEncrypted) {
      return NextResponse.json({
        error: 'API key Google AI Studio belum dikonfigurasi. Buka Profile Settings → AI Provider.',
      }, { status: 400 });
    }

    const apiKey = decrypt(settings[0].apiKeyEncrypted);
    const modelId = MODEL_MAP[settings[0].selectedModel || ''] || 'gemini-2.0-flash-lite';

    const { systemPrompt, userPrompt } = await req.json();

    if (!userPrompt) {
      return NextResponse.json({ error: 'User prompt diperlukan.' }, { status: 400 });
    }

    // Call Google AI Studio (Gemini) API.
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        ...(systemPrompt ? [{
          role: 'user',
          parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemPrompt}\n[END SYSTEM INSTRUCTION]` }],
        }, {
          role: 'model',
          parts: [{ text: 'Understood. I will follow these instructions precisely.' }],
        }] : []),
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8192,
      },
    };

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      const errMsg = geminiData?.error?.message || JSON.stringify(geminiData);
      console.error('Gemini API Error:', errMsg);
      return NextResponse.json({ error: `Gemini API Error: ${errMsg}` }, { status: geminiRes.status });
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ success: true, result: text });
  } catch (error: any) {
    console.error('Promptgen Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
