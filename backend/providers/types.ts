export interface Details {
  externalToken: string;
  redirectUri?: string | undefined;
  codeVerifier?: string | undefined;
}

export type Extractor<T> = (config: T, details: Details) => Promise<string>;
