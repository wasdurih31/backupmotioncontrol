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
  const session = await getStickySession();

  if (session) {
    const urlStr = typeof url === 'string' ? url.split('?')[0] : url.toString().split('?')[0];
    console.log(`[Proxy] Routing through IPRoyal: ${urlStr}`);

    try {
      const response = await fetch(url, {
        ...init,
        // @ts-ignore — Node.js 18+ supports dispatcher on native fetch via undici
        dispatcher: session.agent,
      });

      // If we get a proxy-related error (407, 502, 503), mark and rotate
      if (response.status === 407 || response.status === 502 || response.status === 503) {
        await markProxyError(`HTTP ${response.status} from proxy`);
      }

      return response;
    } catch (e: any) {
      // Network error through proxy — mark and retry direct
      await markProxyError(e.message || 'Network error');
      console.error(`[Proxy] Proxy network error, falling back to direct:`, e.message);
      return fetch(url, init);
    }
  }

  // No proxy configured — direct call
  console.warn('[Proxy] No active proxies — calling Freepik directly');
  return fetch(url, init);
}
