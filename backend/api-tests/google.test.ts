import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import request from 'supertest';
import { getAddressURL, requestHandler, sendJSON, WebListener } from 'web-listener';
import { encodeJWT, makeRandomRS256 } from '../../jwt';
import { testServerRunner } from '../../test-helpers/serverRunner';
import { buildAuthAPI } from '..';
import 'lean-test';

describe('/google', () => {
  const key = makeRandomRS256('test-key');

  const MOCK_SSO_SERVER = testServerRunner(
    () => new WebListener(requestHandler((_, res) => sendJSON(res, { keys: [key.toJWK()] }))),
  );

  const SERVER = testServerRunner(({ getTyped }) => {
    const tokenGranter = (id: string): string => `issued-${id}`;
    const config = {
      google: {
        clientId: 'my-client-id',
        authUrl: 'foo',
        certsUrl: getAddressURL(getTyped(MOCK_SSO_SERVER).address()),
      },
    };

    return createServer(buildAuthAPI(config, tokenGranter).router('/prefix'));
  });

  it('responds with a token for valid external tokens', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/google')
      .send({ externalToken: encodeJWT(key, validPayload('my-external-id')) })
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).toEqual('issued-google-my-external-id');
    expect(response.body.error).not(toBeTruthy());
  });

  it('responds HTTP 4xx for non-POST requests', async ({ getTyped }) => {
    await request(getTyped(SERVER)).get('/prefix/google').expect(405);
  });

  it('responds HTTP Bad Request for missing external token', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/google')
      .send({})
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('no externalToken');
  });

  it('responds HTTP Bad Request for rejected external tokens', async ({ getTyped }) => {
    const key2 = makeRandomRS256('test-key');
    const response = await request(getTyped(SERVER))
      .post('/prefix/google')
      .send({
        externalToken: encodeJWT(key2, validPayload('my-external-id')),
      })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('signature mismatch');
  });

  it('responds HTTP Bad Request for audience mismatch', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/google')
      .send({
        externalToken: encodeJWT(key, {
          ...validPayload('my-external-id'),
          aud: 'another-client-id',
        }),
      })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('audience mismatch');
  });
});

const validPayload = (sub: string) => ({
  iss: 'https://accounts.google.com',
  aud: 'my-client-id',
  nonce: 'my-nonce',
  jti: randomUUID(),
  sub,
  iat: Date.now(),
  exp: Date.now() + 60 * 60,
});
