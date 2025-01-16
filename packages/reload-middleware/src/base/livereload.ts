import { createServer } from 'livereload';
import type { LiveReloadServer } from 'livereload';
import type { RequestHandler } from 'express';
import connectLivereload from 'connect-livereload';
import type { LiveReloadOptions, HttpsOptions, ConnectLivereloadOptions } from './types';
import { getAvailablePort } from './utils';
import { ToolsLogger } from '@sap-ux/logger';
import { isAppStudio, exposePort } from '@sap-ux/btp-utils';
import { promises } from 'fs';
import { extname } from 'path';
import { defaultLiveReloadOpts, defaultConnectLivereloadOpts } from './constants';

declare global {
    // false positive, const can't be used here https://github.com/eslint/eslint/issues/15896
    // eslint-disable-next-line no-var
    var __SAP_UX_MANIFEST_SYNC_REQUIRED__: boolean | undefined;
}

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

/**
 * Listen to file changes to set a global flag if there are any changes that affect manifest.json.
 *
 * @param livereload - Live reload server.
 */
export function watchManifestChanges(livereload: LiveReloadServer): void {
    livereload.watcher.on('all', async (_event, path) => {
        const fileExtension = extname(path);
        if (fileExtension === '.appdescr_variant') {
            global.__SAP_UX_MANIFEST_SYNC_REQUIRED__ = true;
        } else if (fileExtension === '.change') {
            if (
                path.endsWith('appdescr_fe_changePageConfiguration.change') ||
                path.endsWith('appdescr_ui_generic_app_changePageConfiguration.change') ||
                path.endsWith('appdescr_ui_gen_app_changePageConfig.change') ||
                path.endsWith('appdescr_app_addAnnotationsToOData.change')
            ) {
                global.__SAP_UX_MANIFEST_SYNC_REQUIRED__ = true;
            }
        }
    });
}
