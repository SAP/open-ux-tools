import HttpsProxyAgent from 'https-proxy-agent';
import i18n from 'i18next';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Logger } from '@sap-ux/logger';
import { createForAbapOnBtp } from '@sap-ux/axios-extension';
import {
    isAppStudio,
    getDestinationUrlForAppStudio,
    getUserForDestinationService,
    listDestinations,
    isFullUrlDestination
} from '@sap-ux/btp-utils';
import type { Request } from 'express';
import type { Options } from 'http-proxy-middleware';
import type { RequestHandler } from 'http-proxy-middleware';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { BackendConfig, CommonConfig, DestinationBackendConfig } from './types';
import translations from './i18n.json';

import type { ApiHubSettings, ApiHubSettingsKey, ApiHubSettingsService, BackendSystem } from '@sap-ux/store';
import { AuthenticationType, BackendSystemKey, getService } from '@sap-ux/store';
import { isHostExcludedFromProxy, promptUserPass } from './config';

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

const backendProxyUserResHeaderDecorator = (proxyRes: IncomingMessage): void => {
    // retrieve the set-cookie headers from the response and transform secure cookies to insecure ones
    const header = proxyRes?.headers?.['set-cookie'];
    if (header?.length) {
        for (let i = header.length - 1; i >= 0; i--) {
            const cookie = header[i].replace(
                /\s{0,1}Domain=[^\s]*\s{0,1}|\s{0,1}SameSite=[^\s]*\s{0,1}|\s{0,1}Secure[^\s]*\s{0,1}/gi,
                ''
            );
            header[i] = cookie;
        }
    }
};

const backendProxyReqPathResolver = (path: string, config: BackendConfig, log: Logger, bsp?: string): string => {
    let targetPath = `${config.pathPrefix ? path.replace(config.path, config.pathPrefix.replace(/\/$/, '')) : path}`;

    if (config.client) {
        const sapClient = 'sap-client=' + config.client;
        if (targetPath.match(/sap-client=[0-9]{3}/)) {
            targetPath = targetPath.replace(/sap-client=[0-9]{3}/, sapClient);
        } else {
            targetPath = targetPath.indexOf('?') !== -1 ? targetPath + '&' + sapClient : targetPath + '?' + sapClient;
        }
    }

    if (bsp) {
        const regex = new RegExp('(' + bsp + '/manifest\\.appdescr\\b)');
        // returns manifest.json if manifest.appdescr is requested
        if (targetPath.match(regex)) {
            targetPath = '/manifest.json';
        }
    }

    if (config.pathPrefix) {
        log.info(`Rewrite path ${path} > ${targetPath}`);
    } else {
        log.info(targetPath);
    }
    return targetPath;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const proxyErrorHandler = (err: any, req: Request, _res: ServerResponse): void => {
    switch (err && err.code) {
        case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY': {
            const errMsg = i18n.t('error.sslProxy');
            const error = new Error(errMsg);
            if (typeof req.next === 'function') {
                req.next(error);
            } else {
                throw error;
            }
            break;
        }
        case undefined:
            break;
        default: {
            if (typeof req.next === 'function') {
                req.next(err);
            } else {
                throw new Error(err);
            }
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
    proxyOptions: Options,
    backend: DestinationBackendConfig
): Promise<boolean> {
    let authNeeded = true;
    if (backend.destinationInstance) {
        const url = new URL(getDestinationUrlForAppStudio(backend.destination));
        url.username = await getUserForDestinationService(backend.destinationInstance);
        proxyOptions.target = url.href.replace(/\/$/, '');
    } else {
        const destinations = await listDestinations();
        const destination = destinations[backend.destination];
        if (destination) {
            authNeeded = destination.Authentication === 'NoAuthentication';
            proxyOptions.target = getDestinationUrlForAppStudio(backend.destination);
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

export async function getBackendProxy(
    backend: BackendConfig,
    common: CommonConfig,
    logger: Logger
): Promise<RequestHandler> {
    await initI18n();
    // base options
    const proxyOptions: Options = {
        secure: !common.ignoreCertError,
        changeOrigin: true,
        logLevel: common.debug ? 'debug' : 'silent',
        headers: {},
        onProxyRes: backendProxyUserResHeaderDecorator,
        onProxyReq: (proxyReq) => {
            if (proxyReq.path.indexOf('Fiorilaunchpad.html') !== -1 && !proxyReq.headersSent) {
                proxyReq.setHeader('accept-encoding', 'br');
            }
        },
        onError: proxyErrorHandler as any
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
        // check if system credentials are stored in the store
        const systemStore = await getService<BackendSystem, BackendSystemKey>({ logger, entityName: 'system' });
        const system = await systemStore.read(new BackendSystemKey({ url: backend.url, client: backend.client }));

        if (system) {
            // check if OAuth is required
            if (backend.scp) {
                if (system.serviceKeys) {
                    const provider = createForAbapOnBtp(
                        JSON.parse(system.serviceKeys as string),
                        system.refreshToken,
                        (refreshToken?: string) => {
                            if (refreshToken) {
                                logger.info('Updating refresh token for: ' + backend.url);
                                systemStore.write({ ...system, refreshToken });
                            }
                        }
                    );
                    // sending a request to the backend to get cookies
                    await provider.getAtoInfo();
                    proxyOptions.headers!['cookie'] = provider.cookies.toString();
                } else {
                    throw new Error('');
                }
            } else if (system.authenticationType === AuthenticationType.ReentranceTicket) {
                // TODO: @ulla: do we need this or is this not required?
                //const connection = await (await system.getCatalog(ODataVersion.v2)).getConnection();
                //cookies = connection.cookies;
            } else {
                if (system?.username && system?.password) {
                    proxyOptions.auth = system.username + ':' + system.password;
                } else if (process.env.FIORI_TOOLS_USER && process.env.FIORI_TOOLS_PASSWORD) {
                    proxyOptions.auth = process.env.FIORI_TOOLS_USER + ':' + process.env.FIORI_TOOLS_PASSWORD;
                }
                // TODO: how can we do this cleanly
                // monkey patch TLS to trust SAPs root CA
                //if (TlsPatch.isPatchRequired(backendConfig.url)) {
                //    TlsPatch.apply();
                //}
            }
        }
    }

    proxyOptions.pathRewrite = (path: string): string => {
        return backendProxyReqPathResolver(path, backend, logger, common.bsp);
    };

    if (backend.apiHub) {
        const apiHubKey = await getApiHubKey(logger);
        if (apiHubKey) {
            proxyOptions.headers!['apikey'] = apiHubKey;
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
