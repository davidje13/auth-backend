import type { Server } from 'node:http';
import type { TypedParameter, TypedParameters } from 'lean-test';
import { WebListener } from 'web-listener';

type MaybePromise<T> = Promise<T> | T;

// TODO: supertest fails with IPv6 addresses, so we force 127.0.0.1 instead of localhost

export function testServerRunner(
  serverFn: (opts: TypedParameters) => MaybePromise<WebListener | Server>,
): TypedParameter<Server> {
  return beforeEach<Server>(async (opts) => {
    const app = await serverFn(opts);
    if (app instanceof WebListener) {
      const server = await app.listen(0, '127.0.0.1');
      opts.setParameter(server);
      return () => server.closeWithTimeout('end of test', 0);
    }
    await new Promise<void>((resolve) => app.listen(0, '127.0.0.1', resolve));
    opts.setParameter(app);
    return () =>
      new Promise((resolve, reject) => app.close((err) => (err ? reject(err) : resolve())));
  });
}
