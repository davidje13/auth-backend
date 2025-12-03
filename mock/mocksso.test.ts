import request from 'supertest';
import { testServerRunner } from '../test-helpers/serverRunner';
import { decodeJWT } from '../jwt';
import { buildMockSSO } from '.';
import 'lean-test';

describe('mock SSO', () => {
  const SERVER = testServerRunner(() => buildMockSSO());

  describe('GET /auth', () => {
    it('returns HTML with reflected values', async ({ getTyped }) => {
      const { text } = await request(getTyped(SERVER))
        .get('/auth?redirect_uri=abc&nonce=def&state=ghi&client_id=jkl')
        .expect(200);

      expect(text).toContain('<input type="hidden" name="redirect_uri" value="abc" />');
      expect(text).toContain('<input type="hidden" name="nonce" value="def" />');
      expect(text).toContain('<input type="hidden" name="state" value="ghi" />');
      expect(text).toContain('<input type="hidden" name="client_id" value="jkl" />');
    });

    it('escapes reflected values', async ({ getTyped }) => {
      const { text } = await request(getTyped(SERVER))
        .get('/auth?redirect_uri=a"c&nonce=d&state=e&client_id=f')
        .expect(200);

      expect(text).toContain('<input type="hidden" name="redirect_uri" value="a&quot;c" />');
    });
  });

  describe('POST /auth', () => {
    it('redirects to the requested URI', async ({ getTyped }) => {
      const response = await request(getTyped(SERVER))
        .post('/auth')
        .send('redirect_uri=my-redirect&nonce=b&state=c&client_id=d&identifier=e')
        .expect(303);

      const redirectUri = response.get('Location');
      expect(redirectUri).toContain('my-redirect');
    });

    it('reflects the given state', async ({ getTyped }) => {
      const response = await request(getTyped(SERVER))
        .post('/auth')
        .send('redirect_uri=a&nonce=b&state=my-state&client_id=d&identifier=e')
        .expect(303);

      const redirectUri = response.get('Location')!;
      const hashParams = new URLSearchParams(redirectUri.split('#')[1]);

      expect(hashParams.get('state')).toEqual('my-state');
    });

    it('provides a JWT id_token', async ({ getTyped }) => {
      const beforeTm = Date.now();

      const response = await request(getTyped(SERVER))
        .post('/auth')
        .send('redirect_uri=a&nonce=my-nonce&state=c&client_id=my-client&identifier=my-id')
        .expect(303);

      const redirectUri = response.get('Location')!;
      const hashParams = new URLSearchParams(redirectUri.split('#')[1]);
      const token = hashParams.get('id_token');
      const decoded = decodeJWT(token!, {
        verifyKey: false,
        verifyIss: false,
        verifyAud: false,
        verifyActive: false,
      });

      expect(decoded.payload.aud).toEqual('my-client');
      expect(decoded.payload.nonce).toEqual('my-nonce');
      expect(decoded.payload.sub).toEqual('my-id');
      expect(decoded.payload.iat).toBeGreaterThanOrEqual(Math.floor(beforeTm / 1000));
      expect(decoded.payload.exp).toBeGreaterThan((decoded.payload.iat as number) + 10);
    });
  });
});
