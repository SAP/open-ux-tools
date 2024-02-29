import { createServer } from 'livereload';
import type { LiveReloadServer } from 'livereload';
import type { RequestHandler, Request, Response, NextFunction } from 'express';
import connectLivereload from 'connect-livereload';
import type { LiveReloadOptions, HttpsOptions, ConnectLivereloadOptions } from './types';
import { getAvailablePort } from './utils';
import { ToolsLogger } from '@sap-ux/logger';
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
    https: HttpsOptions | undefined,
    logger: ToolsLogger = new ToolsLogger()
): Promise<LiveReloadServer> => {
    options.port = await getAvailablePort(options.port ?? 35729, logger);

    if (https?.key && https?.cert) {
        options.https = {
            key: await promises.readFile(https.key),
            cert: await promises.readFile(https.cert)
        };
    }

    const livereload = createServer({ ...defaultLiveReloadOpts, ...options });

    return livereload;
};

/**
 * Get a connect-livereload instance.
 *
 * @param options - Connect-Livereload options
 * @returns A connect-livereload instance
 */
export const getConnectLivereload = (options: ConnectLivereloadOptions): RequestHandler => {
    if (options.disabled) {
        return (_req: Request, _res: Response, next: NextFunction) => next();
    } else {
        return connectLivereload({ ...defaultConnectLivereloadOpts, ...options }) as RequestHandler;
    }
};
