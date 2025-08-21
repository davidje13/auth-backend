export interface GitLabConfig {
  clientId: string;
  authUrl: string;
  tokenInfoUrl: string;
}

interface ResponseJSON {
  error?: string;
  application: { uid: string };
  resource_owner_id: string;
}

export async function extractId(
  config: GitLabConfig,
  externalToken: string,
): Promise<string> {
  const res = await fetch(config.tokenInfoUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${externalToken}` },
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
