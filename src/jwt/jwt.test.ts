import type { Signer, Verifier } from './algorithms';
import { decodeJWT, encodeJWT, type DecodeOptions } from './jwt';
import 'lean-test';

describe('encodeJWT', () => {
  it('encodes and signs payload data using the given Signer', () => {
    const key: Signer = {
      kid: undefined,
      alg: 'alg',
      sign: (data) => Buffer.from('signature for ' + data, 'utf-8'),
    };
    const jwt = encodeJWT(key, { foo: 'bar' });
    expect(jwt).equals(
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJhbGcifQ.eyJmb28iOiJiYXIifQ.c2lnbmF0dXJlIGZvciBleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpoYkdjaWZRLmV5Sm1iMjhpT2lKaVlYSWlmUQ',
    );
  });

  it('allows setting custom header values', () => {
    const key: Signer = {
      kid: undefined,
      alg: 'alg',
      sign: () => Buffer.from('signature', 'utf-8'),
    };
    const jwt = encodeJWT(key, {}, { extra: 'thing' });
    expect(jwt).equals('eyJ0eXAiOiJKV1QiLCJhbGciOiJhbGciLCJleHRyYSI6InRoaW5nIn0.e30.c2lnbmF0dXJl');
  });

  it('includes the key ID if given', () => {
    const key: Signer = {
      kid: 'my-key-id',
      alg: 'alg',
      sign: () => Buffer.from([]),
    };
    const jwt = encodeJWT(key, {});
    expect(jwt).equals('eyJ0eXAiOiJKV1QiLCJraWQiOiJteS1rZXktaWQiLCJhbGciOiJhbGcifQ.e30.');
  });

  it('uses base64url encoding', () => {
    const key: Signer = {
      kid: undefined,
      alg: 'alg',
      sign: () => Buffer.from([0xff, 0xff, 0xff]),
    };
    const jwt = encodeJWT(key, { value: '~~~~~~' });
    expect(jwt).equals('eyJ0eXAiOiJKV1QiLCJhbGciOiJhbGcifQ.eyJ2YWx1ZSI6In5-fn5-fiJ9.____');
  });
});

describe('decodeJWT', () => {
  it('extracts the header and payload from the token', () => {
    const parts = decodeJWT('eyJ0eXAiOiJKV1QiLCJhbGciOiJhbGcifQ.eyJmb28iOiJiYXIifQ.', NO_VERIFY);
    expect(parts.header).equals({ typ: 'JWT', alg: 'alg' });
    expect(parts.payload).equals({ foo: 'bar' });
  });

  it('rejects invalid tokens', () => {
    expect(() => decodeJWT('nope', NO_VERIFY)).throws('invalid JWT');
    expect(() => decodeJWT('nope.nope', NO_VERIFY)).throws('invalid JWT');
    expect(() => decodeJWT('..', NO_VERIFY)).throws('invalid JWT');
    expect(() => decodeJWT('@.@.@', NO_VERIFY)).throws('invalid JWT');
    expect(() => decodeJWT(`${VALID_HEADER}.${b64('{')}.`, NO_VERIFY)).throws(
      'Expected property name',
    );
    expect(() => decodeJWT(`${VALID_HEADER}.${b64('[]')}.`, NO_VERIFY)).throws(
      'unexpected JWT content',
    );
    expect(() => decodeJWT(`${VALID_HEADER}.${b64('null')}.`, NO_VERIFY)).throws(
      'unexpected JWT content',
    );
    expect(() => decodeJWT(`${VALID_HEADER}.${b64('"foo"')}.`, NO_VERIFY)).throws(
      'unexpected JWT content',
    );
  });

  it('verifies signature if requested', () => {
    const key: Verifier = {
      kid: undefined,
      alg: 'foo',
      verify: (_, signature) => signature.toString('base64url') === 'abcd',
    };
    const opts = { ...NO_VERIFY, verifyKey: key };

    decodeJWT(b64('{"alg":"foo"}') + '.' + b64('{}') + '.abcd', opts);

    expect(() => decodeJWT(b64('{"alg":"foo"}') + '.' + b64('{}') + '.efgh', opts)).throws(
      'signature mismatch',
    );

    expect(() => decodeJWT(b64('{"alg":"other"}') + '.' + b64('{}') + '.efgh', opts)).throws(
      'unknown key or algorithm',
    );
  });

  it('does not allow arbitrary algorithms when verifying', () => {
    const key: Verifier = {
      kid: undefined,
      alg: 'foo',
      verify: (_, signature) => signature.toString('base64url') === 'abcd',
    };
    const opts = { ...NO_VERIFY, verifyKey: key };

    expect(() => decodeJWT(b64('{"alg":"none"}') + '.' + b64('{}') + '.', opts)).throws(
      'unknown key or algorithm',
    );
  });

  it('uses kid when verifying signature', () => {
    const key: Verifier = {
      kid: 'my-key-id',
      alg: 'foo',
      verify: (_, signature) => signature.toString('base64url') === 'abcd',
    };
    const opts = { ...NO_VERIFY, verifyKey: key };

    decodeJWT(b64('{"alg":"foo","kid":"my-key-id"}') + '.' + b64('{}') + '.abcd', opts);
    decodeJWT(b64('{"alg":"foo"}') + '.' + b64('{}') + '.abcd', opts);

    expect(() =>
      decodeJWT(b64('{"alg":"foo","kid":"other"}') + '.' + b64('{}') + '.abcd', opts),
    ).throws('unknown key or algorithm');
  });

  it('supports multiple keys for signature verification', () => {
    const key1: Verifier = {
      kid: 'k1',
      alg: 'foo',
      verify: (_, signature) => signature.toString('base64url') === 'abcd',
    };
    const key2: Verifier = {
      kid: 'k2',
      alg: 'foo',
      verify: (_, signature) => signature.toString('base64url') === 'efgh',
    };
    const opts = { ...NO_VERIFY, verifyKey: [key1, key2] };

    decodeJWT(b64('{"alg":"foo","kid":"k1"}') + '.' + b64('{}') + '.abcd', opts);
    decodeJWT(b64('{"alg":"foo","kid":"k2"}') + '.' + b64('{}') + '.efgh', opts);
    decodeJWT(b64('{"alg":"foo"}') + '.' + b64('{}') + '.efgh', opts);

    expect(() =>
      decodeJWT(b64('{"alg":"foo","kid":"other"}') + '.' + b64('{}') + '.abcd', opts),
    ).throws('unknown key or algorithm');

    expect(() =>
      decodeJWT(b64('{"alg":"foo","kid":"k1"}') + '.' + b64('{}') + '.efgh', opts),
    ).throws('signature mismatch');

    expect(() => decodeJWT(b64('{"alg":"foo"}') + '.' + b64('{}') + '.nope', opts)).throws(
      'signature mismatch',
    );
  });

  it('verifies issuer if requested', () => {
    const jwt = `${VALID_HEADER}.${b64('{"iss":"one"}')}.`;
    decodeJWT(jwt, { ...NO_VERIFY, verifyIss: 'one' });
    decodeJWT(jwt, { ...NO_VERIFY, verifyIss: ['one', 'two'] });
    decodeJWT(jwt, { ...NO_VERIFY, verifyIss: ['two', 'one'] });
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyIss: 'two' })).throws('issuer mismatch');
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyIss: ['a', 'b'] })).throws('issuer mismatch');
  });

  it('verifies audience if requested', () => {
    const jwt = `${VALID_HEADER}.${b64('{"aud":"one"}')}.`;
    decodeJWT(jwt, { ...NO_VERIFY, verifyAud: 'one' });
    decodeJWT(jwt, { ...NO_VERIFY, verifyAud: ['one', 'two'] });
    decodeJWT(jwt, { ...NO_VERIFY, verifyAud: ['two', 'one'] });
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyAud: 'two' })).throws('audience mismatch');
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyAud: ['a', 'b'] })).throws(
      'audience mismatch',
    );
  });

  it('supports multiple audiences in token', () => {
    const jwt = `${VALID_HEADER}.${b64('{"aud":["a","b"]}')}.`;
    decodeJWT(jwt, { ...NO_VERIFY, verifyAud: 'a' });
    decodeJWT(jwt, { ...NO_VERIFY, verifyAud: 'b' });
    decodeJWT(jwt, { ...NO_VERIFY, verifyAud: ['a', 'c'] });
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyAud: 'c' })).throws('audience mismatch');
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyAud: ['c', 'd'] })).throws(
      'audience mismatch',
    );
  });

  it('verifies nbf and exp if requested', () => {
    const jwt = `${VALID_HEADER}.${b64('{"nbf":1,"exp":3}')}.`;
    decodeJWT(jwt, { ...NO_VERIFY, verifyActive: 1000 });
    decodeJWT(jwt, { ...NO_VERIFY, verifyActive: 2999 });
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyActive: 0 })).throws('not yet valid');
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyActive: 999 })).throws('not yet valid');
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyActive: 3000 })).throws('expired');
    expect(() => decodeJWT(jwt, { ...NO_VERIFY, verifyActive: 4000 })).throws('expired');

    decodeJWT(`${VALID_HEADER}.${b64('{"nbf":1}')}.`, { ...NO_VERIFY, verifyActive: 4000 });
    decodeJWT(`${VALID_HEADER}.${b64('{"exp":3}')}.`, { ...NO_VERIFY, verifyActive: 0 });
  });
});

const b64 = (v: string) => Buffer.from(v, 'utf-8').toString('base64url');

const NO_VERIFY: DecodeOptions = {
  verifyKey: false,
  verifyIss: false,
  verifyAud: false,
  verifyActive: false,
};
const VALID_HEADER = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJhbGcifQ';
