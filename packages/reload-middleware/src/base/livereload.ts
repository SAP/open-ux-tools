import { createServer } from 'livereload';
import type { RequestHandler } from 'express';
import connectLivereload from 'connect-livereload';
import type { LiveReloadOptions, HttpsOptions, ConnectLivereloadOptions } from './types';
import { getAvailablePort } from './utils';
import { ToolsLogger } from '@sap-ux/logger';
import { promises } from 'fs';

const defaultLiveReloadOpts: LiveReloadOptions = {
    exts: [
        'html',
        'js',
        'ts',
        'json',
        'xml',
        'properties',
        'change',
        'variant',
        'ctrl_variant',
        'ctrl_variant_change',
        'ctrl_variant_management_change'
    ]
};

const defaultConnectLivereloadOpts: ConnectLivereloadOptions = {
    port: 35729,
    include: [/.*\.html/]
};

export const getLivereloadServer = async (
    options: LiveReloadOptions,
    https: HttpsOptions | undefined,
    logger: ToolsLogger = new ToolsLogger()
) => {
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

export const getConnectLivereload = (options: ConnectLivereloadOptions): RequestHandler => {
    return connectLivereload({ ...defaultConnectLivereloadOpts, ...options }) as RequestHandler;
};
