/**
 * Prompt Normalization Layer
 * ---------------------------------
 * Membersihkan output AI yang kadang muncul dengan format screenplay/metadata
 * berlebihan (GLOBAL STYLE:, CHARACTER LOCK:, Hook:, CTA:, dll). Label-label
 * tersebut trigger AI image model (GPT Image 2, dll) untuk generate text
 * overlay / infographic layout yang tidak diinginkan.
 *
 * Output akhir: format natural storyboard direction.
 */

const LABELS_TO_STRIP = [
  // Uppercase block labels
  'GLOBAL STYLE:',
  'CHARACTER LOCK:',
  'PRODUCT LOCK:',
  'CONTINUATION CONTEXT:',
  'CONTINUATION:',
  'REFERENCE LOCK:',
  'SCENE LIST:',
  'NEGATIVE PROMPT:',
  // Scene metadata labels
  'Goal:',
  'Hook:',
  'Problem:',
  'Reaction:',
  'Solution:',
  'Result:',
  'CTA:',
  'Camera Angle:',
  'Character Action:',
  'Product Interaction:',
  'Environment:',
  'Dialogue:',
  'Motion:',
  'Duration:',
];

/**
 * Normalize satu block prompt (image/storyboard) agar jadi natural storyboard.
 */
export function normalizePrompt(raw: string): string {
  let text = raw;

  // 1. Hapus scene suffixes yang screenplay-style
  //    "Scene 1 - Hook" → "Scene 1:"
  //    "Scene 2 — Problem" → "Scene 2:"
  text = text.replace(/^(Scene\s+\d+)\s*[-–—]\s*(Hook|Problem|Reaction|Solution|Result|CTA|Goal)[^\n:]*:?/gim, '$1:');

  // 2. Hapus label di awal baris (misal "Goal: describe..." → "describe...")
  for (const label of LABELS_TO_STRIP) {
    const re = new RegExp(`^\\s*${escapeRegex(label)}\\s*`, 'gim');
    text = text.replace(re, '');
  }

  // 3. Hapus blok heading markdown yang tidak perlu (misal "### GLOBAL STYLE")
  text = text.replace(/^#{1,6}\s*(GLOBAL STYLE|CHARACTER LOCK|PRODUCT LOCK|REFERENCE LOCK|CONTINUATION CONTEXT|SCENE LIST)\s*:?\s*$/gim, '');

  // 4. Rapihkan multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Universal negative prompt yang ditambahkan di bawah.
 */
export const UNIVERSAL_NEGATIVE_PROMPT =
  'text overlay, subtitles, typography, infographic layout, poster design, watermark, distorted face, extra fingers, blurry product, CGI skin, plastic skin, over cinematic lighting';
