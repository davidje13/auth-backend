import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AuthenticationService,
  AuthenticationConfiguration,
  AuthenticationClientConfiguration,
} from './AuthenticationService';
import { type TokenGranter, buildAuthenticationRouter } from './router';
export { encodeJWT, decodeJWT, type DecodeOptions } from './jwt/jwt';
export {
  NONE,
  HS256,
  HS384,
  HS512,
  RS256,
  RS384,
  RS512,
  loadJWKSVerifiers,
  makeRandomRS256,
  type Signer,
  type Verifier,
  type SignerVerifier,
} from './jwt/algorithms';
export { buildMockSsoApp } from './mock-sso/buildMockSsoApp';

interface AuthenticationBackend {
  router: (basePath?: string) => (req: IncomingMessage, res: ServerResponse) => void;
  service: AuthenticationService;
}

export type { TokenGranter, AuthenticationConfiguration, AuthenticationClientConfiguration };

export { AuthenticationService, buildAuthenticationRouter };

export function buildAuthenticationBackend(
  configs: Partial<AuthenticationConfiguration>,
  tokenGranter: TokenGranter,
): AuthenticationBackend {
  const service = new AuthenticationService(configs);
  const router = buildAuthenticationRouter(service, tokenGranter);

  return { router, service };
}
