import fs from 'node:fs';
import dotenv from 'dotenv';
import path from 'node:path';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareParameters } from '@ui5/server';
import type { RequestHandler, Request, Response, NextFunction } from 'express';

import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

import { nextFreePort } from './utils';
import { createProxy } from './proxy/proxy';
import { startApprouter } from './approuter/approuter';
import { loadExtensions } from './approuter/extensions';
import { mergeEffectiveOptions } from './config/config';
import { updateXsuaaService } from './platform/xssecurity';
import type { BackendProxyMiddlewareCfConfig } from './types';
import { fetchBasUrlTemplate, resolveBasExternalUrl } from './platform/bas';
import { buildRouteEntries, loadAndPrepareXsappConfig } from './proxy/routes';
import { loadAndApplyEnvOptions, updateUi5ServerDestinationPort } from './config/env';

dotenv.config();

/**
 * UI5 server middleware: runs `@sap/approuter` and proxies matching requests to it.
 * Uses lazy initialization to detect the actual UI5 server port from the first request,
 * enabling multi-instance support where hardcoded ports in ui5.yaml may differ from runtime.
 *
 * @param params - Middleware parameters from UI5 (options, middlewareUtil).
 * @param params.options - Options containing configuration from ui5.yaml.
 * @param params.middlewareUtil - UI5 middleware utilities (getProject, etc.).
 * @returns Promise resolving to the proxy request handler.
 */
async function backendProxyMiddlewareCf({
    options,
    middlewareUtil
}: MiddlewareParameters<BackendProxyMiddlewareCfConfig>): Promise<RequestHandler> {
    const configuration = options.configuration;
    if (!configuration) {
        throw new Error('Backend proxy middleware (CF) has no configuration.');
    }

    const logger = new ToolsLogger({
        logLevel: configuration.debug ? LogLevel.Debug : LogLevel.Info,
        transports: [new UI5ToolingTransport({ moduleName: 'backend-proxy-middleware-cf' })]
    });

    const effectiveOptions = mergeEffectiveOptions(configuration);

    process.env.WS_ALLOWED_ORIGINS = process.env.WS_ALLOWED_ORIGINS ?? JSON.stringify([{ host: 'localhost' }]);
    process.env.XS_APP_LOG_LEVEL = process.env.XS_APP_LOG_LEVEL ?? (effectiveOptions.debug ? 'DEBUG' : 'ERROR');

    const project = middlewareUtil.getProject();
    const rootPath = project.getRootPath() ?? process.cwd();
    const xsappJsonPath = path.resolve(rootPath, effectiveOptions.xsappJsonPath);
    if (!fs.existsSync(xsappJsonPath)) {
        throw new Error(`xs-app.json not found at "${xsappJsonPath}"`);
    }

    await loadAndApplyEnvOptions(rootPath, effectiveOptions, logger);
    await updateXsuaaService(rootPath, logger);

    const sourcePath = project.getSourcePath();
    const xsappConfig = loadAndPrepareXsappConfig({
        rootPath,
        xsappJsonPath,
        effectiveOptions,
        sourcePath,
        logger
    });

    const { modules, routes: extensionsRoutes } = loadExtensions(rootPath, effectiveOptions.extensions, logger);

    const port = await nextFreePort(effectiveOptions.port, logger);
    if (port !== effectiveOptions.port) {
        logger.info(`Port ${effectiveOptions.port} already in use. Using next free port: ${port} for the AppRouter.`);
    }

    const subdomain = effectiveOptions.subdomain;
    const baseUri = subdomain ? `http://${subdomain}.localhost:${port}` : `http://localhost:${port}`;
    const callbackEndpoint = xsappConfig.login?.callbackEndpoint ?? '/login/callback';

    const customRoutes: string[] = [...extensionsRoutes, callbackEndpoint];
    if (!effectiveOptions.disableWelcomeFile) {
        customRoutes.unshift('/');
    }
    const logoutEndpoint = xsappConfig.logout?.logoutEndpoint;
    if (logoutEndpoint) {
        customRoutes.push(logoutEndpoint);
    }

    const basUrlTemplate = await fetchBasUrlTemplate(logger);

    let initialized = false;
    let proxyMiddleware: RequestHandler | null = null;
    return function lazyApprouterMiddleware(req: Request, res: Response, next: NextFunction): void {
        if (!initialized) {
            try {
                const actualPort = req.socket.localPort ?? 8080;

                const basExternalUrl = resolveBasExternalUrl(basUrlTemplate, actualPort);
                if (basExternalUrl) {
                    logger.info(`BAS detected. External URL: ${basExternalUrl.href}`);
                }

                if (updateUi5ServerDestinationPort(effectiveOptions, actualPort, basExternalUrl)) {
                    logger.info(`Auto-configured ui5-server destination to port ${actualPort}`);
                }

                const routes = buildRouteEntries({ xsappConfig, effectiveOptions, logger });
                startApprouter({ port, xsappConfig, rootPath, modules, logger });

                proxyMiddleware = createProxy(
                    { customRoutes, routes, baseUri, effectiveOptions, basExternalUrl },
                    logger
                );
                initialized = true;
            } catch (err) {
                return next(err);
            }
        }

        proxyMiddleware!(req, res, next);
    };
}

module.exports = backendProxyMiddlewareCf;
