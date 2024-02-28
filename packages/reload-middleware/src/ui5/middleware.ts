import { getLivereloadServer, getConnectLivereload } from '../base';
import type { ReloaderConfig, HttpsOptions } from '../base';
import type { MiddlewareParameters } from '@ui5/server';
import type { RequestHandler } from 'express';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import { join } from 'path';

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
            const watchPaths = path.map((localPath) => join(rootPath, localPath));
            livereloadServer.watch(watchPaths);
        } else {
            const watchPath = path ? join(rootPath, path) : sourcePath;
            livereloadServer.watch(watchPath);
        }

        return getConnectLivereload({ ...connectOptions, port: livereloadPort });
    } else {
        const message = 'No configuration found for the reload-middleware';
        logger.error(message);
        throw new Error(message);
    }
};
