import type { Details } from './types';

export interface GitHubConfig {
  clientId: string;
  authUrl: string;
  clientSecret: string;
  accessTokenUrl: string;
  userUrl: string;
}

interface ResponseJSON {
  id: string;
}

// https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps

export async function extractId(config: GitHubConfig, details: Details): Promise<string> {
  const accessParams = new URLSearchParams();
  accessParams.append('code', details.externalToken);
  accessParams.append('client_id', config.clientId);
  accessParams.append('client_secret', config.clientSecret);
  const accessRes = await fetch(config.accessTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: accessParams.toString(),
  });

  const accessResults = new URLSearchParams(await accessRes.text());

  const error = accessResults.get('error');
  if (error) {
    throw new Error(`validation error: ${error}`);
  }

  const accessToken = accessResults.get('access_token');
  if (!accessToken) {
    throw new Error('validation internal error');
  }

  const userRes = await fetch(config.userUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const userResults = (await userRes.json()) as ResponseJSON;
  return userResults.id;
}
