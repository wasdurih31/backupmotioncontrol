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
  // NOTE: "NEGATIVE PROMPT:" / "Negative prompt:" SENGAJA tidak di-strip
  // karena kita ingin label ini tetap muncul di akhir prompt gambar.
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

// Regex untuk deteksi kalimat awal yang HANYA mendeskripsikan (bukan perintah)
const DESCRIPTIVE_OPENERS = [
  /^(Video ini|This video|The video)\b/i,
  /^(Foto ini|Gambar ini|This photo|The photo|This image|The image)\b/i,
];

// Regex untuk deteksi kalimat awal yang SUDAH berupa perintah (acceptable)
const COMMAND_OPENERS = [
  /^(Buatlah|Buat sebuah|Buat|Ciptakan|Hasilkan)\b/i,
  /^(Create|Generate|Produce|Make|Design|Render)\b/i,
];

/**
 * Normalize satu block prompt (image/storyboard) agar jadi natural storyboard.
 */
export function normalizePrompt(raw: string): string {
  let text = raw;

  // 1. Hapus scene suffixes yang screenplay-style
  text = text.replace(/^(Scene\s+\d+)\s*[-–—]\s*(Hook|Problem|Reaction|Solution|Result|CTA|Goal)[^\n:]*:?/gim, '$1:');

  // 2. Hapus label di awal baris
  for (const label of LABELS_TO_STRIP) {
    const re = new RegExp(`^\\s*${escapeRegex(label)}\\s*`, 'gim');
    text = text.replace(re, '');
  }

  // 3. Hapus blok heading markdown yang tidak perlu
  text = text.replace(/^#{1,6}\s*(GLOBAL STYLE|CHARACTER LOCK|PRODUCT LOCK|REFERENCE LOCK|CONTINUATION CONTEXT|SCENE LIST)\s*:?\s*$/gim, '');

  // 4. Inject command sentence untuk Storyboard Prompt section kalau AI-nya
  //    mulai dengan "Video ini..." (descriptive, bukan command).
  text = injectStoryboardCommand(text);

  // 5. Inject command sentence untuk Image Prompt Variant kalau perlu.
  text = injectImageVariantCommand(text);

  // 6. Pastikan setiap image prompt section diakhiri dengan label
  //    "Negative prompt: ..." yang jelas (bukan langsung isi negative-nya
  //    saja tanpa label).
  text = ensureNegativePromptLabel(text);

  // 7. Rapihkan multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

/**
 * Cari section-section image prompt (Storyboard Prompt / Image Prompt Variant)
 * dan pastikan diakhiri dengan label "Negative prompt: ..." yang jelas.
 *
 * Handle 3 kasus:
 *   A. Sudah ada label "Negative prompt:" → biarkan
 *   B. Ada daftar negative tapi tanpa label → prepend "Negative prompt: "
 *   C. Tidak ada sama sekali → append universal negative di akhir section
 */
function ensureNegativePromptLabel(text: string): string {
  // Split berdasarkan heading markdown section (###)
  const sections = text.split(/(?=^#{1,3}\s)/gm);

  const IMAGE_HEADINGS = /^#{1,3}\s*(Storyboard Prompt|IMAGE PROMPT VARIANT\s*\d+)/i;
  const NEG_KEYWORDS = /(text overlay|subtitles|typography|infographic|poster|watermark|distorted face|extra fingers|blurry product|CGI skin|plastic skin|over cinematic|no subtitles|no text overlay|no infographic|no poster)/i;
  const NEG_LABEL = /^\s*Negative\s*prompt\s*:/im;

  const processed = sections.map((section) => {
    if (!IMAGE_HEADINGS.test(section)) return section;

    // Hilangkan trailing whitespace agar mudah diproses
    let s = section.replace(/\s+$/, '');

    if (NEG_LABEL.test(s)) {
      // Kasus A: sudah ada label → biarkan
      return s + '\n';
    }

    // Cek apakah ada baris yang mengandung daftar negative tapi tanpa label.
    const lines = s.split('\n');
    let lastNegLineIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (NEG_KEYWORDS.test(lines[i]) && !/Scene\s+\d+:/i.test(lines[i])) {
        lastNegLineIdx = i;
        break;
      }
    }

    if (lastNegLineIdx !== -1) {
      // Kasus B: ada daftar negative tanpa label → prepend label
      lines[lastNegLineIdx] = `Negative prompt: ${lines[lastNegLineIdx].trim()}`;
      s = lines.join('\n');
    } else {
      // Kasus C: tidak ada → append universal negative
      s = s + `\n\nNegative prompt: ${UNIVERSAL_NEGATIVE_PROMPT}`;
    }

    return s + '\n';
  });

  return processed.join('');
}

/**
 * Kalau section Storyboard Prompt dimulai dengan "Video ini..." / "This video..."
 * (descriptive), ganti dengan kalimat perintah "Buatlah gambar storyboard..."
 */
function injectStoryboardCommand(text: string): string {
  return text.replace(
    /(###?\s*Storyboard Prompt\s*\n)([^\n]+)/gi,
    (_match, heading: string, firstLine: string) => {
      const trimmed = firstLine.trim();
      // Kalau sudah command, biarkan
      if (COMMAND_OPENERS.some((re) => re.test(trimmed))) {
        return heading + firstLine;
      }
      // Kalau descriptive, ganti
      if (DESCRIPTIVE_OPENERS.some((re) => re.test(trimmed))) {
        // Hitung jumlah scene dari teks berikutnya (best-effort)
        const sceneMatches = text.match(/^Scene\s+\d+:/gim) || [];
        const sceneCount = sceneMatches.length;
        const layout = sceneCount <= 3 ? '1x3' : sceneCount === 4 ? '2x2' : '2x3';
        const commandLine = `Buatlah gambar storyboard UGC ${sceneCount || 'beberapa'} adegan dalam layout grid ${layout}, setiap panel memperlihatkan momen berbeda dari cerita berikut.`;
        return `${heading}${commandLine}\n${firstLine}`;
      }
      return heading + firstLine;
    },
  );
}

/**
 * Kalau Image Prompt Variant dimulai dengan "Foto ini..." / "This image...",
 * prepend kalimat perintah "Buatlah foto UGC...".
 */
function injectImageVariantCommand(text: string): string {
  return text.replace(
    /(###?\s*IMAGE PROMPT VARIANT\s*\d+\s*\n)([^\n]+)/gi,
    (_match, heading: string, firstLine: string) => {
      const trimmed = firstLine.trim();
      if (COMMAND_OPENERS.some((re) => re.test(trimmed))) {
        return heading + firstLine;
      }
      if (DESCRIPTIVE_OPENERS.some((re) => re.test(trimmed))) {
        return `${heading}Buatlah foto UGC: ${trimmed.replace(/^(Foto ini|Gambar ini|This photo|The photo|This image|The image)\s*(menggambarkan|menunjukkan|showing|shows|depicts|depicting)?\s*/i, '')}`;
      }
      // Kalau tidak ada opener jelas, prepend command ringan
      if (!/^(Buatlah|Buat|Create|Generate|Produce|Make|Design|Render)/i.test(trimmed) && trimmed.length > 0) {
        return `${heading}Buatlah foto UGC: ${trimmed}`;
      }
      return heading + firstLine;
    },
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Universal negative prompt yang ditambahkan di bawah.
 */
export const UNIVERSAL_NEGATIVE_PROMPT =
  'no subtitles, no text overlay, no infographic design, no poster layout, no watermark, distorted face, extra fingers, blurry product, CGI skin, plastic skin, over cinematic lighting';
