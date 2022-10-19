import { HttpsProxyAgent } from 'https-proxy-agent';
import type { ServerOptions } from 'http-proxy';
import type { RequestHandler, Options } from 'http-proxy-middleware';
import { createProxyMiddleware } from 'http-proxy-middleware';
import i18n from 'i18next';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import type { Logger } from '@sap-ux/logger';
import { ToolsLogger } from '@sap-ux/logger';
import { AbapCloudEnvironment, createForAbapOnCloud } from '@sap-ux/axios-extension';
import {
    isAppStudio,
    getDestinationUrlForAppStudio,
    getCredentialsForDestinationService,
    listDestinations,
    isFullUrlDestination,
    BAS_DEST_INSTANCE_CRED_HEADER
} from '@sap-ux/btp-utils';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import type { BackendConfig, DestinationBackendConfig, LocalBackendConfig } from './types';
import translations from './i18n.json';

import type { ApiHubSettings, ApiHubSettingsKey, ApiHubSettingsService, BackendSystem } from '@sap-ux/store';
import { AuthenticationType, BackendSystemKey, getService } from '@sap-ux/store';
import { updateProxyEnv } from './config';
import type { Url } from 'url';
import { addOptionsForEmbeddedBSP } from '../ext/bsp';
import { getProxyForUrl } from 'proxy-from-env';

/**
 * Collection of custom event handler for the proxy.
 */
export const ProxyEventHandlers = {
    /**
     * Modifies the request to the proxy server if the `FioriLaunchpad.html` is requested to add a required header.
     *
     * @param proxyReq request to the proxy server that can be modified
     * @param _req (not used) original request
     * @param _res (not used)
     * @param _options (not used)
     */
    onProxyReq(proxyReq: ClientRequest, _req?: IncomingMessage, _res?: ServerResponse, _options?: ServerOptions) {
        if (proxyReq.path?.includes('Fiorilaunchpad.html') && !proxyReq.headersSent) {
            proxyReq.setHeader('accept-encoding', 'br');
        }
    },

    /**
     * Retrieve the set-cookie headers from the response and transform secure cookies to insecure ones.
     *
     * @param proxyRes request to the proxy server that can be modified
     * @param _req (not used) original request
     * @param _res (not used)
     */
    onProxyRes(proxyRes: IncomingMessage, _req?: IncomingMessage, _res?: ServerResponse) {
        const header = proxyRes?.headers?.['set-cookie'];
        if (header?.length) {
            for (let i = header.length - 1; i >= 0; i--) {
                const cookie = header[i].replace(/\s?Domain=[^\s]*\s?|\s?SameSite=[^\s]*\s?|\s?Secure[^\s]*\s?/gi, '');
                header[i] = cookie;
            }
        }
    }
};

/**
 * Specifically handling errors due to unsigned certificates and empty errors.
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
        let error: Error;
        if (err.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
            error = new Error(i18n.t('error.sslProxy'));
        } else {
            error = err;
        }
        if (typeof req.next === 'function') {
            req.next(error);
        } else {
            throw error;
        }
    } else {
        logger.debug(i18n.t('error.noCodeError', { error: JSON.stringify(err, null, 2), request: req.originalUrl }));
    }
}

/**
 * Return the SAP API Hub key either provided as environment variable (including .env file) or from the secure store when not running in AppStudio.
 * not found or error while extracting the key.
 *
 * @param logger - logger to report errors
 */
async function getApiHubKey(logger: Logger): Promise<string | undefined> {
    let apiHubKey: string | undefined = process.env.API_HUB_API_KEY;
    if (!apiHubKey && !isAppStudio()) {
        const apiHubStore = (await getService<ApiHubSettings, ApiHubSettingsKey>({
            logger,
            entityName: 'api-hub'
        })) as ApiHubSettingsService;
        const apiHubSettings = await apiHubStore.read();
        apiHubKey = apiHubSettings ? apiHubSettings.apiKey : undefined;
    }
    return apiHubKey;
}

/**
 * Collection of path rewrite functions.
 */
export const PathRewriters = {
    /**
     * Generates a rewrite funtion that replace the match string with the prefix in the given string.
     *
     * @param match part of the path that is to be replaced
     * @param prefix new path that is used as replacement
     * @returns a path rewrite function
     */
    replacePrefix(match: string, prefix: string): (path: string) => string {
        return (path: string) => path.replace(match, prefix.replace(/\/$/, ''));
    },

    /**
     * Add or replace the sap-client url parameter if missing or inocrrect in the original request path.
     *
     * @param client sap-client as string
     * @returns a path rewrite function
     */
    replaceClient(client: string): (path: string) => string {
        const sapClient = 'sap-client=' + client;
        return (path: string) => {
            if (path.match(/sap-client=\d{3}/)) {
                return path.replace(/sap-client=\d{3}/, sapClient);
            } else {
                return path.indexOf('?') !== -1 ? path + '&' + sapClient : path + '?' + sapClient;
            }
        };
    },

    /**
     * Create a chain of rewrite function calls based on the provided configuration.
     *
     * @param config backend configuration
     * @param log logger instance
     * @returns a path rewrite function
     */
    getPathRewrite(config: BackendConfig, log: Logger): ((path: string) => string) | undefined {
        const functions: ((path: string) => string)[] = [];
        if (config.pathReplace) {
            functions.push(PathRewriters.replacePrefix(config.path, config.pathReplace));
        }
        if (config.client) {
            functions.push(PathRewriters.replaceClient(config.client));
        }
        if (functions.length > 0) {
            return (path: string) => {
                let newPath = path;
                functions.forEach((func) => (newPath = func(newPath)));
                if (newPath !== path) {
                    log.info(`Rewrite path ${path} > ${newPath}`);
                } else {
                    log.info(path);
                }
                return newPath;
            };
        } else {
            // Display request path even if it was not rewritten
            return (path: string) => {
                log.info(path);
                return path;
            };
        }
    }
};

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    const ns = 'backend-proxy-middleware';
    await i18n.init({
        resources: {
            en: {
                [ns]: translations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: ns,
        ns: [ns]
    });
}

/**
 * Enhance the proxy options and backend configurations for the usage of destinations in SAP Business Application Studio.
 *
 * @param proxyOptions reference to a proxy options object that the function will enhance
 * @param backend reference to the backend configuration that the the function may enhance
 */
export async function enhanceConfigsForDestination(
    proxyOptions: Options & { headers: object },
    backend: DestinationBackendConfig
): Promise<void> {
    proxyOptions.target = getDestinationUrlForAppStudio(backend.destination);
    if (backend.destinationInstance) {
        proxyOptions.headers[BAS_DEST_INSTANCE_CRED_HEADER] = await getCredentialsForDestinationService(
            backend.destinationInstance
        );
    } else {
        const destinations = await listDestinations();
        const destination = destinations[backend.destination];
        if (destination) {
            // in case of a full url destination remove the path defined in the destination from the forwarded call
            if (isFullUrlDestination(destination)) {
                backend.path = new URL(destination.Host).pathname.replace(/\/$/, '');
                backend.pathReplace = backend.pathReplace ?? '/';
            }
        } else {
            throw new Error();
        }
    }
}

/**
 * Enhance the proxy options with information read from the store.
 *
 * @param proxyOptions reference to a proxy options object that the function will enhance
 * @param system backend system information (most likely) read from the store
 * @param oAuthRequired if true then the OAuth flow is triggered to get cookies
 * @param tokenChangedCallback function to call if a new refreshToken is available
 */
export async function enhanceConfigForSystem(
    proxyOptions: Options & { headers: object },
    system: BackendSystem,
    oAuthRequired: boolean | undefined,
    tokenChangedCallback: (refreshToken?: string) => void
): Promise<void> {
    if (oAuthRequired) {
        if (system.serviceKeys) {
            const provider = createForAbapOnCloud({
                environment: AbapCloudEnvironment.Standalone,
                service: system.serviceKeys as ServiceInfo,
                refreshToken: system.refreshToken,
                refreshTokenChangedCb: tokenChangedCallback
            });
            // sending a request to the backend to get cookies
            await provider.getAtoInfo();
            proxyOptions.headers['cookie'] = provider.cookies.toString();
        } else {
            throw new Error('Cannot connect to ABAP Environment on BTP without service keys.');
        }
    } else if (system.authenticationType === AuthenticationType.ReentranceTicket) {
        const provider = createForAbapOnCloud({
            environment: AbapCloudEnvironment.EmbeddedSteampunk,
            url: system.url
        });
        // sending a request to the backend to get cookies
        await provider.getAtoInfo();
        proxyOptions.headers['cookie'] = provider.cookies.toString();
    } else if (system.username && system.password) {
        proxyOptions.auth = `${system.username}:${system.password}`;
    }
}

/**
 * Generate options for the proxy middleware based on the input.
 *
 * @param backend backend system specific configuration
 * @param options optional base options for the http-proxy-middleware
 * @param logger optional logger instance
 * @returns options for the http-proxy-middleware
 */
export async function generateProxyMiddlewareOptions(
    backend: BackendConfig,
    options: Options = {},
    logger: ToolsLogger = new ToolsLogger()
): Promise<Options> {
    // add required options
    const proxyOptions: Options & { headers: object } = {
        headers: {},
        ...ProxyEventHandlers,
        onError: (
            err: Error & { code?: string },
            req: IncomingMessage & { next?: Function; originalUrl?: string },
            res: ServerResponse,
            target: string | Partial<Url> | undefined
        ) => {
            proxyErrorHandler(err, req, logger, res, target);
        },
        ...options
    };
    proxyOptions.changeOrigin = true;
    proxyOptions.logProvider = () => logger;

    // always set the target to the url provided in yaml
    proxyOptions.target = backend.url;

    // overwrite url if running in AppStudio
    if (isAppStudio()) {
        const destBackend = backend as DestinationBackendConfig;
        destBackend.destination = destBackend.destination ?? process.env.FIORI_TOOLS_DESTINATION;
        if (destBackend.destination) {
            await enhanceConfigsForDestination(proxyOptions, destBackend);
            logger.info('Using destination: ' + destBackend.destination);
        }
    } else {
        const localBackend = backend as LocalBackendConfig;
        // check if system credentials are stored in the store
        try {
            const systemStore = await getService<BackendSystem, BackendSystemKey>({ logger, entityName: 'system' });
            const system = await systemStore.read(
                new BackendSystemKey({ url: localBackend.url, client: localBackend.client })
            );
            if (system) {
                await enhanceConfigForSystem(proxyOptions, system, backend.scp, (refreshToken?: string) => {
                    if (refreshToken) {
                        logger.info('Updating refresh token for: ' + localBackend.url);
                        systemStore.write({ ...system, refreshToken });
                    }
                });
            }
        } catch (error) {
            logger.warn('Accessing the credentials store failed.');
            logger.debug(error as object);
        }
    }

    if (!proxyOptions.auth && process.env.FIORI_TOOLS_USER && process.env.FIORI_TOOLS_PASSWORD) {
        proxyOptions.auth = `${process.env.FIORI_TOOLS_USER}:${process.env.FIORI_TOOLS_PASSWORD}`;
    }

    proxyOptions.pathRewrite = PathRewriters.getPathRewrite(backend, logger);

    if (backend.bsp) {
        await addOptionsForEmbeddedBSP(backend.bsp, proxyOptions, logger);
    }

    if (backend.apiHub) {
        const apiHubKey = await getApiHubKey(logger);
        if (apiHubKey) {
            proxyOptions.headers['apikey'] = apiHubKey;
        }
    }

    if (!proxyOptions.target) {
        throw new Error(`Unable to determine target from configuration:\n${JSON.stringify(backend, null, 2)}`);
    }

    // update proxy config with values coming from args or ui5.yaml
    updateProxyEnv(backend.proxy);
    backend.proxy = getProxyForUrl(proxyOptions.target);
    if (backend.proxy) {
        proxyOptions.agent = new HttpsProxyAgent(backend.proxy);
    }

    logger.info(`Backend proxy created for ${proxyOptions.target} ${backend.path ? backend.path : ''}`);
    return proxyOptions;
}

/**
 * Generate an instance of the proxy middleware based on the input.
 *
 * @param backend backend system specific configuration
 * @param options optional base options for the http-proxy-middleware
 * @param logger optional logger instance
 * @returns an instance of http-proxy-middleware
 */
export async function createProxy(
    backend: BackendConfig,
    options?: Options,
    logger?: ToolsLogger
): Promise<RequestHandler> {
    return createProxyMiddleware(await generateProxyMiddlewareOptions(backend, options, logger));
}
