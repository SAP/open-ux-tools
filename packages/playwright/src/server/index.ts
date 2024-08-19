import { setup, teardown } from 'jest-dev-server';
import type { Config } from 'jest-dev-server';

let server: ReturnType<typeof setup>;

/**
 * Start server.
 *
 * @param parma Server configuration
 * @returns server instance
 */
const startServer = (parma: Config): ReturnType<typeof setup> => {
    server = setup(parma);
    return server;
};

/**
 * Teardown server.
 */
const teardownServer = async () => {
    await teardown(await server);
};

export { startServer, teardownServer };
