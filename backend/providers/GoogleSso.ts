import { decodeJWT, loadJWKSVerifiers, type Verifier } from '../../jwt';
import type { Details } from './types';

export interface GoogleConfig {
  clientId: string;
  authUrl: string;
  certsUrl: string;
}

export async function extractId(config: GoogleConfig, details: Details): Promise<string> {
  // https://developers.google.com/identity/sign-in/web/backend-auth

  const data = decodeJWT(details.externalToken, {
    verifyKey: await getJWKS(config.certsUrl),
    verifyIss: ['accounts.google.com', 'https://accounts.google.com'],
    verifyAud: config.clientId,
    verifyActive: true,
  });

  // TODO: use externalTokenInfo.jti nonce to prevent replay attacks
  // (would need to store value at least until exp time)

  return data.payload.sub;
}

interface JwksCacheState {
  exp: number;
  verifiers: Verifier[] | Promise<Verifier[]>;
}
const JWKS_CACHE = new Map<string, JwksCacheState>();

async function getJWKS(url: string) {
  const now = Date.now();
  let cached = JWKS_CACHE.get(url);
  if (cached && now < cached.exp) {
    return cached.verifiers;
  }
  const maxLoadTime = 20000;
  const state: JwksCacheState = {
    exp: now + maxLoadTime,
    verifiers: loadJWKS(url, now, maxLoadTime),
  };
  JWKS_CACHE.set(url, state);

  return state.verifiers;
}

async function loadJWKS(url: string, now: number, maxLoadTime: number) {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), maxLoadTime);
  let success = false;
  try {
    const certs = await fetch(url, { signal: ac.signal });
    if (certs.status >= 300) {
      throw new Error('validation internal error: failed to fetch jwks');
    }
    const certsJSON: any = await certs.json();
    if (!certsJSON || typeof certsJSON !== 'object' || Array.isArray(certsJSON)) {
      throw new Error('validation internal error: unexpected jwks structure');
    }
    const verifiers = loadJWKSVerifiers(certsJSON.keys);
    const cacheControl = certs.headers.get('cache-control') ?? '';
    const expiryMatch = /(?:^|,)\s*max-age=(\d+)\s*(?:,|$)/i.exec(cacheControl);
    const exp = expiryMatch ? now + Number(expiryMatch[1]) * 1000 : 0;
    JWKS_CACHE.set(url, { exp, verifiers });
    success = true;
    return verifiers;
  } finally {
    clearTimeout(timeout);
    if (!success) {
      JWKS_CACHE.delete(url);
    }
  }
}
