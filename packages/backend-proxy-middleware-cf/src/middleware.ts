import fs from 'node:fs';
import dotenv from 'dotenv';
import path from 'node:path';
import createApprouter from '@sap/approuter';
import type { RequestHandler } from 'express';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareParameters } from '@ui5/server';

import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

import { createProxy } from './proxy';
import { loadExtensions } from './extensions';
import { mergeEffectiveOptions } from './config';
import type { BackendProxyMiddlewareCfConfig } from './types';
import { nextFreePort } from './utils';
import { loadAndApplyEnvOptions } from './env';
import { buildRouteEntries, loadAndPrepareXsappConfig } from './routes';

dotenv.config();

/**
 * UI5 server middleware: runs `@sap/approuter` and proxies matching requests to it.
 *
 * @param params - Middleware parameters from UI5 (options, middlewareUtil).
 * @param params.options - Options containing configuration from ui5.yaml.
 * @param params.middlewareUtil - UI5 middleware utilities (getProject, etc.).
 * @returns {Promise<RequestHandler>} Promise resolving to the proxy request handler.
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

    const sourcePath = project.getSourcePath();
    const xsappConfig = loadAndPrepareXsappConfig({
        rootPath,
        xsappJsonPath,
        effectiveOptions,
        sourcePath
    });
    const routes = buildRouteEntries({
        xsappConfig,
        effectiveOptions,
        logger
    });

    const { modules, routes: extensionsRoutes } = loadExtensions(rootPath, effectiveOptions.extensions, logger);

    const freePort = await nextFreePort(effectiveOptions.port, logger);
    if (freePort !== effectiveOptions.port) {
        logger.info(
            `Port ${effectiveOptions.port} already in use. Using next free port: ${freePort} for the AppRouter.`
        );
    }

    const approuter = createApprouter();
    approuter.start({
        port: freePort,
        xsappConfig,
        workingDir: rootPath,
        extensions: modules
    });

    const globalKey = 'backend-proxy-middleware-cf' as const;
    const g = globalThis as unknown as Record<string, { approuters?: unknown[] } | undefined>;
    if (typeof g[globalKey]?.approuters === 'object') {
        g[globalKey].approuters?.push(approuter);
    }

    const subdomain = effectiveOptions.subdomain;
    const baseUri = subdomain ? `http://${subdomain}.localhost:${freePort}` : `http://localhost:${freePort}`;
    const callbackEndpoint = xsappConfig.login?.callbackEndpoint ?? '/login/callback';

    const customRoutes: string[] = [...extensionsRoutes, callbackEndpoint];
    if (!effectiveOptions.disableWelcomeFile) {
        customRoutes.unshift('/');
    }
    const logoutEndpoint = xsappConfig.logout?.logoutEndpoint;
    if (logoutEndpoint) {
        customRoutes.push(logoutEndpoint);
    }

    return createProxy(
        {
            customRoutes,
            routes,
            baseUri,
            effectiveOptions
        },
        logger
    );
}

module.exports = backendProxyMiddlewareCf;
