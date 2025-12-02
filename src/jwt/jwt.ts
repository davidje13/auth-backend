import type { Signer, Verifier } from './algorithms';

type MaybeArray<T> = T | Readonly<T[]>;

export function encodeJWT(signer: Signer, payload: unknown, header: Record<string, unknown> = {}) {
  const fullHeader = { typ: 'JWT', kid: signer.kid, alg: signer.alg, ...header };
  const data = `${enc(fullHeader)}.${enc(payload)}`;
  return `${data}.${signer.sign(data).toString('base64url')}`;
}

export interface DecodeOptions {
  verifyKey: MaybeArray<Verifier> | false;
  verifyIss: MaybeArray<string> | false;
  verifyAud: MaybeArray<string> | false;
  verifyActive: number | boolean;
}

export function decodeJWT(
  jwt: string,
  { verifyKey, verifyIss, verifyAud, verifyActive }: DecodeOptions,
) {
  const match = /^([0-9a-zA-Z\-_]+)\.([0-9a-zA-Z\-_]+)\.([0-9a-zA-Z\-_]*)$/.exec(jwt);
  if (!match) {
    throw new Error('invalid JWT');
  }

  const [, headerEncoded, payloadEncoded, signatureEncoded] = match;
  const header = dec(headerEncoded);
  const payload = dec(payloadEncoded);

  if (verifyKey !== false) {
    verify(
      `${headerEncoded}.${payloadEncoded}`,
      header,
      asArray(verifyKey),
      Buffer.from(signatureEncoded, 'base64url'),
    );
  }

  if (verifyIss !== false) {
    if (!asArray(verifyIss).includes(payload.iss)) {
      throw new Error('issuer mismatch');
    }
  }

  if (verifyAud !== false && payload.aud) {
    const audSet = new Set(asArray(verifyAud));
    if (!asArray(payload.aud).some((aud) => audSet.has(aud))) {
      throw new Error('audience mismatch');
    }
  }

  if (verifyActive !== false) {
    const now = verifyActive === true ? Date.now() : verifyActive;
    if (payload.nbf && now < payload.nbf * 1000) {
      throw new Error('not yet valid');
    }
    if (payload.exp && now >= payload.exp * 1000) {
      throw new Error('expired');
    }
  }

  return { header, payload };
}

function verify(
  data: string,
  header: { kid?: string; alg?: string },
  verifiers: Readonly<Verifier[]>,
  signature: Buffer,
) {
  let foundKey = false;
  for (const verifier of verifiers) {
    if (
      (!header.kid || !verifier.kid || verifier.kid === header.kid) &&
      verifier.alg === header.alg
    ) {
      foundKey = true;
      if (verifier.verify(data, signature)) {
        return;
      }
    }
  }
  if (foundKey) {
    throw new Error('signature mismatch');
  } else {
    throw new Error('unknown key or algorithm');
  }
}

const enc = (o: unknown) => Buffer.from(JSON.stringify(o), 'utf-8').toString('base64url');
const dec = (s: string) => {
  const r = JSON.parse(Buffer.from(s, 'base64url').toString('utf-8'));
  if (!r || typeof r !== 'object' || Array.isArray(r)) {
    throw new Error('unexpected JWT content');
  }
  return r;
};

const asArray = <T>(value: MaybeArray<T>): Readonly<T[]> =>
  Array.isArray(value) ? value : [value as T];
