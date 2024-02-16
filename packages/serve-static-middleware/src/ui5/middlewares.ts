import { serveStaticMiddleware } from '../base';
import type { ServeStaticOptions } from 'serve-static';
import type { ServeStaticConfig, PathConfig } from '../base';
import type { MiddlewareParameters } from '@ui5/server';
import type { RequestHandler } from 'express';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import { relative, isAbsolute, join } from 'path';

/**
 * Resolves the serve static options from a configuration object.
 *
 * @param options configuration object
 * @returns resolved serve static options
 */
function resolveServeStaticOptions(options: ServeStaticConfig | PathConfig): ServeStaticOptions {
    return Object.fromEntries(
        Object.entries(options).filter(([key]) => {
            return key !== 'paths' && key !== 'setHeaders' && key !== 'src' && key !== 'path';
        })
    );
}
/**
 * Creates a function handling the routes that need to be served static.
 *
 * @param routes routes that need to be handled
 * @returns handler function
 */
function createRequestHandler(routes: { route: string; handler: RequestHandler }[]): RequestHandler {
    return (req, res, next): void => {
        for (const route of routes) {
            if (req.path.startsWith(route.route)) {
                route.handler(req, res, next);
                return;
            }
        }
        next();
    };
}
/**
 * If a relative src path is provided in the configuration, it is resolved based on the current working directory.
 *
 * @param rootPath path to the root folder of the project
 * @param srcPath path to the source folder from which to serve files
 * @returns path to the source folder from which to serve files
 */
function resolveSrcPath(rootPath: string, srcPath: string): string {
    return isAbsolute(srcPath) ? srcPath : relative(process.cwd(), join(rootPath, srcPath));
}

module.exports = ({ options, middlewareUtil }: MiddlewareParameters<ServeStaticConfig>): RequestHandler => {
    const log = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'serve-static-middleware' })]
    });
    const rootPath = middlewareUtil.getProject().getRootPath();
    const configuration = options.configuration;
    const routes: { route: string; handler: RequestHandler }[] = [];

    if (configuration) {
        const paths = configuration.paths;
        const globalOptions: ServeStaticOptions = resolveServeStaticOptions(configuration);

        for (const pathConfig of paths) {
            const localOptions = resolveServeStaticOptions(pathConfig);
            const serveStaticOptions = Object.assign({}, globalOptions, localOptions);
            const srcPath = resolveSrcPath(rootPath, pathConfig.src);

            log.info(
                `Serving path ${pathConfig.path} locally from ${srcPath} with configuration ${JSON.stringify(
                    serveStaticOptions
                )}`
            );
            routes.push({ route: pathConfig.path, handler: serveStaticMiddleware(srcPath, serveStaticOptions) });
        }
    } else {
        const message = 'No configuration found for the serve-static-middleware';
        log.error(message);
        throw new Error(message);
    }

    return createRequestHandler(routes);
};
