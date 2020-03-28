import express from 'express';
import type AuthenticationService from './AuthenticationService';
export declare type TokenGranter = (userId: string, service: string, externalId: string) => string;
export declare function buildAuthenticationRouter(authenticationService: AuthenticationService, tokenGranter: TokenGranter): express.Router;
//# sourceMappingURL=router.d.ts.map