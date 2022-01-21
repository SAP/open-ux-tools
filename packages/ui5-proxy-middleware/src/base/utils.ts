import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { ToolsLogger } from '@sap-ux/logger';
import { NextFunction, Request, Response } from 'express';
import { UI5Config } from './types';
import { existsSync, promises } from 'fs';
import { parseDocument } from 'yaml';
import { join } from 'path';
import {
    BOOTSTRAP_LINK,
    BOOTSTRAP_REGEX,
    BOOTSTRAP_REPLACE_REGEX,
    SANDBOX_LINK,
    SANDBOX_REGEX,
    SANDBOX_REPLACE_REGEX
} from './constants';

/**
 * Handler for the proxy response event.
 * Sets an Etag which will be used for re-validation of the cached UI5 sources.
 *
 * @param responseBuffer - response data as buffer
 * @param proxyRes - proxy response object
 * @param next - function for passing the request to the next available middleware
 * @param etag - ETag for the cached sources, normally the UI5 version
 * @returns Response data
 */
export const proxyResponseHandler = (
    responseBuffer: Buffer,
    proxyRes: IncomingMessage,
    next: NextFunction,
    etag: string
): Promise<string | Buffer> => {
    return new Promise((resolve) => {
        /*
         Forward the request to the next available middleware in case of 404
        */
        if (proxyRes.statusCode === 404) {
            next();
        } else {
            /*
             Enables re-validation of cached ui5 source.
             The re-validation is performed by an ETag, which is normally the UI5 version.
            */
            proxyRes.headers['Etag'] = etag;
            proxyRes.headers['cache-control'] = 'no-cache';
            resolve(responseBuffer);
        }
    });
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
    return (
        yamlProxyServer ||
        process.env.FIORI_TOOLS_PROXY ||
        process.env.http_proxy ||
        process.env.HTTP_PROXY ||
        process.env.https_proxy ||
        process.env.HTTPS_PROXY ||
        process.env.npm_config_proxy ||
        process.env.npm_config_https_proxy
    );
};

/**
 * Checks if a host is excluded from user's corporate proxy.
 *
 * @param noProxyConfig - user's no_proxy configuration
 * @param host - host to be checked
 * @returns true if host is excluded from user's corporate server, false otherwise
 */
export const isHostExcludedFromProxy = (noProxyConfig: string | undefined, host: string): boolean => {
    const noProxyList = noProxyConfig ? noProxyConfig.split(',') : [];
    const found = noProxyList.find((entry) => {
        return host.includes(entry);
    });
    return !!found;
};

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
    let webAppFolder = 'webapp';

    if (existsSync(ui5YamlPath)) {
        const ui5Yaml = parseDocument(await promises.readFile(ui5YamlPath, { encoding: 'utf8' })).toJSON();

        if (ui5Yaml.resources?.configuration?.paths?.webapp) {
            webAppFolder = ui5Yaml.resources.configuration.paths.webapp;
        }
    }

    return webAppFolder;
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
 * Injects the absolute UI5 urls into the html file, which is used to preview the application.
 *
 * @param req - the http request object
 * @param res - the http response object
 * @param next - the next function, used to forward the request to the next available handler
 * @param ui5Configs - the UI5 configuration of the ui5-proxy-middleware
 */
export const injectUI5Url = async (
    req: Request,
    res: Response,
    next: NextFunction,
    ui5Configs: UI5Config[]
): Promise<void> => {
    try {
        const projectRoot = process.cwd();
        const args = process.argv;
        const htmlFileName = getHtmlFile(req.baseUrl);
        const yamlFileName = getYamlFile(args);
        const ui5YamlPath = join(projectRoot, yamlFileName);
        const webAppFolder = await getWebAppFolderFromYaml(ui5YamlPath);
        const htmlFilePath = join(projectRoot, webAppFolder, htmlFileName);

        if (existsSync(htmlFilePath)) {
            let html = await promises.readFile(htmlFilePath, { encoding: 'utf8' });
            for (const ui5Config of ui5Configs) {
                const ui5Host = ui5Config.url.replace(/\/$/, '');
                const ui5Version = ui5Config.version ? ui5Config.version : '';

                if (ui5Config.path === '/resources') {
                    const bootstrap = html.match(BOOTSTRAP_REGEX);
                    const resourcesUrl = ui5Version
                        ? `src="${ui5Host}/${ui5Version}/${BOOTSTRAP_LINK}"`
                        : `src="${ui5Host}/${BOOTSTRAP_LINK}"`;
                    if (bootstrap) {
                        const oldBoostrap = bootstrap[1];
                        const newBootstrap = oldBoostrap.replace(BOOTSTRAP_REPLACE_REGEX, resourcesUrl);
                        html = html.replace(oldBoostrap, newBootstrap);
                    }
                }

                if (ui5Config.path === '/test-resources') {
                    const sandbox = html.match(SANDBOX_REGEX);
                    const testResourcesUrl = ui5Version
                        ? `src="${ui5Host}/${ui5Version}/${SANDBOX_LINK}"`
                        : `src="${ui5Host}/${SANDBOX_LINK}"`;
                    if (sandbox) {
                        const oldSandbox = sandbox[1];
                        const newSandbox = oldSandbox.replace(SANDBOX_REPLACE_REGEX, testResourcesUrl);
                        html = html.replace(oldSandbox, newSandbox);
                    }
                }
            }
            setHtmlResponse(res, html);
        } else {
            next();
        }
    } catch (error) {
        next(error);
    }
};
