import { createServer } from 'node:http';
import request from 'supertest';
import { getAddressURL, getFormData, HTTPError, Router, sendJSON, WebListener } from 'web-listener';
import { testServerRunner } from './testServerRunner';
import { buildAuthenticationBackend } from '..';
import 'lean-test';

describe('/gitlab', () => {
  const MOCK_SSO_SERVER = testServerRunner(() => {
    const router = new Router();
    router.post('/token', async (req, res) => {
      const data = await getFormData(req);
      return sendJSON(res, { access_token: data.getString('code') + '-token' });
    });
    router.get('/tokeninfo', (req, res) => {
      switch (req.headers.authorization) {
        case 'Bearer my-successful-code-token':
          return sendJSON(res, {
            application: { uid: 'my-client-id' },
            resource_owner_id: 1234,
          });
        case 'Bearer my-bad-code-token':
          return sendJSON(res, { error: 'nope' });
        case 'Bearer my-other-code-token':
          return sendJSON(res, {
            application: { uid: 'another-client-id' },
            resource_owner_id: 1234,
          });
        default:
          throw new HTTPError(500, { body: 'unknown authorization' });
      }
    });
    return new WebListener(router);
  });

  const SERVER = testServerRunner(({ getTyped }) => {
    const tokenGranter = (id: string): string => `issued-${id}`;
    const mockUrl = getAddressURL(getTyped(MOCK_SSO_SERVER).address());
    const config = {
      gitlab: {
        clientId: 'my-client-id',
        authUrl: 'foo',
        accessTokenUrl: mockUrl + '/token',
        tokenInfoUrl: mockUrl + '/tokeninfo',
      },
    };

    return createServer(buildAuthenticationBackend(config, tokenGranter).router('/prefix'));
  });

  it('responds with a token for valid codes', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({
        externalToken: 'my-successful-code',
        redirectUri: 'http://example.com',
        codeVerifier: 'foo',
      })
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).toEqual('issued-gitlab-1234');
    expect(response.body.error).not(toBeTruthy());
  });

  it('responds HTTP 4xx for non-POST requests', async ({ getTyped }) => {
    await request(getTyped(SERVER)).get('/prefix/gitlab').expect(405);
  });

  it('responds HTTP Bad Request for missing external token', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({})
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('no externalToken');
  });

  it('responds HTTP Bad Request for rejected external tokens', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({
        externalToken: 'my-bad-code',
        redirectUri: 'http://example.com',
        codeVerifier: 'foo',
      })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('validation error: nope');
  });

  it('responds HTTP Bad Request for audience mismatch', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({
        externalToken: 'my-other-code',
        redirectUri: 'http://example.com',
        codeVerifier: 'foo',
      })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('audience mismatch');
  });

  it('responds HTTP Bad Request for missing redirectUri', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({
        externalToken: 'my-successful-code',
        codeVerifier: 'foo',
      })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('validation error: missing redirect_uri or code_verifier');
  });

  it('responds HTTP Bad Request for missing codeVerifier', async ({ getTyped }) => {
    const response = await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({
        externalToken: 'my-successful-code',
        redirectUri: 'http://example.com',
      })
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.userToken).not(toBeTruthy());
    expect(response.body.error).toEqual('validation error: missing redirect_uri or code_verifier');
  });

  it('responds HTTP Internal Server Error if service fails', async ({ getTyped }) => {
    await request(getTyped(SERVER))
      .post('/prefix/gitlab')
      .send({
        externalToken: 'derp',
        redirectUri: 'http://example.com',
        codeVerifier: 'foo',
      })
      .expect(500);
  });
});
