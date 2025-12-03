import { createServer } from 'node:http';
import request from 'supertest';
import { getAddressURL } from 'web-listener';
import { testServerRunner } from '../test-helpers/serverRunner';
import { buildAuthAPI } from '../backend';
import { buildMockSSO } from '../mock';
import 'lean-test';

describe('mock SSO integration with Google SSO', () => {
  const MOCK_SSO_SERVER = testServerRunner(() => buildMockSSO());
  const MOCK_SSO_SERVER_2 = testServerRunner(() => buildMockSSO());

  const SERVER = testServerRunner(({ getTyped }) => {
    const tokenGranter = (id: string): string => `issued-${id}`;
    const config = {
      google: {
        clientId: 'my-client-id',
        authUrl: 'foo',
        certsUrl: `${getAddressURL(getTyped(MOCK_SSO_SERVER).address())}/certs`,
      },
    };

    return createServer(buildAuthAPI(config, tokenGranter).router());
  });

  it('negotiates authentication successfully', async ({ getTyped }) => {
    const response1 = await request(getTyped(MOCK_SSO_SERVER))
      .post('/auth')
      .send('redirect_uri=a&nonce=my-nonce&state=my-state&client_id=my-client-id&identifier=my-id')
      .expect(303);

    const redirectUri = response1.get('Location')!;
    const hashParams = new URLSearchParams(redirectUri.split('#')[1]);
    const externalToken = hashParams.get('id_token');

    const response2 = await request(getTyped(SERVER))
      .post('/google')
      .send({ externalToken })
      .expect(200);

    expect(response2.body.error).toBeUndefined();
    expect(response2.body.userToken).toEqual('issued-google-my-id');
  });

  it('produces errors when given an invalid token', async ({ getTyped }) => {
    // request a token from a different mock SSO server
    // (which will have been started with different randomised keys)
    const response1 = await request(getTyped(MOCK_SSO_SERVER_2))
      .post('/auth')
      .send('redirect_uri=a&nonce=my-nonce&state=my-state&client_id=my-client-id&identifier=my-id')
      .expect(303);

    const redirectUri = response1.get('Location')!;
    const hashParams = new URLSearchParams(redirectUri.split('#')[1]);
    const externalToken = hashParams.get('id_token');

    const response2 = await request(getTyped(SERVER))
      .post('/google')
      .send({ externalToken })
      .expect(400);

    expect(response2.body.error).toEqual('signature mismatch');
  });
});
