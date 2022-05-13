import HttpsProxyAgent from 'https-proxy-agent';
import type { ServerOptions } from 'http-proxy';
import i18n from 'i18next';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import type { Logger } from '@sap-ux/logger';
import { createForAbapOnBtp } from '@sap-ux/axios-extension';
import {
    isAppStudio,
    getDestinationUrlForAppStudio,
    getUserForDestinationService,
    listDestinations,
    isFullUrlDestination
} from '@sap-ux/btp-utils';
import type { Options, RequestHandler } from 'http-proxy-middleware';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { BackendConfig, CommonConfig, DestinationBackendConfig } from './types';
import translations from './i18n.json';

import type { ApiHubSettings, ApiHubSettingsKey, ApiHubSettingsService, BackendSystem } from '@sap-ux/store';
import { AuthenticationType, BackendSystemKey, getService } from '@sap-ux/store';
import { isHostExcludedFromProxy, promptUserPass } from './config';
import type { Url } from 'url';

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
        if (proxyReq.path.indexOf('Fiorilaunchpad.html') !== -1 && !proxyReq.headersSent) {
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
    },

    /**
     * Specifically handlingign errors due to unsigned certificates.
     *
     * @param err the error thrown when proxying the request or processing the response
     * @param req request causing the error
     * @param _res (not used)
     * @param _target (not used)
     */
    onError(
        err: Error & { code?: string },
        req: IncomingMessage & { next?: Function },
        _res?: ServerResponse,
        _target?: string | Partial<Url>
    ) {
        if (err) {
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
        }
    }
};

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
            if (path.match(/sap-client=[0-9]{3}/)) {
                return path.replace(/sap-client=[0-9]{3}/, sapClient);
            } else {
                return path.indexOf('?') !== -1 ? path + '&' + sapClient : path + '?' + sapClient;
            }
        };
    },

    /**
     * Replace calls to manifest.appdescr file if we are running the FLP embedded flow.
     *
     * @param bsp path of the BSP page
     * @returns a path rewrite function
     */
    convertAppDescriptorToManifest(bsp: string): (path: string) => string {
        const regex = new RegExp('(' + bsp + '/manifest\\.appdescr\\b)');
        return (path: string) => (path.match(regex) ? '/manifest.json' : path);
    },

    /**
     * Create a chain of rewrite function calls based on the provided configuration.
     *
     * @param config backend configuration
     * @param log logger instance
     * @param bsp (optional) BSP path in case it is the FLP embedded flow
     * @returns a path rewrite function
     */
    getPathRewrite(config: BackendConfig, log: Logger, bsp?: string): ((path: string) => string) | undefined {
        const functions: ((path: string) => string)[] = [];
        if (config.pathPrefix) {
            functions.push(PathRewriters.replacePrefix(config.path, config.pathPrefix));
        }
        if (config.client) {
            functions.push(PathRewriters.replaceClient(config.client));
        }
        if (bsp) {
            functions.push(PathRewriters.convertAppDescriptorToManifest(bsp));
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
        }
    }
};

/**
 * Initialize i18next with the translations for this module.
 */
async function initI18n(): Promise<void> {
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
 * @returns true if the destination requires an authentication prompt in the CLI
 */
export async function enhanceConfigsForDestination(
    proxyOptions: Options & { headers: object },
    backend: DestinationBackendConfig
): Promise<boolean> {
    let authNeeded = true;
    proxyOptions.target = getDestinationUrlForAppStudio(backend.destination);
    if (backend.destinationInstance) {
        proxyOptions.headers['bas-destination-instance-cred'] = await getUserForDestinationService(
            backend.destinationInstance
        );
    } else {
        const destinations = await listDestinations();
        const destination = destinations[backend.destination];
        if (destination) {
            authNeeded = destination.Authentication === 'NoAuthentication';
            // in case of a full url destination remove the path defined in the destination from the forwarded call
            if (isFullUrlDestination(destination)) {
                const destPath = new URL(destination.Host).pathname.replace(/\/$/, '');
                if (backend.path.startsWith(destPath) && !backend.pathPrefix) {
                    backend.pathPrefix = backend.path.replace(destPath, '');
                }
            }
        } else {
            throw new Error();
        }
    }
    return authNeeded;
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
            const provider = createForAbapOnBtp(
                JSON.parse(system.serviceKeys as string),
                system.refreshToken,
                tokenChangedCallback
            );
            // sending a request to the backend to get cookies
            await provider.getAtoInfo();
            proxyOptions.headers!['cookie'] = provider.cookies.toString();
        } else {
            // TODO: similar to prompting user/password, should allow prompting for service keys here?
            throw new Error('Cannot connect to ABAP Environment on BTP without service keys.');
        }
    } else if (system.authenticationType === AuthenticationType.ReentranceTicket) {
        // TODO: @ullas needs to add the missing code to the axios-extension
        //const connection = await (await system.getCatalog(ODataVersion.v2)).getConnection();
        //cookies = connection.cookies;
    } else if (
        (system.username || process.env.FIORI_TOOLS_USER) &&
        (system.password || process.env.FIORI_TOOLS_PASSWORD)
    ) {
        proxyOptions.auth = `${system.username || process.env.FIORI_TOOLS_USER}:${
            system.password || process.env.FIORI_TOOLS_PASSWORD
        }`;
    }
}

export async function getBackendProxy(
    backend: BackendConfig,
    common: CommonConfig,
    logger: Logger
): Promise<RequestHandler> {
    await initI18n();
    // base options
    const proxyOptions: Options & { headers: object } = {
        ...ProxyEventHandlers,
        secure: common.secure,
        changeOrigin: true,
        logLevel: common.debug ? 'debug' : 'silent',
        headers: {}
    };

    let authNeeded = true;

    // overwrite url if running in AppStudio
    if (isAppStudio()) {
        backend.destination = backend.destination ?? process.env.FIORI_TOOLS_DESTINATION;
        if (backend.destination) {
            authNeeded = await enhanceConfigsForDestination(proxyOptions, backend);
            logger.info('Using destination: ' + backend.destination);
        }
    } else {
        proxyOptions.target = backend.url;
        // check if system credentials are stored in the store
        const systemStore = await getService<BackendSystem, BackendSystemKey>({ logger, entityName: 'system' });
        const system = await systemStore.read(new BackendSystemKey({ url: backend.url, client: backend.client }));
        if (system) {
            await enhanceConfigForSystem(proxyOptions, system, backend.scp, (refreshToken?: string) => {
                if (refreshToken) {
                    logger.info('Updating refresh token for: ' + backend.url);
                    systemStore.write({ ...system, refreshToken });
                }
            });
        }
    }

    proxyOptions.pathRewrite = PathRewriters.getPathRewrite(backend, logger, common.bsp);

    if (backend.apiHub) {
        const apiHubKey = await getApiHubKey(logger);
        if (apiHubKey) {
            proxyOptions.headers['apikey'] = apiHubKey;
        }
    }

    if (backend.ws) {
        proxyOptions.ws = true;
    }

    if (backend.xfwd) {
        proxyOptions.xfwd = true;
    }

    if (common.proxy && !isHostExcludedFromProxy(common.noProxyList, backend.url)) {
        proxyOptions.agent = new (HttpsProxyAgent as any)(common.proxy);
    }

    if (common.bsp) {
        const regex = new RegExp('(' + common.bsp + '/manifest\\.appdescr\\b)');
        proxyOptions.router = (req): string | undefined => {
            // redirects the request for manifest.appdescr to localhost
            if (req.path.match(regex)) {
                return req.protocol + '://' + req.headers.host;
            }
        };

        if (!proxyOptions.auth && authNeeded) {
            proxyOptions.auth = await promptUserPass(logger);
        }
    }

    logger.info(
        `Backend proxy created for ${proxyOptions.target ? proxyOptions.target : ''} ${
            backend.path ? backend.path : ''
        }`
    );
    return createProxyMiddleware(proxyOptions);
}
