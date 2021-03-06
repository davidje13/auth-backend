import type express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

export function addressToString(addr: AddressInfo | string): string {
  if (typeof addr === 'string') {
    return addr;
  }
  const { address, family, port } = addr;
  const host = (family === 'IPv6') ? `[${address}]` : address;
  return `http://${host}:${port}`;
}

export default (
  serverFn: () => (express.Express | Promise<express.Express>),
): Server => {
  let server: Server | null;

  beforeEach((done) => {
    server = null;
    Promise.resolve(serverFn())
      .then((rawServer) => {
        server = rawServer.listen(0, 'localhost', done);
      })
      .catch((e) => done.fail(e));
  });

  afterEach((done) => {
    if (server) {
      const tempServer = server;
      server = null;
      tempServer.close(done);
    } else {
      done();
    }
  });

  return new Proxy({}, {
    get: (o, prop: keyof Server): any => server![prop],
  }) as Readonly<Server>;
};
