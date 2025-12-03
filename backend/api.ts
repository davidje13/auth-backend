import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthenticationService } from './AuthenticationService';

export type TokenGranter = (userId: string, service: string, externalId: string) => string;

const SERVICE_PATH = /^([a-z0-9]+)\/?$/;

export function requestHandler(
  authenticationService: AuthenticationService,
  tokenGranter: TokenGranter,
) {
  const handle404 = (_: IncomingMessage, res: ServerResponse) => sendJSON(res, 404, {});

  const handleGetConfig = (_: IncomingMessage, res: ServerResponse) =>
    sendJSON(res, 200, authenticationService.clientConfig);

  const handlePostService = (service: string) => {
    if (!authenticationService.supportsService(service)) {
      return handle404;
    }

    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      try {
        const body = await readJSON(req, 4 * 1024);
        if (!isRecord(body)) {
          throw new Error('missing or invalid body');
        }
        const { externalToken, redirectUri, codeVerifier } = body;
        if (!externalToken || typeof externalToken !== 'string') {
          throw new Error('no externalToken');
        }
        if (redirectUri !== undefined && typeof redirectUri !== 'string') {
          throw new Error('invalid redirectUri');
        }
        if (codeVerifier !== undefined && typeof codeVerifier !== 'string') {
          throw new Error('invalid codeVerifier');
        }

        const externalId = await authenticationService.extractId(service, {
          externalToken,
          redirectUri,
          codeVerifier,
        });
        if (!externalId) {
          throw new Error('failed to get user ID');
        }

        const userToken = tokenGranter(`${service}-${externalId}`, service, externalId);
        return sendJSON(res, 200, { userToken });
      } catch (e: unknown) {
        return sendError(res, e);
      }
    };
  };

  return (basePath = '') =>
    (req: IncomingMessage, res: ServerResponse) => {
      let url = req.url?.split('?')[0] ?? '';
      if (basePath !== '') {
        if (!url.startsWith(basePath)) {
          return sendJSON(res, 404, {});
        }
        url = url.substring(basePath.length);
      }

      if (url.startsWith('/') && !basePath.endsWith('/')) {
        url = url.substring(1);
      }

      if (req.method === 'GET' && url === '') {
        return handleGetConfig(req, res);
      }

      const [, name] = SERVICE_PATH.exec(url) ?? [];
      if (req.method === 'POST' && name) {
        return handlePostService(name)(req, res);
      }
      if (url === '' || name) {
        return sendJSON(res, 405, {});
      }

      return sendJSON(res, 404, {});
    };
}

function isRecord(o: unknown): o is Record<string, unknown> {
  return o !== null && typeof o === 'object';
}

async function readJSON(req: IncomingMessage, limit: number): Promise<unknown> {
  // similar to node:stream/consumers json(req), but enforces a maximum content length

  const contentLength = req.headers['content-length'];
  const promisedLength = contentLength ? Number.parseInt(contentLength, 10) : limit;
  if (promisedLength > limit) {
    throw new Error('too much data');
  }
  const parts: Buffer[] = [];
  let actualLength = 0;
  for await (const part of req) {
    const bufferPart: Buffer = part;
    actualLength += bufferPart.byteLength;
    if (actualLength > promisedLength) {
      throw new Error('too much data');
    }
    parts.push(part);
  }
  return JSON.parse(Buffer.concat(parts, actualLength).toString('utf-8'));
}

function setHeaders(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Expires', '0');
  res.setHeader('Pragma', 'no-cache');
}

function sendJSON(res: ServerResponse, status: number, content: unknown) {
  setHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(status);
  res.write(JSON.stringify(content));
  res.end();
}

function sendError(res: ServerResponse, err: unknown) {
  if (!(err instanceof Error) || err.message === 'validation internal error') {
    return sendJSON(res, 500, { error: 'internal error' });
  } else {
    return sendJSON(res, 400, { error: err.message || 'unknown error' });
  }
}
