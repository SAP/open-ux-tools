import type { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { UI5Config } from '@sap-ux/ui5-config';
import type { NextFunction, Request, Response } from 'express';
import type { ProxyConfig } from './types';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { BOOTSTRAP_LINK, BOOTSTRAP_REPLACE_REGEX, SANDBOX_LINK, SANDBOX_REPLACE_REGEX } from './constants';
import type { Url } from 'url';
import { t } from '../i18n';

/**
 * Handler for the proxy response event.
 * Sets an Etag which will be used for re-validation of the cached UI5 sources.
 *
 * @param proxyRes - proxy response object
 * @param etag - ETag for the cached sources, normally the UI5 version
 */
export const proxyResponseHandler = (proxyRes: IncomingMessage, etag: string): void => {
    proxyRes.headers['Etag'] = etag;
    proxyRes.headers['cache-control'] = 'no-cache';
};

/**
 * Handler for the proxy request event.
 * Re-validates the cached UI5 sources based on the ETag.
 * Logs the requests made by the proxy.
 *
 * @param proxyReq - proxy request object
 * @param res - server response object
 * @param etag - Etag of the cached UI5 sources, normally the UI5 version
 * @param logger - Logger for loging the requests
 */
export const proxyRequestHandler = (
    proxyReq: ClientRequest,
    res: ServerResponse,
    etag: string,
    logger: ToolsLogger
): void => {
    logger.info(proxyReq.path);
    if (proxyReq.getHeader('if-none-match') === etag) {
        res.statusCode = 304;
        res.end();
    }
};

/**
 * Get user's proxy configuration.
 *
 * @param yamlProxyServer - proxy server config from yaml file
 * @returns User's proxy configuration or undefined
 */
export const getCorporateProxyServer = (yamlProxyServer: string | undefined): string | undefined => {
    let proxyFromArgs: string | undefined;
    process.argv.forEach((arg) => {
        if (arg.match(/proxy=/g)) {
            proxyFromArgs = arg.split('=')[1];
        }
    });

    return (
        proxyFromArgs ||
        process.env.FIORI_TOOLS_PROXY ||
        process.env.npm_config_proxy ||
        process.env.npm_config_https_proxy ||
        process.env.http_proxy ||
        process.env.HTTP_PROXY ||
        process.env.https_proxy ||
        process.env.HTTPS_PROXY ||
        yamlProxyServer
    );
};

/**
 * Hides the proxy credentials for displaying the proxy configuration in the console.
 *
 * @param proxy - user's proxy server
 * @returns proxy with hidden credentials for displaying in the console
 */
export const hideProxyCredentials = (proxy: string | undefined): string | undefined => {
    if (proxy) {
        const forwardSlashIndex = proxy.indexOf('//');
        const atIndex = proxy.indexOf('@');

        if (forwardSlashIndex !== -1 && atIndex !== -1) {
            proxy = proxy.replace(proxy.slice(forwardSlashIndex + 2, atIndex), '***:***');
        }
    }

    return proxy;
};

/**
 * Updates the proxy configuration with values from runtime args (highest priority), environment variables or given config value.
 *
 * @param proxyFromConfig - optional proxy string from configuration
 */
export function updateProxyEnv(proxyFromConfig?: string): void {
    let proxyFromArgs: string | undefined;
    process.argv.forEach((arg) => {
        if (arg.match(/proxy=/g)) {
            proxyFromArgs = arg.split('=')[1];
        }
    });

    if (proxyFromArgs || process.env.FIORI_TOOLS_PROXY) {
        process.env.npm_config_proxy = proxyFromArgs || process.env.FIORI_TOOLS_PROXY;
        process.env.npm_config_https_proxy = proxyFromArgs || process.env.FIORI_TOOLS_PROXY;
    } else {
        const proxyFromEnv =
            process.env.npm_config_proxy ||
            process.env.npm_config_https_proxy ||
            process.env.http_proxy ||
            process.env.HTTP_PROXY ||
            process.env.https_proxy ||
            process.env.HTTPS_PROXY;

        if (!proxyFromEnv && proxyFromConfig) {
            process.env.npm_config_proxy = proxyFromConfig;
            process.env.npm_config_https_proxy = proxyFromConfig;
        }
    }
}

/**
 * Returns the name of html file, which is used to preview the application, from the URL.
 *
 * @param url - html request url
 * @returns Name of the html file
 */
export const getHtmlFile = (url: string): string => {
    let html = url;
    if (html.indexOf('?') !== -1) {
        html = html.split('?')[0].replace(/["']/g, '');
    } else if (html.indexOf('#') !== -1) {
        html = html.split('#')[0].replace(/["']/g, '');
    } else {
        html = html.replace(/["']/g, '');
    }

    return html;
};

/**
 * Returns the name of the yaml file, which is used to for the server configuration, from the runtime arguments.
 *
 * @param args - runtime arguments
 * @returns Name of the YAML file
 */
export const getYamlFile = (args: string[]): string => {
    let yaml = 'ui5.yaml';
    const index = args.indexOf('--config') !== -1 ? args.indexOf('--config') : args.indexOf('-c');

    if (index !== -1) {
        yaml = args[index + 1];
    }

    return yaml;
};

/**
 * Gets the path to the webapp folder from the YAML file.
 *
 * @param ui5YamlPath - path to the yaml file
 * @returns Path to the webapp folder
 */
export const getWebAppFolderFromYaml = async (ui5YamlPath: string): Promise<string> => {
    if (existsSync(ui5YamlPath)) {
        const ui5Config = await UI5Config.newInstance(readFileSync(ui5YamlPath, { encoding: 'utf8' }));
        return ui5Config.getConfiguration().paths?.webapp ?? 'webapp';
    } else {
        return 'webapp';
    }
};

/**
 * Sends HTML content as a response.
 *
 * @param res - The http response object
 * @param html - The HTML content
 */
export const setHtmlResponse = (res: any, html: string): void => {
    if (res['_livereload']) {
        res.write(html);
        res.end();
    } else {
        res.status(200).contentType('html').send(html);
    }
};

/**
 * Gets the manifest.json for a given application.
 *
 * @param args list of runtime arguments
 * @returns The content of the manifest.json
 */
export const getManifest = async (args: string[]): Promise<Manifest> => {
    const projectRoot = process.cwd();
    const yamlFileName = getYamlFile(args);
    const ui5YamlPath = join(projectRoot, yamlFileName);
    const webAppFolder = await getWebAppFolderFromYaml(ui5YamlPath);
    const manifestPath = join(projectRoot, webAppFolder, 'manifest.json');
    const manifest: Manifest = JSON.parse(readFileSync(manifestPath, { encoding: 'utf8' }));

    return manifest;
};

/**
 * Gets the minUI5Version from the manifest.json.
 *
 * @param args list of runtime args
 * @returns The minUI5Version from manifest.json or undefined otherwise
 */
export async function getUI5VersionFromManifest(args: string[]): Promise<string | undefined> {
    const manifest = await getManifest(args);
    return manifest['sap.ui5']?.dependencies?.minUI5Version;
}

/**
 * Determines which UI5 version to use when previewing the application.
 *
 * @param version ui5 version as defined in the yaml or via cli argument
 * @param log logger for outputing information from where ui5 version config is coming
 * @returns The UI5 version with which the application will be started
 */
export async function resolveUI5Version(version?: string, log?: ToolsLogger): Promise<string> {
    let ui5Version: string;
    let ui5VersionInfo: string;
    let ui5VersionLocation: string;

    if (process.env.FIORI_TOOLS_UI5_VERSION || process.env.FIORI_TOOLS_UI5_VERSION === '') {
        ui5Version = process.env.FIORI_TOOLS_UI5_VERSION;
        ui5VersionLocation = 'CLI arguments / Run configuration';
    } else if (version !== undefined) {
        ui5Version = version ? version : '';
        ui5VersionLocation = getYamlFile(process.argv);
    } else {
        const minUI5Version = await getUI5VersionFromManifest(process.argv);
        ui5Version = minUI5Version && !isNaN(parseFloat(minUI5Version)) ? minUI5Version : '';
        ui5VersionLocation = 'manifest.json';
    }

    if (log) {
        ui5VersionInfo = ui5Version ? ui5Version : 'latest';
        log.info(t('info.ui5VersionSource', { version: ui5VersionInfo, source: ui5VersionLocation }));
    }

    return ui5Version;
}

/**
 * Injects the absolute UI5 urls into the html file, which is used to preview the application.
 *
 * @param htmlFilePath - path to the html file which is used for previwing the application
 * @param ui5Configs - the configuration of the ui5-proxy-middleware
 * @returns The modified html file content
 */
export function injectUI5Url(htmlFilePath: string, ui5Configs: ProxyConfig[]): string | undefined {
    if (existsSync(htmlFilePath)) {
        let html = readFileSync(htmlFilePath, { encoding: 'utf8' });
        for (const ui5Config of ui5Configs) {
            const ui5Host = ui5Config.url.replace(/\/$/, '');
            const ui5Url = ui5Config.version ? `${ui5Host}/${ui5Config.version}` : ui5Host;

            if (ui5Config.path === '/resources') {
                const resourcesUrl = `src="${ui5Url}/${BOOTSTRAP_LINK}"`;
                html = html.replace(BOOTSTRAP_REPLACE_REGEX, resourcesUrl);
            }

            if (ui5Config.path === '/test-resources') {
                const testResourcesUrl = `src="${ui5Url}/${SANDBOX_LINK}"`;
                html = html.replace(SANDBOX_REPLACE_REGEX, testResourcesUrl);
            }
        }
        return html;
    } else {
        return undefined;
    }
}

/**
 * Injects scripts into the html file, which is used to preview the application.
 *
 * @param req - the http request object
 * @param res - the http response object
 * @param next - the next function, used to forward the request to the next available handler
 * @param ui5Configs - the UI5 configuration of the ui5-proxy-middleware
 */
export const injectScripts = async (
    req: Request,
    res: Response,
    next: NextFunction,
    ui5Configs: ProxyConfig[]
): Promise<void> => {
    try {
        const projectRoot = process.cwd();
        const args = process.argv;
        const htmlFileName = getHtmlFile(req.baseUrl);
        const yamlFileName = getYamlFile(args);
        const ui5YamlPath = join(projectRoot, yamlFileName);
        const webAppFolder = await getWebAppFolderFromYaml(ui5YamlPath);
        const htmlFilePath = join(projectRoot, webAppFolder, htmlFileName);
        const html = injectUI5Url(htmlFilePath, ui5Configs);

        if (html) {
            setHtmlResponse(res, html);
        } else {
            next();
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Filters comressed html files from UI5 CDN.
 * Avoid ERR_CONTENT_DECODING_FAILED on http request for gzip'd html files.
 * e.g. /test-resources/sap/ui/qunit/testrunner.html?testpage=%2Ftest%2Ftestsuite.qunit.html&autostart=true.
 *
 * @param _pathname - the request path
 * @param req - the http request object
 * @returns True, indicating that the request should be proxied
 */
export const filterCompressedHtmlFiles = (_pathname: string, req: IncomingMessage): boolean => {
    const acceptHeader = req.headers['accept'] || '';
    if (
        req.headers['accept-encoding'] &&
        (acceptHeader.includes('text/html') || acceptHeader.includes('application/xhtml+xml'))
    ) {
        delete req.headers['accept-encoding']; // Don't accept compressed html files from ui5 CDN
    }
    return true;
};

/**
 * Specifically handling errors due to undefined and empty errors.
 *
 * @param err the error thrown when proxying the request or processing the response
 * @param req request causing the error
 * @param logger logger instance
 * @param _res (not used)
 * @param _target (not used)
 */
export function proxyErrorHandler(
    err: Error & { code?: string },
    req: IncomingMessage & { next?: Function; originalUrl?: string },
    logger: ToolsLogger,
    _res?: ServerResponse,
    _target?: string | Partial<Url>
): void {
    if (err && err.stack?.toLowerCase() !== 'error') {
        if (typeof req.next === 'function') {
            req.next(err);
        } else {
            throw err;
        }
    } else {
        logger.debug(t('error.noCodeError', { error: JSON.stringify(err, null, 2), request: req.originalUrl }));
    }
}
