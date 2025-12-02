import { IncomingMessage, ServerResponse, Server } from 'node:http';
import { KeyObject, BinaryLike, KeyLike, PrivateKeyInput, JsonWebKeyInput, PublicKeyInput, JsonWebKey } from 'node:crypto';

interface Details {
    externalToken: string;
    redirectUri?: string;
    codeVerifier?: string;
}

interface GoogleConfig {
    clientId: string;
    authUrl: string;
    certsUrl: string;
}

interface GitHubConfig {
    clientId: string;
    authUrl: string;
    clientSecret: string;
    accessTokenUrl: string;
    userUrl: string;
}

interface GitLabConfig {
    clientId: string;
    authUrl: string;
    accessTokenUrl: string;
    tokenInfoUrl: string;
}

interface ClientProperties {
    authUrl: string;
    clientId: string;
}
interface AuthenticationConfiguration {
    google: GoogleConfig;
    github: GitHubConfig;
    gitlab: GitLabConfig;
}
type AuthenticationClientConfiguration = Record<string, ClientProperties>;
declare class AuthenticationService {
    readonly clientConfig: AuthenticationClientConfiguration;
    private readonly _extractors;
    constructor(configs: Partial<AuthenticationConfiguration>);
    supportsService(service: string): boolean;
    supportedServices(): string[];
    extractId(service: string, details: Details): Promise<string>;
    private _bindExtractor;
}

type TokenGranter = (userId: string, service: string, externalId: string) => string;
declare function buildAuthenticationRouter(authenticationService: AuthenticationService, tokenGranter: TokenGranter): (basePath?: string) => (req: IncomingMessage, res: ServerResponse) => void;

type KeyID = string | undefined;
interface AlgorithmAndKey {
    alg: string;
    kid: KeyID;
}
interface Signer extends AlgorithmAndKey {
    sign(data: string): Buffer;
}
interface Verifier extends AlgorithmAndKey {
    verify(data: string, signature: Buffer): boolean;
}
type SignerVerifier = Signer & Verifier;
interface RSASignerOptions {
    kid: KeyID;
    privateKey: KeyLike | PrivateKeyInput | JsonWebKeyInput;
}
interface RSAVerifierOptions {
    kid: KeyID;
    publicKey: KeyLike | PublicKeyInput | JsonWebKeyInput;
}
interface JWK extends JsonWebKey {
    kid: string | undefined;
    alg: string;
    use: string;
}
interface ToJWK {
    toJWK(): JWK;
}
interface HmacOptions {
    kid: KeyID;
    key: KeyObject | BinaryLike;
}
declare const NONE: SignerVerifier;
declare const HS256: ({ kid, key }: HmacOptions) => SignerVerifier;
declare const HS384: ({ kid, key }: HmacOptions) => SignerVerifier;
declare const HS512: ({ kid, key }: HmacOptions) => SignerVerifier;
declare const RS256: ((options: RSASignerOptions & RSAVerifierOptions) => SignerVerifier & ToJWK) & {
    signer: ({ kid, privateKey }: RSASignerOptions) => Signer;
    verifier: ({ kid, publicKey }: RSAVerifierOptions) => Verifier & ToJWK;
};
declare const RS384: ((options: RSASignerOptions & RSAVerifierOptions) => SignerVerifier & ToJWK) & {
    signer: ({ kid, privateKey }: RSASignerOptions) => Signer;
    verifier: ({ kid, publicKey }: RSAVerifierOptions) => Verifier & ToJWK;
};
declare const RS512: ((options: RSASignerOptions & RSAVerifierOptions) => SignerVerifier & ToJWK) & {
    signer: ({ kid, privateKey }: RSASignerOptions) => Signer;
    verifier: ({ kid, publicKey }: RSAVerifierOptions) => Verifier & ToJWK;
};
declare function makeRandomRS256(kid: string): Signer & Verifier & ToJWK;
declare function loadJWKSVerifiers(items: JWK[]): Verifier[];

type MaybeArray<T> = T | Readonly<T[]>;
declare function encodeJWT(signer: Signer, payload: unknown, header?: Record<string, unknown>): string;
interface DecodeOptions {
    verifyKey: MaybeArray<Verifier> | false;
    verifyIss: MaybeArray<string> | false;
    verifyAud: MaybeArray<string> | false;
    verifyActive: number | boolean;
}
declare function decodeJWT(jwt: string, { verifyKey, verifyIss, verifyAud, verifyActive }: DecodeOptions): {
    header: any;
    payload: any;
};

declare function buildMockSsoApp({ iss }?: {
    iss?: string | undefined;
}): Server;

interface AuthenticationBackend {
    router: (basePath?: string) => (req: IncomingMessage, res: ServerResponse) => void;
    service: AuthenticationService;
}

declare function buildAuthenticationBackend(configs: Partial<AuthenticationConfiguration>, tokenGranter: TokenGranter): AuthenticationBackend;

export { AuthenticationService, HS256, HS384, HS512, NONE, RS256, RS384, RS512, buildAuthenticationBackend, buildAuthenticationRouter, buildMockSsoApp, decodeJWT, encodeJWT, loadJWKSVerifiers, makeRandomRS256 };
export type { AuthenticationClientConfiguration, AuthenticationConfiguration, DecodeOptions, Signer, SignerVerifier, TokenGranter, Verifier };
