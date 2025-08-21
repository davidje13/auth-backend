import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type express from 'express';
import type { TypedParameter, TypedParameters } from 'lean-test';

type MaybePromise<T> = Promise<T> | T;

export function addressToString(addr: AddressInfo | string): string {
  if (typeof addr === 'string') {
    return addr;
  }
  const { address, family, port } = addr;
  const host = family === 'IPv6' ? `[${address}]` : address;
  return `http://${host}:${port}`;
}

export function testServerRunner(
  serverFn: (opts: TypedParameters) => MaybePromise<express.Express>,
): TypedParameter<Server> {
  return beforeEach<Server>(async (opts) => {
    const app = await serverFn(opts);
    let server: Server;
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', (err) =>
        err ? reject(err) : resolve(),
      );
    });
    opts.setParameter(server!);
    return () =>
      new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
  });
}
