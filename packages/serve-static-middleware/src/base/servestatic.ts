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

    // For compatibility reasons also serve srcPath w/o '/resources'
    paths.forEach(pathConfig=> {
        if (pathConfig.path.startsWith('/resources')) {
            const compatibilityPath = {
                ...pathConfig,
                path: pathConfig.path.replace('/resources', '')
            };
            paths.push(compatibilityPath);
        }
    })

    for (const pathConfig of paths) {
        const localOptions = resolveServeStaticOptions(pathConfig);
        const serveStaticOptions = { ...globalOptions, ...localOptions };
        const srcPath = resolveSrcPath(root, pathConfig.src);

        // Create the serve-static instance for this specific path
        const fileServer = serveStatic(srcPath, serveStaticOptions);

        logger.info(
            `Serving path ${pathConfig.path} locally from ${srcPath} with configuration ${JSON.stringify(
                serveStaticOptions
            )}`
        );

        // Use a custom handler to rewrite the URL before serving the file
        router.use(pathConfig.path, (req, res, next) => {
            if (!pathConfig.keepCacheBusterInUrl) {
                const cacheBusterRegex = /\/~[0-9A-F]{32}~\d+\//;
                if (cacheBusterRegex.test(req.url)) {
                    req.url = req.url.replace(cacheBusterRegex, '/');
                }
            }
            fileServer(req, res, next);
        });
    }

    return router;
};
