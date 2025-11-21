import { createServer } from 'node:http';
import request from 'supertest';
import { getAddressURL, getQuery, HTTPError, Router, sendJSON, WebListener } from 'web-listener';
import { testServerRunner } from './testServerRunner';
import { buildAuthenticationBackend } from '..';
import 'lean-test';

describe('/google', () => {
  const MOCK_SSO_SERVER = testServerRunner(() => {
    const router = new Router();
    router.get('/', (req, res) => {
      switch (getQuery(req, 'id_token')) {
        case 'my-successful-external-token':
          return sendJSON(res, { aud: 'my-client-id', sub: 'my-external-id' });
        case 'my-bad-external-token':
          return sendJSON(res, { error: 'nope' });
        case 'my-other-external-token':
          return sendJSON(res, { aud: 'another-client-id', sub: 'my-external-id' });
        default:
          throw new HTTPError(500, { body: 'unknown id_token' });
      }
    });
    return new WebListener(router);
  });

  const SERVER = testServerRunner(({ getTyped }) => {
    const tokenGranter = (id: string): string => `issued-${id}`;
    const config = {
      google: {
        clientId: 'my-client-id',
        authUrl: 'foo',
        tokenInfoUrl: getAddressURL(getTyped(MOCK_SSO_SERVER).address()),
      },
    };

    return createServer(buildAuthenticationBackend(config, tokenGranter).router('/prefix'));
  });

  it('responds with a token for valid external tokens', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/google')
      .send({ externalToken: 'my-successful-external-token' })
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
    const response = await request(getTyped(SERVER))
      .post('/prefix/google')
      .send({ externalToken: 'my-bad-external-token' })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('validation error: nope');
  });

  it('responds HTTP Bad Request for audience mismatch', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/google')
      .send({ externalToken: 'my-other-external-token' })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('audience mismatch');
  });

  it('responds HTTP Internal Server Error if service fails', async ({ getTyped }) => {
    await request(getTyped(SERVER))
      .post('/prefix/google')
      .send({ externalToken: 'derp' })
      .expect(500);
  });
});
