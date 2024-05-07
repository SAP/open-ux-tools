import { createServer } from 'livereload';
import type { LiveReloadServer } from 'livereload';
import type { RequestHandler } from 'express';
import connectLivereload from 'connect-livereload';
import type { LiveReloadOptions, HttpsOptions, ConnectLivereloadOptions } from './types';
import { getAvailablePort } from './utils';
import { ToolsLogger } from '@sap-ux/logger';
import { isAppStudio, exposePort } from '@sap-ux/btp-utils';
import { promises } from 'fs';
import { defaultLiveReloadOpts, defaultConnectLivereloadOpts } from './constants';

/**
 * Get a livereload server instance.
 *
 * @param options - Livereload server options
 * @param https - HTTPS options
 * @param logger - Logger instance for logging output
 * @returns A promise that resolves with the livereload server instance
 */
export const getLivereloadServer = async (
    options: LiveReloadOptions,
    https?: HttpsOptions,
    logger: ToolsLogger = new ToolsLogger()
): Promise<LiveReloadServer> => {
    options.port = await getAvailablePort(options.port ?? 35729, logger);

    if (https?.key && https.cert) {
        options.https = {
            key: await promises.readFile(https.key, 'utf8'),
            cert: await promises.readFile(https.cert, 'utf8')
        };
    }

    const livereload = createServer({ ...defaultLiveReloadOpts, ...options });
    // Set the livereload port as an environment variable to be used by the preview middleware
    process.env.FIORI_TOOLS_LIVERELOAD_PORT = livereload.config.port?.toString();

    return livereload;
};

/**
 * Get a connect-livereload instance.
 *
 * @param options - Connect-Livereload options
 * @returns A connect-livereload instance
 */
export const getConnectLivereload = async (options: ConnectLivereloadOptions): Promise<RequestHandler> => {
    let connectOpts = defaultConnectLivereloadOpts;
    if (isAppStudio()) {
        const url = await exposePort(options.port ?? 35729);
        const src = `${url}livereload.js?snipver=1&port=443`;
        connectOpts = { ...connectOpts, src };
    }

    return connectLivereload({ ...connectOpts, ...options }) as RequestHandler;
};
