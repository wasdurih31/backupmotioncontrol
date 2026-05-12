import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { userAiSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';
import { callWithFailover } from '@/lib/keySelector';

// Provider configs
const PROVIDERS = {
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    models: {
      'gemma-4-26b': 'google/gemma-4-26b-a4b-it:free',
    },
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    models: {
      'llama-4-scout': 'meta-llama/llama-4-scout-17b-16e-instruct',
      'llama-4-maverick': 'meta-llama/llama-4-maverick-17b-128e-instruct',
    },
  },
  google: {
    models: {
      'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite-preview': 'gemini-3.1-flash-lite-preview',
      'gemini-3-flash-preview': 'gemini-3-flash-preview',
      'gemini-2.5-flash': 'gemini-2.5-flash',
    },
  },
};

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 8192,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.error?.message || JSON.stringify(data);
    throw new Error(errMsg);
  }

  return data?.choices?.[0]?.message?.content || '';
}

async function callGemini(
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
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
      { role: 'user', parts: [{ text: userPrompt }] },
    ],
    generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.error?.message || JSON.stringify(data);
    throw new Error(errMsg);
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { systemPrompt, userPrompt, provider, model } = await req.json();

    if (!userPrompt) {
      return NextResponse.json({ error: 'User prompt diperlukan.' }, { status: 400 });
    }

    const selectedProvider = provider || 'openrouter';
    const selectedModel = model || 'gemma-4-26b';

    let result: string;

    if (selectedProvider === 'google') {
      // BYOK — user's own key
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
      const modelId = (PROVIDERS.google.models as any)[selectedModel] || 'gemini-3.1-flash-lite';

      result = await callGemini(apiKey, modelId, systemPrompt || '', userPrompt);
    } else if (selectedProvider === 'openrouter') {
      const modelId = (PROVIDERS.openrouter.models as any)[selectedModel] || 'google/gemma-4-26b-a4b-it:free';
      const endpoint = PROVIDERS.openrouter.endpoint;

      result = await callWithFailover('openrouter', (apiKey) =>
        callOpenAICompatible(endpoint, apiKey, modelId, systemPrompt || '', userPrompt),
      );
    } else if (selectedProvider === 'groq') {
      const modelId = (PROVIDERS.groq.models as any)[selectedModel] || 'meta-llama/llama-4-scout-17b-16e-instruct';
      const endpoint = PROVIDERS.groq.endpoint;

      result = await callWithFailover('groq', (apiKey) =>
        callOpenAICompatible(endpoint, apiKey, modelId, systemPrompt || '', userPrompt),
      );
    } else {
      return NextResponse.json({ error: 'Provider tidak valid.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Promptgen Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
