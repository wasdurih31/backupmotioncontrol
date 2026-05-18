/**
 * Proxy Fetch for Freepik API
 * ────────────────────────────
 * Routes all Freepik API requests through IPRoyal residential proxy
 * to prevent IP blocking. Only the lightweight JSON API calls go through
 * the proxy — payloads use public R2 URLs (never base64), and result
 * downloads bypass the proxy entirely.
 *
 * Usage:
 *   import { freepikFetch } from '@/lib/proxyFetch';
 *   const res = await freepikFetch(url, { method: 'POST', headers, body });
 *
 * Environment variable:
 *   IPROYAL_PROXY_URL=http://username:password@geo.iproyal.com:12321
 */

import { ProxyAgent } from 'undici';

// Cache the ProxyAgent instance so we don't recreate it on every call.
let _proxyAgent: ProxyAgent | null = null;

function getProxyAgent(): ProxyAgent | null {
  const proxyUrl = process.env.IPROYAL_PROXY_URL;
  if (!proxyUrl) return null;

  if (!_proxyAgent) {
    _proxyAgent = new ProxyAgent(proxyUrl);
    console.log('[Proxy] IPRoyal ProxyAgent initialized');
  }
  return _proxyAgent;
}

/**
 * Fetch wrapper that routes the request through IPRoyal proxy.
 * Falls back to direct fetch() if IPROYAL_PROXY_URL is not set.
 *
 * IMPORTANT: Only use this for api.freepik.com calls.
 * Never send base64 data through this — always use public URLs.
 */
export async function freepikFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const agent = getProxyAgent();

  if (agent) {
    console.log(`[Proxy] Routing through IPRoyal: ${typeof url === 'string' ? url.split('?')[0] : url.toString().split('?')[0]}`);
    // Use undici's dispatcher option to route through proxy
    return fetch(url, {
      ...init,
      // @ts-ignore — Node.js 18+ supports dispatcher on native fetch via undici
      dispatcher: agent,
    });
  }

  // No proxy configured — direct call (local dev)
  console.warn('[Proxy] IPROYAL_PROXY_URL not set — calling Freepik directly');
  return fetch(url, init);
}
