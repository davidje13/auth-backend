import express from 'express';
import type AuthenticationService from './AuthenticationService';

const JSON_BODY = express.json({ limit: 4 * 1024 });

export type TokenGranter = (userId: string, service: string, externalId: string) => string;

export function buildAuthenticationRouter(
  authenticationService: AuthenticationService,
  tokenGranter: TokenGranter,
): express.Router {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.status(200).json(authenticationService.clientConfig);
  });

  router.post('/:name', JSON_BODY, async (req, res, next) => {
    const { name } = req.params;

    if (!authenticationService.supportsService(name)) {
      next();
      return;
    }

    const { externalToken } = req.body;
    if (!externalToken || typeof externalToken !== 'string') {
      res.status(400).json({ error: 'no externalToken provided' });
      return;
    }

    try {
      const externalId = await authenticationService.extractId(name, externalToken);
      if (!externalId) {
        throw new Error('failed to get user ID');
      }

      const userToken = tokenGranter(`${name}-${externalId}`, name, externalId);
      res.status(200).json({ userToken });
    } catch (e) {
      if (e.message === 'validation internal error') {
        res.status(500).json({ error: 'internal error' });
      } else {
        res.status(400).json({ error: e.message || 'unknown error' });
      }
    }
  });

  return router;
}
