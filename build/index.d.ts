import type express from 'express';
import AuthenticationService, { AuthenticationConfiguration, AuthenticationClientConfiguration } from './AuthenticationService';
import { TokenGranter, buildAuthenticationRouter } from './router';
interface AuthenticationBackend {
    router: express.Router;
    service: AuthenticationService;
}
export type { TokenGranter, AuthenticationConfiguration, AuthenticationClientConfiguration, };
export { AuthenticationService, buildAuthenticationRouter, };
export declare function buildAuthenticationBackend(configs: Partial<AuthenticationConfiguration>, tokenGranter: TokenGranter): AuthenticationBackend;
//# sourceMappingURL=index.d.ts.map