import express from 'express';
import request from 'supertest';
import { testServerRunner, addressToString } from './testServerRunner';
import { buildMockSsoApp, buildAuthenticationBackend } from '..';
import 'lean-test';

describe('mock SSO integration with Google SSO', () => {
  const MOCK_SSO_SERVER = testServerRunner(() => buildMockSsoApp());

  const SERVER = testServerRunner(({ getTyped }) => {
    const tokenGranter = (id: string): string => `issued-${id}`;
    const config = {
      google: {
        clientId: 'my-client-id',
        authUrl: 'foo',
        tokenInfoUrl: `${addressToString(getTyped(MOCK_SSO_SERVER).address()!)}/tokeninfo`,
      },
    };

    return express().use(buildAuthenticationBackend(config, tokenGranter).router);
  });

  it('negotiates authentication successfully', async ({ getTyped }) => {
    const response1 = await request(getTyped(MOCK_SSO_SERVER))
      .post('/auth')
      .send('redirect_uri=a&nonce=my-nonce&state=my-state&client_id=my-client-id&identifier=my-id')
      .expect(303);

    const redirectUri = response1.get('Location')!;
    const hashParams = new URLSearchParams(redirectUri.split('#')[1]);
    const externalToken = hashParams.get('id_token');

    const response2 = await request(getTyped(SERVER)).post('/google').send({ externalToken });
    // .expect(200);

    expect(response2.body.error).toBeUndefined();
    expect(response2.body.userToken).toEqual('issued-google-my-id');
  });

  it('produces errors when given an invalid token', async ({ getTyped }) => {
    // token taken from a run with different randomised keys
    const externalToken =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.' +
      'eyJhdWQiOiJteS1jbGllbnQtaWQiLCJub25jZSI6Im15LW5vbmNlIiwianRp' +
      'IjoiNmY1N2RlYzYtODc5Ni00MjM1LTllNmItMTNlOGJiNWE1YzhmIiwic3Vi' +
      'IjoibXktaWQiLCJpYXQiOjE1ODU0MzgzNzEsImV4cCI6MTU4NTQ0MTk3MX0.' +
      'WkBr8XTy6dPJ7gGxFp6Ec8so-CK_skkhU0EJMDxveQd64Dsul6rhTlpH7cOt' +
      'JEHUCS1ShB0bW8V-Mo4eAQKb7jXBJhrAY6o5iQY430HqhxVCETvKJDIDED-H' +
      '_DHI97syb8XwxIl6A7UYzJ30Jbv6BfsLlbt31H2MfAbVOk3orcjEyTMThRhA' +
      'AHRNVV3kZbMJ_BHf-lSMCmX3mFgPavHBnA7gZlYdyjzwBSr7PGjwOck2B0yp' +
      'umT4x7Xep-wiODgX_PBdtazTfNHR4ocO4MDksUI1k1J8hhGqzlfiBIBAQcYu' +
      'XtU0-Hcdl0dWkSPADSvMP5pIysYXCc2tisnIqP5sEQ';

    const response = await request(getTyped(SERVER))
      .post('/google')
      .send({ externalToken })
      .expect(400);

    expect(response.body.error).toEqual('validation error: validation failure');
  });
});
