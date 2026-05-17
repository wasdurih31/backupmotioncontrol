import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'universeai-uploads';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/^http:\/\//, 'https://');

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload file ke R2. Return public URL.
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | ReadableStream | Blob,
  contentType: string,
): Promise<string> {
  // Convert Blob/ReadableStream to Buffer if needed
  let buffer: Buffer | Uint8Array;
  if (body instanceof Blob) {
    buffer = Buffer.from(await body.arrayBuffer());
  } else if (body instanceof ReadableStream) {
    const chunks: Uint8Array[] = [];
    const reader = body.getReader();
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (value) chunks.push(value);
      done = d;
    }
    buffer = Buffer.concat(chunks);
  } else {
    buffer = body;
  }

  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete file dari R2 (gratis, unlimited operations).
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
  } catch (e) {
    console.warn(`[R2] Failed to delete ${key}:`, e);
  }
}

/**
 * Extract R2 key dari public URL.
 */
export function getR2KeyFromUrl(url: string): string | null {
  if (!url || !R2_PUBLIC_URL) return null;
  if (url.startsWith(R2_PUBLIC_URL)) {
    return url.slice(R2_PUBLIC_URL.length + 1); // +1 for the /
  }
  return null;
}
