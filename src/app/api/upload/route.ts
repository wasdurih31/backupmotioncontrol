import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

async function checkSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return false;

  try {
    await jwtVerify(session, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const isAuth = await checkSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check Content-Type to distinguish between client upload protocol and direct upload
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    // ── Client Upload Protocol (handleUpload) — works on Vercel only ──
    try {
      const body = (await request.json()) as HandleUploadBody;
      
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          return {
            allowedContentTypes: [
              'video/mp4', 'video/webm', 'video/quicktime',
              'image/jpeg', 'image/png', 'image/webp'
            ],
          };
        },
        onUploadCompleted: async ({ blob }) => {
          console.log('[Blob] Upload completed:', blob.url?.slice(0, 60));
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (error) {
      console.error('Upload handleUpload Error:', error);
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }
      );
    }
  } else {
    // ── Direct Server Upload (fallback for localhost / simple upload) ──
    try {
      const filename = request.headers.get('x-vercel-blob-filename') || `upload-${Date.now()}`;
      const blob = await put(filename, request.body!, {
        access: 'private',
      });

      return NextResponse.json(blob);
    } catch (error) {
      console.error('Upload put() Error:', error);
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 }
      );
    }
  }
}
