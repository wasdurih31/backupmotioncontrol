import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { uploadToR2 } from '@/lib/r2';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'universeai-super-secret-key-2026');

// Max file size: 6 MB
const MAX_FILE_SIZE = 6 * 1024 * 1024;

const ALLOWED_TYPES = [
  'video/mp4', 'video/webm', 'video/quicktime',
  'image/jpeg', 'image/png', 'image/webp',
];

async function checkSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return false;

  try {
    await jwtVerify(session, JWT_SECRET);
    return true;
  } catch (_error) {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const isAuth = await checkSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    // ── Client Upload Protocol (JSON request for token) ──
    // Untuk backward compat dengan @vercel/blob/client upload() di frontend.
    // Frontend masih pakai upload() yang kirim JSON dulu untuk minta token.
    // Kita intercept dan langsung handle sebagai direct upload.
    if (contentType.includes('application/json')) {
      // Frontend @vercel/blob/client mengirim JSON body untuk token request.
      // Karena kita migrasi ke R2, kita return "upload langsung" instruction.
      // Tapi sebenarnya frontend perlu diubah juga.
      // Untuk sekarang, return error yang jelas:
      return NextResponse.json({
        error: 'Upload protocol changed. Please use direct upload.',
        type: 'PROTOCOL_CHANGED',
      }, { status: 400 });
    }

    // ── Direct Upload ke R2 ──
    const filename = request.headers.get('x-filename')
      || request.headers.get('x-vercel-blob-filename')
      || `upload-${Date.now()}`;

    const fileContentType = request.headers.get('x-content-type')
      || request.headers.get('content-type')
      || 'application/octet-stream';

    // Validate content type
    if (!ALLOWED_TYPES.includes(fileContentType) && !fileContentType.startsWith('video/') && !fileContentType.startsWith('image/')) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Read body
    const body = await request.arrayBuffer();

    // Validate size
    if (body.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File terlalu besar. Maksimum ${MAX_FILE_SIZE / 1024 / 1024} MB.` }, { status: 400 });
    }

    // Generate unique key
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const ts = now.getTime();
    const rand = Math.random().toString(36).slice(2, 10);
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const folder = fileContentType.startsWith('video/') ? 'videos' : 'images';
    const key = `${folder}/${datePart}/${ts}_${rand}-${safeName}`;

    // Upload ke R2
    const url = await uploadToR2(key, Buffer.from(body), fileContentType);

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Upload failed' },
      { status: 500 },
    );
  }
}
