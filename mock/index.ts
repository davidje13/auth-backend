import { randomUUID } from 'node:crypto';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { text } from 'node:stream/consumers';
import { encodeJWT, makeRandomRS256 } from '../jwt';
import { loginPage } from './authContent';

// This is for local development and testing; it simulates a
// Google sign in handshake.

export function buildMockSSO({ iss = 'https://accounts.google.com' } = {}): Server {
  const key = makeRandomRS256('mock-key');
  const jwks = { keys: [key.toJWK()] };

  return createServer(async (req, res) => {
    const url = new URL('http://localhost' + req.url);
    const query = new URLSearchParams(url.search);

    switch (`${req.method} ${url.pathname}`) {
      case 'GET /auth': {
        return send(res, 200, 'text/html; charset=utf-8', loginPage(query));
      }
      case 'POST /auth': {
        const body = new URLSearchParams(await text(req));
        // Because this is for local testing, we blindly trust the redirect URI,
        // but this would be a security vulnerability in a real SSO server.
        const redirectUri = body.get('redirect_uri');
        const nonce = body.get('nonce');
        const state = body.get('state') ?? '';
        const clientId = body.get('client_id');
        const identifier = body.get('identifier');

        if (!redirectUri || !clientId || !identifier) {
          return sendJSON(res, 400, { error: 'missing fields' });
        }

        const now = Math.floor(Date.now() / 1000);
        const idToken = encodeJWT(key, {
          iss,
          aud: clientId,
          nonce,
          jti: randomUUID(),
          sub: identifier,
          iat: now,
          exp: now + 60 * 60,
        });

        const redirectParams = new URLSearchParams();
        redirectParams.set('id_token', idToken);
        redirectParams.set('state', state);
        return sendRedirect(res, 303, `${redirectUri}#${redirectParams.toString()}`);
      }
      case 'GET /certs': {
        // similar to the real cache-control header, but do not allow any caching
        // (to avoid issues when re-launching the mock server)
        res.setHeader('cache-control', 'public, max-age=0, must-revalidate, no-transform');
        return sendJSON(res, 200, jwks);
      }
      default: {
        res.writeHead(404);
        res.end();
      }
    }
  });
}

function send(res: ServerResponse, status: number, contentType: string, content: unknown) {
  res.setHeader('Content-Type', contentType);
  res.writeHead(status);
  res.write(content);
  res.end();
}

function sendJSON(res: ServerResponse, status: number, content: unknown) {
  send(res, status, 'application/json', JSON.stringify(content));
}

function sendRedirect(res: ServerResponse, status: number, url: string) {
  res.setHeader('Location', url);
  res.writeHead(status);
  res.end();
}
