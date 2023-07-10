import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { RequestHandler } from 'express';
import type { MiddlewareParameters } from '@ui5/server';
import { FlpSandbox } from '../base/flp';
import { Config } from '../types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Router, static as serveStatic } from 'express';

/**
 *
 * @param param0
 * @param logger
 * @returns
 */
async function createRouter({ resources, options }: MiddlewareParameters<Config>, logger: ToolsLogger) {
    // setting defaults
    const config = options.configuration ?? {};
    config.flp ??= {};
    config.flp.path ??= '/test/flpSandbox.html';
    config.flp.apps ??= [];

    // configure the FLP sandbox based on information from the manifest
    const flp = new FlpSandbox(config.flp, resources.rootProject);
    const files = await resources.rootProject.byGlob('/manifest.json');
    if (files.length === 1) {
        flp.init(JSON.parse(await files[0].getString()));
    } else {
        throw new Error('No manifest.json found.');
    }

    // allow adding further applications for testing app to app navigation
    const router = Router();
    router.use(flp.proxy.bind(flp));

    for (const app of config.flp.apps) {
        if (app.local) {
            const manifest = JSON.parse(readFileSync(join(app.local, 'webapp/manifest.json'), 'utf-8'));
            flp.addApp(manifest, app);
            router.use(app.target, serveStatic(join(app.local, 'webapp')));
            logger.info(`Serving additional application at ${app.target} from ${app.local}`);
        }
    }
    return router;
}

/**
 * Exporting the middleware for usage in the UI5 tooling
 */
module.exports = async ({ resources, options }: MiddlewareParameters<Config>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'preview-middleware' })]
    });
    try {
        return await createRouter({ resources, options }, logger);
    } catch (error) {
        logger.error('Could not start preview-middleware.');
        logger.error(error.message);
        throw error;
    }
};
