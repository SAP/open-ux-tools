import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { RequestHandler } from 'express';
import type { MiddlewareParameters, MiddlewareUtils } from '@ui5/server';
import { FlpSandbox } from '../base/flp';
import type { AdpPreviewConfig } from '@sap-ux/adp-tooling';
import type { Config } from '../types';
import { AdpPreview } from '@sap-ux/adp-tooling';
import type { ReaderCollection } from '@ui5/fs';

/**
 * Initialize the preview for an adaptation project.
 *
 * @param rootProject reference to the project
 * @param config configuration from the ui5.yaml
 * @param flp FlpSandbox instance
 * @param util middleware utilities provided by the UI5 CLI
 * @param logger logger instance
 */
async function initAdp(
    rootProject: ReaderCollection,
    config: AdpPreviewConfig,
    flp: FlpSandbox,
    util: MiddlewareUtils,
    logger: ToolsLogger
) {
    const appVariant = await rootProject.byPath('/manifest.appdescr_variant');
    if (appVariant) {
        const adp = new AdpPreview(config, rootProject, util, logger);
        const layer = await adp.init(JSON.parse(await appVariant.getString()));
        flp.config.rta = {
            layer,
            pluginModule: 'open/ux/preview/client/adp/init'
        };
        await flp.init(adp.descriptor.manifest, adp.descriptor.name, adp.resources);
        flp.router.use(adp.descriptor.url, adp.proxy.bind(adp) as RequestHandler);
        adp.addApis(flp.router);
    } else {
        throw new Error('ADP configured but no manifest.appdescr_variant found.');
    }
}

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

    if (config.adp) {
        await initAdp(resources.rootProject, config.adp, flp, middlewareUtil, logger);
    } else {
        const manifest = await resources.rootProject.byPath('/manifest.json');
        if (manifest) {
            await flp.init(JSON.parse(await manifest.getString()));
        } else {
            throw new Error('No manifest.json found.');
        }
    }
    // add exposed endpoints for cds-plugin-ui5
    flp.router.getAppPages = () => [`${flp.config.path}#${flp.config.intent.object}-${flp.config.intent.action}`];
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
