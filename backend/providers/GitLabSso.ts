import type { Details } from './types';

// TODO: allow fetching endpoints automatically from https://gitlab.com/.well-known/openid-configuration
// .authorization_endpoint, .token_endpoint, (token/info endpoint is not listed...)

export interface GitLabConfig {
  clientId: string;
  authUrl: string;
  accessTokenUrl: string;
  tokenInfoUrl: string;
}

interface ResponseJSON {
  error?: string;
  application: { uid: string };
  resource_owner_id: string;
}

// https://docs.gitlab.com/api/oauth2/

export async function extractId(config: GitLabConfig, details: Details): Promise<string> {
  if (!details.redirectUri || !details.codeVerifier) {
    throw new Error(`validation error: missing redirect_uri or code_verifier`);
  }

  // https://github.com/doorkeeper-gem/doorkeeper/wiki/API-endpoint-descriptions-and-examples#post---oauthtoken
  // since we're using PKCE, we could do this call on the client, but by doing it on the server we can be sure all the expected parameters are being sent
  const accessParams = new URLSearchParams();
  accessParams.append('grant_type', 'authorization_code');
  accessParams.append('client_id', config.clientId);
  accessParams.append('code', details.externalToken);
  accessParams.append('redirect_uri', details.redirectUri); // https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.3
  accessParams.append('code_verifier', details.codeVerifier);
  accessParams.append('code_challenge_method', 'S256');
  const accessRes = await fetch(config.accessTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: accessParams.toString(),
  });

  if (accessRes.status !== 200) {
    throw new Error('validation internal error');
  }
  const accessResults = (await accessRes.json()) as Record<string, unknown>;
  if (!accessResults || typeof accessResults !== 'object') {
    throw new Error('validation internal error');
  }

  const error = accessResults['error'];
  if (error) {
    throw new Error(`validation error: ${error}`);
  }

  const accessToken = accessResults['access_token'];
  if (!accessToken) {
    throw new Error('validation internal error');
  }

  // https://github.com/doorkeeper-gem/doorkeeper/wiki/API-endpoint-descriptions-and-examples#get----oauthtokeninfo
  const res = await fetch(config.tokenInfoUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status >= 500) {
    throw new Error('validation internal error');
  }

  const externalTokenInfo = (await res.json()) as ResponseJSON;
  if (res.status !== 200 || externalTokenInfo.error) {
    throw new Error(`validation error: ${externalTokenInfo.error}`);
  }

  if (externalTokenInfo.application.uid !== config.clientId) {
    throw new Error('audience mismatch');
  }

  return externalTokenInfo.resource_owner_id;
}
