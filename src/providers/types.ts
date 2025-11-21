export interface Details {
  externalToken: string;
  redirectUri?: string;
  codeVerifier?: string;
}

export type Extractor<T> = (config: T, details: Details) => Promise<string>;
