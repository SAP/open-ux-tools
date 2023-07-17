import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { RequestHandler } from 'express';
import type { MiddlewareParameters } from '@ui5/server';
import { FlpSandbox } from '../base/flp';
import type { Config } from '../types';

/**
 * Create the router that is to be exposed as UI5 middleware.
 *
 * @param param0 parameters provider by UI5
 * @param param0.resources reference to resources
 * @param param0.options options and configurations from the ui5.yaml
 * @param param0.middlewareUtil additional UI5 CLI utilities
 * @param logger logger instance
 * @returns a router
 */
async function createRouter({ resources, options, middlewareUtil }: MiddlewareParameters<Config>, logger: ToolsLogger) {
    // setting defaults
    const config = options.configuration ?? {};
    config.flp ??= {};

    // configure the FLP sandbox based on information from the manifest
    const flp = new FlpSandbox(config.flp, resources.rootProject, middlewareUtil, logger);
    const files = await resources.rootProject.byGlob('/manifest.json');
    if (files.length === 1) {
        await flp.init(JSON.parse(await files[0].getString()));
    } else {
        throw new Error('No manifest.json found.');
    }

    return flp.router;
}

/**
 * Exporting the middleware for usage in the UI5 tooling.
 *
 * @param params middleware configuration
 * @returns a promise for the request handler
 */
module.exports = async (params: MiddlewareParameters<Config>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'preview-middleware' })],
        logLevel: params.options.configuration?.debug ? LogLevel.Debug : LogLevel.Info
    });
    try {
        return await createRouter(params, logger);
    } catch (error) {
        logger.error('Could not start preview-middleware.');
        logger.error(error.message);
        throw error;
    }
};
