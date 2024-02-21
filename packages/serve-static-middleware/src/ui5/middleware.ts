import { serveStaticMiddleware } from '../base';
import type { ServeStaticConfig } from '../base';
import type { MiddlewareParameters } from '@ui5/server';
import type { RequestHandler } from 'express';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

module.exports = ({ options, middlewareUtil }: MiddlewareParameters<ServeStaticConfig>): RequestHandler => {
    const log = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'serve-static-middleware' })]
    });
    const rootPath = middlewareUtil.getProject().getRootPath();
    const configuration = options.configuration;

    if (configuration?.paths) {
        return serveStaticMiddleware(rootPath, configuration, log);
    } else {
        const message = 'No configuration found for the serve-static-middleware';
        log.error(message);
        throw new Error(message);
    }
};
