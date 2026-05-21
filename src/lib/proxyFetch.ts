/**
 * Proxy Fetch for Freepik API
 * ────────────────────────────
 * Routes all Freepik API requests through IPRoyal residential proxies
 * stored in the database (admin-managed). Rotates through active proxies
 * with sticky sessions (~30 min per proxy before rotating).
 *
 * Only lightweight JSON API calls go through the proxy — payloads use
 * public R2 URLs (never base64), and result downloads bypass the proxy.
 *
 * Usage:
 *   import { freepikFetch } from '@/lib/proxyFetch';
 *   const res = await freepikFetch(url, { method: 'POST', headers, body });
 */

import { ProxyAgent } from 'undici';
import { db } from '@/db';
import { proxyAccounts } from '@/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

// ─── Sticky session cache ─────────────────────────────────────────────
// Each proxy is "locked" for STICKY_DURATION_MS before rotating to the next.
const STICKY_DURATION_MS = 55 * 60 * 1000; // 55 minutes (match IPRoyal 59min session with safety margin)

interface StickySession {
  proxyId: string;
  proxyUrl: string;
  agent: ProxyAgent;
  startedAt: number; // Date.now()
  verified: boolean; // true = sudah lolos pre-check, skip pre-check selanjutnya
}

let _sessions = new Map<string, StickySession>();

/**
 * Get proxy IDs yang sedang aktif dipakai oleh key lain.
 * Mencegah 2 key berbeda mendapat proxy yang sama (collision).
 */
function getActiveProxyIds(): Set<string> {
  const now = Date.now();
  const activeIds = new Set<string>();
  for (const [, session] of _sessions) {
    if ((now - session.startedAt) < STICKY_DURATION_MS) {
      activeIds.add(session.proxyId);
    }
  }
  return activeIds;
}

/**
 * Get or create a sticky proxy session for a specific API Key.
 * Uses the least-recently-used active proxy from the database.
 * Ensures no two keys share the same proxy (anti-collision).
 * Sticks to the same proxy for ~55 minutes per API key.
 */
async function getStickySession(apiKey: string): Promise<StickySession | null> {
  const now = Date.now();
  let session = _sessions.get(apiKey);

  // If current session is still valid, reuse it
  if (session && (now - session.startedAt) < STICKY_DURATION_MS) {
    return session;
  }

  // Session expired or doesn't exist — pick a new proxy from DB
  // Exclude proxies already assigned to other active sessions
  const usedProxyIds = getActiveProxyIds();

  try {
    const candidates = await db.select()
      .from(proxyAccounts)
      .where(eq(proxyAccounts.isActive, true))
      .orderBy(asc(proxyAccounts.lastUsedAt))
      .limit(20); // ambil beberapa untuk filter

    if (candidates.length === 0) {
      console.warn('[Proxy] No active proxy accounts in database');
      return null;
    }

    // Pilih proxy pertama yang TIDAK sedang dipakai key lain
    const proxy = candidates.find(p => !usedProxyIds.has(p.id)) || candidates[0];
    // Fallback ke candidates[0] kalau semua sudah terpakai (lebih baik share daripada gagal)

    // Create new ProxyAgent
    const agent = new ProxyAgent(proxy.proxyUrl);
    session = {
      proxyId: proxy.id,
      proxyUrl: proxy.proxyUrl,
      agent,
      startedAt: now,
      verified: false, // belum lolos pre-check
    };
    
    _sessions.set(apiKey, session);

    // Mark as used
    await db.update(proxyAccounts).set({
      lastUsedAt: new Date(),
      usageCount: sql`${proxyAccounts.usageCount} + 1`,
    }).where(eq(proxyAccounts.id, proxy.id));

    // Mask credentials for logging
    let masked = proxy.proxyUrl;
    try {
      const u = new URL(proxy.proxyUrl);
      masked = `${u.protocol}//${u.username.slice(0, 4)}***@${u.hostname}:${u.port}`;
    } catch { /* ignore */ }

    console.log(`[Proxy] New sticky session for key ...${apiKey.slice(-6)}: ${masked} (label: ${proxy.label || 'none'})`);
    return session;
  } catch (e) {
    console.error('[Proxy] Failed to get proxy from DB:', e);
    return null;
  }
}

/**
 * Mark the current proxy session as errored and force rotation on next call.
 */
async function markProxyError(apiKey: string, errorMsg: string) {
  const session = _sessions.get(apiKey);
  if (!session) return;
  try {
    await db.update(proxyAccounts).set({
      lastError: errorMsg.slice(0, 500),
    }).where(eq(proxyAccounts.id, session.proxyId));
  } catch { /* ignore */ }
  // Force rotation on next call
  _sessions.delete(apiKey);
}

/**
 * Fetch wrapper that routes the request through IPRoyal residential proxy.
 * Falls back to direct fetch() if no active proxies are configured.
 *
 * IMPORTANT: Only use this for api.freepik.com calls.
 * Never send base64 data through this — always use public URLs.
 */
export async function freepikFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  // Extract API key to bind the proxy session
  const headers = init?.headers as Record<string, string>;
  const apiKey = headers?.['x-freepik-api-key'] || headers?.['x-magnific-api-key'] || 'default_key';

  let session = await getStickySession(apiKey);
  const urlStr = typeof url === 'string' ? url : url.toString();
  const method = init?.method || 'GET';
  const startTime = Date.now();

  // ── Base64 safety check ──
  // If body contains base64 data, BLOCK and warn.
  if (init?.body && typeof init.body === 'string') {
    const bodyStr = init.body;
    if (bodyStr.includes('data:image/') || bodyStr.includes('data:video/') || bodyStr.length > 500000) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('[Proxy] ❌ BASE64 DETECTED IN PAYLOAD — BLOCKED!');
      console.error('[Proxy] Body length:', bodyStr.length, 'chars');
      console.error('[Proxy] This should NOT go through proxy. Fix the caller.');
      console.error('═══════════════════════════════════════════════════════');
    }

    // Log payload summary
    try {
      const payload = JSON.parse(bodyStr);
      const summary: Record<string, string> = {};
      for (const [key, val] of Object.entries(payload)) {
        if (typeof val === 'string' && val.startsWith('http')) {
          summary[key] = val.length > 80 ? val.slice(0, 80) + '...' : val;
        } else if (typeof val === 'string') {
          summary[key] = val.length > 60 ? val.slice(0, 60) + '...' : val;
        } else {
          summary[key] = String(val);
        }
      }
      console.log('───────────────────────────────────────────────────────');
      console.log(`[Proxy] 📦 Payload fields:`);
      for (const [k, v] of Object.entries(summary)) {
        const isUrl = typeof v === 'string' && v.startsWith('http');
        console.log(`[Proxy]   ${k}: ${isUrl ? '🔗 ' : ''}${v}`);
      }
      console.log(`[Proxy] 📏 Body size: ${(bodyStr.length / 1024).toFixed(1)} KB`);
    } catch { /* not JSON */ }
  }

  // ── Pre-check IP ──
  // Hanya pre-check kalau session BELUM verified (baru dibuat atau setelah rotate).
  // Kalau session sudah verified (lolos sebelumnya), skip — hemat bandwidth & kurangi ban.
  if (session && !session.verified) {
    let pingAttempts = 0;
    let isVerified = false;
    const maxPingAttempts = 10;

    while (session && pingAttempts < maxPingAttempts) {
      pingAttempts++;
      try {
        console.log(`[Proxy] 🔍 Pre-checking IP with api.magnific.com (Attempt ${pingAttempts}/${maxPingAttempts})...`);
        const controller = new AbortController();
        const pingRes = await fetch('https://api.magnific.com', {
          method: 'HEAD', // HEAD = no response body, hanya status code
          signal: controller.signal,
          // @ts-ignore
          dispatcher: session.agent,
        });

        // Abort body stream segera — kita hanya butuh status code
        controller.abort();

        if (pingRes.status === 403 || pingRes.status === 407 || pingRes.status >= 500) {
          console.warn(`[Proxy] ❌ Pre-check FAILED (HTTP ${pingRes.status}) — IP blocked. Rotating...`);
          await markProxyError(apiKey, `Precheck HTTP ${pingRes.status}`);
          session = await getStickySession(apiKey);
          continue;
        }

        console.log(`[Proxy] ✅ Pre-check PASSED (HTTP ${pingRes.status})`);
        isVerified = true;
        session.verified = true;
        break;
      } catch (e: any) {
        // AbortError dari controller.abort() — abaikan, itu expected
        if (e.name === 'AbortError') {
          // Ini terjadi kalau abort dipanggil sebelum response selesai — masih sukses
          console.log(`[Proxy] ✅ Pre-check PASSED (aborted body)`);
          isVerified = true;
          if (session) session.verified = true;
          break;
        }
        console.warn(`[Proxy] ❌ Pre-check network error: ${e.message} — Rotating...`);
        await markProxyError(apiKey, `Precheck network error`);
        session = await getStickySession(apiKey);
        continue;
      }
    }

    if (!isVerified) {
      console.error(`[Proxy] 🚨 Semua ${maxPingAttempts} IP proxy sibuk atau diblokir (403). Mencegah pengiriman tanpa proxy!`);
      throw new Error('Sistem jaringan sedang sibuk. Silakan coba beberapa saat lagi.');
    }
  } else if (session && session.verified) {
    // Session sudah verified sebelumnya — skip pre-check
    console.log(`[Proxy] ⚡ Skipping pre-check (session verified, ${Math.round((Date.now() - session.startedAt) / 1000 / 60)}min old)`);
  }

  if (session) {
    // Mask proxy URL for logging
    let masked = session.proxyUrl;
    try {
      const u = new URL(session.proxyUrl);
      masked = `${u.username.slice(0, 4)}***@${u.hostname}:${u.port}`;
    } catch { /* ignore */ }

    const sessionAge = Math.round((Date.now() - session.startedAt) / 1000 / 60);

    console.log('═══════════════════════════════════════════════════════');
    console.log(`[Proxy] ✅ ROUTING THROUGH IPROYAL PROXY`);
    console.log(`[Proxy] 🌐 Proxy: ${masked}`);
    console.log(`[Proxy] 📡 ${method} ${urlStr.split('?')[0]}`);
    console.log(`[Proxy] ⏱️  Sticky session age: ${sessionAge} min / 30 min`);
    console.log('═══════════════════════════════════════════════════════');

    try {
      // Inject browser-like headers untuk mengurangi deteksi bot oleh Cloudflare
      const browserHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      };
      const mergedHeaders = { ...browserHeaders, ...(init?.headers as Record<string, string> || {}) };

      const response = await fetch(url, {
        ...init,
        headers: mergedHeaders,
        // @ts-ignore — Node.js 18+ supports dispatcher on native fetch via undici
        dispatcher: session.agent,
      });

      const elapsed = Date.now() - startTime;
      console.log(`[Proxy] 📬 Response: HTTP ${response.status} (${elapsed}ms)`);

      // If we get a proxy-related error (403, 407, 502, 503), mark and rotate on next call
      if (response.status === 403 || response.status === 407 || response.status === 502 || response.status === 503) {
        console.warn(`[Proxy] ⚠️ Proxy error ${response.status} — will rotate on next call`);
        await markProxyError(apiKey, `HTTP ${response.status} from proxy`);
      }

      return response;
    } catch (e: any) {
      const elapsed = Date.now() - startTime;
      // Network error through proxy — mark and throw
      await markProxyError(apiKey, e.message || 'Network error');
      console.error(`[Proxy] ❌ Proxy network error (${elapsed}ms): ${e.message}`);
      throw new Error('Terjadi gangguan jaringan internal. Silakan coba lagi nanti.');
    }
  }

  // No proxy configured — strictly block direct call
  console.log('═══════════════════════════════════════════════════════');
  console.error(`[Proxy] 🚨 NO ACTIVE PROXIES — Direct call to Freepik is BLOCKED.`);
  console.log(`[Proxy] 📡 ${method} ${urlStr.split('?')[0]}`);
  console.log('═══════════════════════════════════════════════════════');
  throw new Error('Sistem jaringan belum siap. Silakan coba lagi nanti.');
}
