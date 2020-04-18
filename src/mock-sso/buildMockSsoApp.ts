import crypto from 'crypto';
import jwt from 'jwt-simple';
import express from 'express';
import type { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import authContent from './authContent';

// This is for local development and testing; it simulates a
// Google sign in handshake.

export default (): Express => {
  const keys = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const app = express();

  app.get('/auth', (req, res) => {
    res.header('Content-Type', 'text/html').send(authContent(req.query));
  });

  app.post('/auth', express.urlencoded({ extended: false }), (req, res) => {
    const {
      redirect_uri: redirectUri,
      nonce,
      state,
      client_id: clientId,
      identifier,
    } = req.body;

    if (!redirectUri || !clientId || !identifier) {
      res.status(400).json({ error: 'missing fields' });
    }

    const now = Math.floor(Date.now() / 1000);
    const idToken = jwt.encode({
      aud: clientId,
      nonce,
      jti: uuidv4(),
      sub: identifier,
      iat: now,
      exp: now + 60 * 60,
    }, keys.privateKey, 'RS256');

    const redirectParams = new URLSearchParams();
    redirectParams.set('id_token', idToken);
    redirectParams.set('state', state);
    res.redirect(303, `${redirectUri}#${redirectParams.toString()}`);
  });

  app.get('/tokeninfo', (req, res) => {
    const { id_token: idToken } = req.query;
    try {
      if (typeof idToken !== 'string') {
        throw new Error('Expected string id_token');
      }
      res.json(jwt.decode(idToken, keys.publicKey, false, 'RS256'));
    } catch (e) {
      res.status(400).json({ error: 'validation failure' });
    }
  });

  return app;
};
