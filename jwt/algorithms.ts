import {
  createHmac,
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
  KeyObject,
  type BinaryLike,
  type JsonWebKey,
  type JsonWebKeyInput,
  type KeyLike,
  type PrivateKeyInput,
  type PublicKeyInput,
} from 'node:crypto';

type KeyID = string | undefined;

interface AlgorithmAndKey {
  alg: string;
  kid: KeyID;
}

export interface Signer extends AlgorithmAndKey {
  sign(data: string): Buffer;
}

export interface Verifier extends AlgorithmAndKey {
  verify(data: string, signature: Buffer): boolean;
}

export type SignerVerifier = Signer & Verifier;

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

const makeHMAC =
  (alg: string, algorithm: string) =>
  ({ kid, key }: HmacOptions): SignerVerifier => {
    const sign = (data: string) => createHmac(algorithm, key).update(data).digest();
    return {
      alg,
      kid,
      sign,
      verify: (data, signature) => sign(data).compare(signature) === 0,
    };
  };

function makeRSA(alg: string, algorithm: string) {
  const signer = ({ kid, privateKey }: RSASignerOptions): Signer => ({
    alg,
    kid,
    sign: (data) => createSign(algorithm).update(data).sign(privateKey),
  });
  const verifier = ({ kid, publicKey }: RSAVerifierOptions): Verifier & ToJWK => ({
    alg,
    kid,
    verify: (data, signature) => createVerify(algorithm).update(data).verify(publicKey, signature),
    toJWK: () => {
      const publicKeyJWK = (
        publicKey instanceof KeyObject ? publicKey : createPublicKey(publicKey)
      ).export({ format: 'jwk' });
      return {
        kty: 'RSA',
        kid: kid,
        alg: alg,
        use: 'sig',
        n: publicKeyJWK.n!,
        e: publicKeyJWK.e!,
      };
    },
  });
  return Object.assign(
    (options: RSASignerOptions & RSAVerifierOptions): SignerVerifier & ToJWK => ({
      ...signer(options),
      ...verifier(options),
    }),
    { signer, verifier },
  );
}

export const NONE: SignerVerifier = {
  alg: 'none',
  kid: undefined,
  sign: () => Buffer.from([]),
  verify: (_, signature) => signature.length === 0,
};
export const HS256 = makeHMAC('HS256', 'sha256');
export const HS384 = makeHMAC('HS384', 'sha384');
export const HS512 = makeHMAC('HS512', 'sha512');
export const RS256 = makeRSA('RS256', 'RSA-SHA256');
export const RS384 = makeRSA('RS384', 'RSA-SHA384');
export const RS512 = makeRSA('RS512', 'RSA-SHA512');

export function makeRandomRS256(kid: string) {
  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return RS256({ kid, ...keyPair });
}

export function loadJWKSVerifiers(items: JWK[]): Verifier[] {
  // only asymmetric algorithms are supported, because sending symmetric keys would be insecure
  const verifiers: Verifier[] = [];
  for (const key of items) {
    if (key.use !== 'sig') {
      continue;
    }
    switch (key.alg) {
      case 'RS256':
        verifiers.push(RS256.verifier({ kid: key.kid, publicKey: { key, format: 'jwk' } }));
        break;
      case 'RS384':
        verifiers.push(RS384.verifier({ kid: key.kid, publicKey: { key, format: 'jwk' } }));
        break;
      case 'RS512':
        verifiers.push(RS512.verifier({ kid: key.kid, publicKey: { key, format: 'jwk' } }));
        break;
      default:
        throw new Error(`unsupported JWK alg: ${key.alg}`);
    }
  }
  return verifiers;
}
