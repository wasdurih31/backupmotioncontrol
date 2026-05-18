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
const STICKY_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface StickySession {
  proxyId: string;
  proxyUrl: string;
  agent: ProxyAgent;
  startedAt: number; // Date.now()
}

let _session: StickySession | null = null;

/**
 * Get or create a sticky proxy session.
 * Uses the least-recently-used active proxy from the database.
 * Sticks to the same proxy for ~30 minutes.
 */
async function getStickySession(): Promise<StickySession | null> {
  const now = Date.now();

  // If current session is still valid, reuse it
  if (_session && (now - _session.startedAt) < STICKY_DURATION_MS) {
    return _session;
  }

  // Session expired or doesn't exist — pick a new proxy from DB
  try {
    const [proxy] = await db.select()
      .from(proxyAccounts)
      .where(eq(proxyAccounts.isActive, true))
      .orderBy(asc(proxyAccounts.lastUsedAt))
      .limit(1);

    if (!proxy) {
      console.warn('[Proxy] No active proxy accounts in database');
      return null;
    }

    // Create new ProxyAgent
    const agent = new ProxyAgent(proxy.proxyUrl);
    _session = {
      proxyId: proxy.id,
      proxyUrl: proxy.proxyUrl,
      agent,
      startedAt: now,
    };

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

    console.log(`[Proxy] New sticky session: ${masked} (label: ${proxy.label || 'none'})`);
    return _session;
  } catch (e) {
    console.error('[Proxy] Failed to get proxy from DB:', e);
    return null;
  }
}

/**
 * Mark the current proxy session as errored and force rotation on next call.
 */
async function markProxyError(errorMsg: string) {
  if (!_session) return;
  try {
    await db.update(proxyAccounts).set({
      lastError: errorMsg.slice(0, 500),
    }).where(eq(proxyAccounts.id, _session.proxyId));
  } catch { /* ignore */ }
  // Force rotation on next call
  _session = null;
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
  let session = await getStickySession();
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

  // ── Pre-check IP for POST requests ──
  // Ping api.magnific.com to ensure the IP isn't blocked by Cloudflare (403) before wasting API quota
  if (session && method === 'POST') {
    let pingAttempts = 0;
    let isVerified = false;

    while (session && pingAttempts < 3) {
      pingAttempts++;
      try {
        console.log(`[Proxy] 🔍 Pre-checking IP with api.magnific.com (Attempt ${pingAttempts}/3)...`);
        const pingRes = await fetch('https://api.magnific.com', {
          method: 'GET',
          // @ts-ignore
          dispatcher: session.agent,
        });

        if (pingRes.status === 403 || pingRes.status === 407 || pingRes.status >= 500) {
          console.warn(`[Proxy] ❌ Pre-check FAILED (HTTP ${pingRes.status}) — IP blocked. Rotating...`);
          await markProxyError(`Precheck HTTP ${pingRes.status}`);
          session = await getStickySession();
          continue; // Try again with new session
        }

        console.log(`[Proxy] ✅ Pre-check PASSED (HTTP ${pingRes.status})`);
        isVerified = true;
        break; // Success, exit loop and keep current session
      } catch (e: any) {
        console.warn(`[Proxy] ❌ Pre-check network error: ${e.message} — Rotating...`);
        await markProxyError(`Precheck network error`);
        session = await getStickySession();
        continue;
      }
    }

    if (!isVerified) {
      console.warn(`[Proxy] 🚨 All pre-check attempts failed or no proxies left. Falling back to DIRECT call.`);
      session = null; // Clear session to trigger direct fallback
    }
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
      const response = await fetch(url, {
        ...init,
        // @ts-ignore — Node.js 18+ supports dispatcher on native fetch via undici
        dispatcher: session.agent,
      });

      const elapsed = Date.now() - startTime;
      console.log(`[Proxy] 📬 Response: HTTP ${response.status} (${elapsed}ms)`);

      // If we get a proxy-related error (407, 502, 503), mark and rotate
      if (response.status === 407 || response.status === 502 || response.status === 503) {
        console.warn(`[Proxy] ⚠️ Proxy error ${response.status} — will rotate on next call`);
        await markProxyError(`HTTP ${response.status} from proxy`);
      }

      return response;
    } catch (e: any) {
      const elapsed = Date.now() - startTime;
      // Network error through proxy — mark and retry direct
      await markProxyError(e.message || 'Network error');
      console.error(`[Proxy] ❌ Proxy network error (${elapsed}ms): ${e.message}`);
      console.warn(`[Proxy] ⚡ Falling back to DIRECT call (no proxy)`);
      return fetch(url, init);
    }
  }

  // No proxy configured — direct call
  console.log('═══════════════════════════════════════════════════════');
  console.warn(`[Proxy] ⚠️ NO ACTIVE PROXIES — calling Freepik DIRECTLY`);
  console.log(`[Proxy] 📡 ${method} ${urlStr.split('?')[0]}`);
  console.log('═══════════════════════════════════════════════════════');
  return fetch(url, init);
}
