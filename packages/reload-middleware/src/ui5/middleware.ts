import {
    getLivereloadServer,
    getConnectLivereload,
    defaultLiveReloadOpts,
    defaultConnectLivereloadOpts
} from '../base';
import type { ReloaderConfig, HttpsOptions } from '../base';
import type { MiddlewareParameters } from '@ui5/server';
import type { RequestHandler } from 'express';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import { resolve } from 'path';
import { watchManifestChanges } from '../base/livereload';

module.exports = async ({ options, middlewareUtil }: MiddlewareParameters<ReloaderConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'reload-middleware' })]
    });
    const rootPath = middlewareUtil.getProject().getRootPath();
    const sourcePath = middlewareUtil.getProject().getSourcePath();
    let httpsOpts: HttpsOptions = {
        key: process.env.FIORI_TOOLS_SSL_KEY,
        cert: process.env.FIORI_TOOLS_SSL_CERT
    };
    if (options.configuration) {
        const { path, https, connectOptions, ...liveReloadOptions } = options.configuration;

        if (https?.key && https?.cert) {
            httpsOpts = https;
        }
        const livereloadServer = await getLivereloadServer(liveReloadOptions, httpsOpts, logger);
        const livereloadPort = livereloadServer.config.port;

        if (Array.isArray(path)) {
            const watchPaths = path.map((localPath) => resolve(rootPath, localPath));
            logger.info(`Livereload server started on port ${livereloadPort} for paths ${watchPaths}`);
            livereloadServer.watch(watchPaths);
        } else {
            const watchPath = path ? resolve(rootPath, path) : sourcePath;
            logger.info(`Livereload server started on port ${livereloadPort} for path ${watchPath}`);
            livereloadServer.watch(watchPath);
        }
        watchManifestChanges(livereloadServer);

        return await getConnectLivereload({ ...defaultConnectLivereloadOpts, ...connectOptions, port: livereloadPort });
    } else {
        const message = 'No configuration found for the reload-middleware, using default configuration.';
        logger.info(message);
        const livereloadServer = await getLivereloadServer(defaultLiveReloadOpts, httpsOpts, logger);
        const livereloadPort = livereloadServer.config.port;
        logger.info(`Livereload server started on port ${livereloadPort} for path ${sourcePath}`);
        livereloadServer.watch(sourcePath);
        watchManifestChanges(livereloadServer);

        return await getConnectLivereload({ ...defaultConnectLivereloadOpts, port: livereloadPort });
    }
};
