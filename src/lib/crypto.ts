import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Gunakan JWT_SECRET sebagai basis encryption key (32 bytes untuk AES-256).
const SECRET = process.env.JWT_SECRET || 'universeai-super-secret-key-2026';
const KEY = Buffer.from(SECRET.padEnd(32, '0').slice(0, 32), 'utf-8');
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt plaintext. Return format: "iv:encrypted" (hex).
 */
export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt "iv:encrypted" format back to plaintext.
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !encrypted) throw new Error('Invalid encrypted format');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

/**
 * Mask API key untuk display: "AIzaSy****X92"
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 6)}****${key.slice(-3)}`;
}
