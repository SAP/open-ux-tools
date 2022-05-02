import HttpsProxyAgent from 'https-proxy-agent';
import { IncomingMessage, ServerResponse } from 'http';
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
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import type { BackendConfig, CommonConfig } from './types';

import {
    ApiHubSettings,
    ApiHubSettingsKey,
    AuthenticationType,
    BackendSystem,
    BackendSystemKey,
    getService
} from '@sap-ux/store';
import { isHostExcludedFromProxy, promptUserPass } from './config';

/**
 * Return the SAP API Hub key either provided as environment variable (including .env file) or from the secure store when not running in AppStudio.
 * not found or error while extracting the key.
 *
 * @param log - logger to report errors
 */
async function getApiHubKey(logger: Logger): Promise<string | undefined> {
    let apiHubKey: string | undefined = process.env.API_HUB_API_KEY;
    if (!apiHubKey && !isAppStudio()) {
        const apiHubStore = await getService<ApiHubSettings, ApiHubSettingsKey>({ logger, entityName: 'api-hub' });
        const apiHubSettings = await apiHubStore.read();
        apiHubKey = apiHubSettings ? apiHubSettings.apiKey : undefined;
    }
    return apiHubKey;
}

const backendProxyUserResHeaderDecorator = (proxyRes: IncomingMessage): void => {
    // retrieve the set-cookie headers from the response and transform secure cookies to insecure ones
    const setCookie = 'set-cookie';
    if (proxyRes.headers[setCookie]) {
        for (let i = proxyRes.headers[setCookie].length - 1; i >= 0; i--) {
            const cookie = proxyRes.headers[setCookie][i].replace(
                /\s{0,1}Domain=[^\s]*\s{0,1}|\s{0,1}SameSite=[^\s]*\s{0,1}|\s{0,1}Secure[^\s]*\s{0,1}/gi,
                ''
            );
            proxyRes.headers['set-cookie'][i] = cookie;
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
            const errMsg = i18next.t('SSL_PROXY_ERROR');
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

export async function getBackendProxy(
    backend: BackendConfig,
    common: CommonConfig,
    logger: Logger
): Promise<RequestHandler> {
    // base options
    const proxyConfig: Options = {
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
        pathRewrite: (path: string): string => {
            return backendProxyReqPathResolver(path, backend, logger, common.bsp);
        },
        onError: proxyErrorHandler
    };

    let authNeeded = true;

    // overwrite url if running in AppStudio
    if (isAppStudio()) {
        const destinationName = backend.destination || process.env.FIORI_TOOLS_DESTINATION;
        if (destinationName) {
            if (backend.destinationInstance) {
                const url = new URL(getDestinationUrlForAppStudio(destinationName));
                url.username = await getUserForDestinationService(backend.destinationInstance);
                proxyConfig.target = url.toString();
            } else {
                const destinations = await listDestinations();
                const destination = destinations[destinationName];
                if (destination) {
                    authNeeded = destination.Authentication === 'NoAuthentication';
                    proxyConfig.target = getDestinationUrlForAppStudio(destinationName);
                    // if the pathPrefix is maintained in the yaml file add it instead of the path to the service URI.
                    // Needed in the case of re-use libs
                    // TODO: need to understand this
                    if (isFullUrlDestination(destination)) {
                        backend.pathPrefix = `${target.service ? target.service : ''}`;
                        backend.path = target.destinationServiceUrl.replace(/\/$/, '');
                    } else {
                        backend.pathPrefix = `${target.service ? target.service : ''}${
                            backendConfig.pathPrefix ? backendConfig.pathPrefix : backendConfig.path || ''
                        }`;
                    }
                } else {
                    throw new Error();
                }
            }
            logger.info('Using destination: ' + destinationName);
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
                    proxyConfig.headers!['cookie'] = provider.cookies.toString();
                } else {
                    throw new Error('');
                }
            } else if (system.authenticationType === AuthenticationType.ReentranceTicket) {
                // TODO: @ulla: do we need this or is this not required?
                //const connection = await (await system.getCatalog(ODataVersion.v2)).getConnection();
                //cookies = connection.cookies;
            } else {
                if (system?.username && system?.password) {
                    proxyConfig.auth = system.username + ':' + system.password;
                } else if (process.env.FIORI_TOOLS_USER && process.env.FIORI_TOOLS_PASSWORD) {
                    proxyConfig.auth = process.env.FIORI_TOOLS_USER + ':' + process.env.FIORI_TOOLS_PASSWORD;
                }
                // TODO: how can we do this cleanly
                // monkey patch TLS to trust SAPs root CA
                //if (TlsPatch.isPatchRequired(backendConfig.url)) {
                //    TlsPatch.apply();
                //}
            }
        }
    }

    if (backend.apiHub) {
        const apiHubKey = await getApiHubKey(logger);
        if (apiHubKey) {
            proxyConfig.headers!['apikey'] = apiHubKey;
        }
    }

    if (backend.ws) {
        proxyConfig.ws = true;
    }

    if (backend.xfwd) {
        proxyConfig.xfwd = true;
    }

    if (common.proxy && !isHostExcludedFromProxy(common.noProxyList, backend.url)) {
        proxyConfig.agent = new HttpsProxyAgent(common.proxy);
    }

    if (common.bsp) {
        const regex = new RegExp('(' + common.bsp + '/manifest\\.appdescr\\b)');
        proxyConfig.router = (req): string | undefined => {
            // redirects the request for manifest.appdescr to localhost
            if (req.path.match(regex)) {
                return req.protocol + '://' + req.headers.host;
            }
        };

        if (!proxyConfig.auth && authNeeded) {
            proxyConfig.auth = await promptUserPass(logger);
        }
    }

    logger.info(
        `Backend proxy created for ${proxyConfig.target ? proxyConfig.target : ''} ${backend.path ? backend.path : ''}`
    );
    return createProxyMiddleware(proxyConfig);
}
