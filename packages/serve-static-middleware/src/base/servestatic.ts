import { default as serveStatic } from 'serve-static';
import type { ServeStaticOptions } from 'serve-static';
import type { ServeStaticConfig } from './types';
import { resolveServeStaticOptions, resolveSrcPath } from './utils';
import { ToolsLogger } from '@sap-ux/logger';
import { type RequestHandler, Router } from 'express';

/**
 * Function for serving static files.
 *
 * @param root - project root directory
 * @param config - yaml configuration
 * @param logger - logger
 * @returns a middleware function to serve files
 */
export const serveStaticMiddleware = (
    root: string,
    config: ServeStaticConfig,
    logger: ToolsLogger = new ToolsLogger()
): RequestHandler => {
    const paths = config.paths;
    const globalOptions: ServeStaticOptions = resolveServeStaticOptions(config);
    const router = Router();

    for (const pathConfig of paths) {
        const localOptions = resolveServeStaticOptions(pathConfig);
        const serveStaticOptions = { ...globalOptions, ...localOptions };
        const srcPath = resolveSrcPath(root, pathConfig.src);

        logger.info(
            `Serving path ${pathConfig.path} locally from ${srcPath} with configuration ${JSON.stringify(
                serveStaticOptions
            )}`
        );
        router.use(pathConfig.path, serveStatic(srcPath, serveStaticOptions));
    }

    return router;
};
