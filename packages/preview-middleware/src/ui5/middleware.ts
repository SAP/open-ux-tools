import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { RequestHandler } from 'express';
import type { MiddlewareParameters } from '@ui5/server';
import { type EnhancedRouter, FlpSandbox, initAdp } from '../base/flp';
import type { MiddlewareConfig } from '../types';
import { getPreviewPaths, sanitizeConfig } from '../base/config';
import { getRemoteUrl, isRemoteConnectionsEnabled } from '../base/remote-url';
import * as QRCode from 'qrcode';

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
async function createRouter(
    { resources, options, middlewareUtil }: MiddlewareParameters<MiddlewareConfig>,
    logger: ToolsLogger
): Promise<EnhancedRouter> {
    // setting defaults
    const config = (options.configuration as MiddlewareConfig) ?? {};
    config.flp ??= {};
    sanitizeConfig(config, logger);

    // configure the FLP sandbox based on information from the manifest
    const flp = new FlpSandbox(config, resources.rootProject, middlewareUtil, logger);

    if (config.adp) {
        await initAdp(resources.rootProject, config.adp, flp, middlewareUtil, logger);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const manifest = await resources.rootProject.byPath('/manifest.json');
        if (manifest) {
            await flp.init(JSON.parse(await manifest.getString()));
        } else {
            throw new Error('No manifest.json found.');
        }
    }
    // add exposed endpoints for cds-plugin-ui5
    flp.router.getAppPages = (): string[] => getPreviewPaths(config).map(({ path }) => path);
    return flp.router;
}

/**
 * Log remote URL for mobile device access.
 *
 * @param logger Logger instance
 */
async function logRemoteUrl(logger: ToolsLogger): Promise<void> {
    try {
        const remoteUrl = await getRemoteUrl(logger);

        const generateQRCode = async (text: string): Promise<void> => {
            try {
                const qrString = await QRCode.toString(text, { type: 'terminal', small: true });
                logger.info(qrString);
            } catch (err) {
                logger.error(err);
            }
        };

        if (remoteUrl) {
            logger.info(`Remote URL: ${remoteUrl}`);
            logger.info('Scan the QR code below with your mobile device to access the preview:');
            await generateQRCode(remoteUrl);
        }
    } catch (error) {
        logger.debug(`Could not generate remote URL: ${error.message}`);
    }
}

/**
 * Exporting the middleware for usage in the UI5 tooling.
 *
 * @param params middleware configuration
 * @returns a promise for the request handler
 */
module.exports = async (params: MiddlewareParameters<MiddlewareConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'preview-middleware' })],
        logLevel: params.options.configuration?.debug ? LogLevel.Debug : LogLevel.Info
    });
    try {
        const router = await createRouter(params, logger);

        if (isRemoteConnectionsEnabled()) {
            await logRemoteUrl(logger);
        }

        return router;
    } catch (error) {
        logger.error('Could not start preview-middleware.');
        logger.error(error.message);
        throw error;
    }
};
