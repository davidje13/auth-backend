import {
  encodeJWT,
  decodeJWT,
  RS256,
  HS256,
  loadJWKSVerifiers,
  makeRandomRS256,
} from 'authentication-backend/jwt';

RS256({ kid: undefined, privateKey: '', publicKey: '' });
const rs256 = RS256({ kid: 'my-key', privateKey: '', publicKey: '' });
const hs256 = HS256({ kid: 'my-key', key: '' });
const rs256Signer = RS256.signer({ kid: 'my-key', privateKey: '' });
const rs256Verifier = RS256.verifier({ kid: 'my-key', publicKey: '' });

//@ts-expect-error
RS256({ privateKey: '', publicKey: '' });

//@ts-expect-error
RS256({ kid: undefined, publicKey: '' });

//@ts-expect-error
RS256({ kid: undefined, privateKey: '' });

encodeJWT(rs256, { foo: 'bar' });
encodeJWT(hs256, { foo: 'bar' });
encodeJWT(rs256Signer, { foo: 'bar' });
encodeJWT(rs256, { foo: 'bar' }, { extra: 'things' });

//@ts-expect-error
encodeJWT(rs256Verifier, { foo: 'bar' });

decodeJWT('my.jwt.token', {
  verifyKey: false,
  verifyIss: false,
  verifyAud: false,
  verifyActive: false,
});

decodeJWT('my.jwt.token', {
  verifyKey: rs256,
  verifyIss: 'me',
  verifyAud: 'you',
  verifyActive: true,
});

decodeJWT('my.jwt.token', {
  verifyKey: [rs256, hs256],
  verifyIss: ['me', 'them'],
  verifyAud: ['you', 'yous'],
  verifyActive: Date.now(),
});

decodeJWT('my.jwt.token', {
  verifyKey: rs256Verifier,
  verifyIss: false,
  verifyAud: false,
  verifyActive: false,
});

decodeJWT('my.jwt.token', {
  //@ts-expect-error
  verifyKey: rs256Signer,
  //@ts-expect-error
  verifyIss: true,
  //@ts-expect-error
  verifyAud: true,
  verifyActive: true,
});

const jwk1 = makeRandomRS256('my-key').toJWK();
const jwk2 = rs256.toJWK();

const verifiers = loadJWKSVerifiers([jwk1, jwk2, { kid: 'my-key', alg: 'fooar', use: 'sign' }]);
decodeJWT('my.jwt.token', {
  verifyKey: verifiers,
  verifyIss: false,
  verifyAud: false,
  verifyActive: false,
});

//@ts-expect-error
encodeJWT(verifiers[0], { foo: 'bar' });

//@ts-expect-error
loadJWKSVerifiers([{ kid: 'my-key', alg: 'fooar' }]);

//@ts-expect-error
loadJWKSVerifiers([{ kid: 'my-key', use: 'sign' }]);

//@ts-expect-error
loadJWKSVerifiers([{ alg: 'fooar', use: 'sign' }]);
