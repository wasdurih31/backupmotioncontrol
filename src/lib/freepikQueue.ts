/**
 * Freepik API Call Serializer
 * ---------------------------------
 * Modul ini men-serialize SEMUA call ke API Freepik agar tidak pernah terjadi
 * dua request bersamaan dari instance server yang sama. Antara call juga
 * diberi jeda minimum + jitter acak untuk menghindari pola "bot-like" dan
 * mengurangi risiko rate-limit / 429 dari Freepik.
 *
 * Catatan deployment: pada environment serverless (mis. Vercel), variabel
 * module-level bertahan selama instance lambda warm. Jadi serialisasi berlaku
 * per instance. Ini sudah cukup efektif pada beban normal karena Vercel
 * me-reuse instance untuk request yang berdekatan.
 */

// Minimum jeda antar call Freepik (ms). Permintaan baru akan menunggu hingga
// jarak ini terpenuhi dari call sebelumnya.
const MIN_INTERVAL_MS = 3000;
// Tambahan jitter acak 0..MAX_JITTER_MS agar pola tidak konstan.
// Total delay: 3-10 detik (humanized, tidak terlalu cepat tapi tidak terlalu lambat)
const MAX_JITTER_MS = 7000;

let chain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Jalankan `fn` setelah memastikan:
 *   1. Tidak ada call Freepik lain yang sedang berjalan di instance ini.
 *   2. Sudah lewat MIN_INTERVAL_MS + jitter sejak call sebelumnya.
 *
 * Antrian FIFO — pemanggil pertama mendapat giliran pertama.
 */
export async function runFreepikCall<T>(fn: () => Promise<T>): Promise<T> {
  const runner = async (): Promise<T> => {
    const elapsed = Date.now() - lastCallAt;
    const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
    const wait = Math.max(0, MIN_INTERVAL_MS - elapsed) + jitter;
    if (wait > 0) {
      await sleep(wait);
    }
    lastCallAt = Date.now();
    try {
      return await fn();
    } finally {
      // Pastikan lastCallAt ter-update setelah call selesai (bukan saat start)
      // agar call berikutnya mengukur jarak dari akhir call sebelumnya.
      lastCallAt = Date.now();
    }
  };

  // Sambungkan ke chain. `catch(() => {})` menjaga queue tetap jalan bila
  // salah satu call error.
  const next = chain.then(runner, runner) as Promise<T>;
  chain = next.catch(() => undefined);
  return next;
}
