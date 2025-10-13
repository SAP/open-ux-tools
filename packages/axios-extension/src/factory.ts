import {
    type Destination,
    BAS_DEST_INSTANCE_CRED_HEADER,
    getCredentialsForDestinationService,
    getDestinationUrlForAppStudio,
    isAbapSystem,
    isAppStudio
} from '@sap-ux/btp-utils';
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { type AgentOptions, Agent as HttpsAgent } from 'https';
import { type HttpsProxyAgentOptions, HttpsProxyAgent } from 'https-proxy-agent';
import cloneDeep from 'lodash/cloneDeep';
import { getProxyForUrl } from 'proxy-from-env';
import { inspect } from 'util';
import { AbapServiceProvider } from './abap';
import type { RefreshTokenChanged, ServiceInfo } from './auth';
import {
    attachBasicAuthInterceptor,
    attachConnectionHandler,
    attachReentranceTicketAuthInterceptor,
    attachUaaAuthInterceptor
} from './auth';
import type { ODataService } from './base/odata-service';
import { TlsPatch } from './base/patchTls';
import type { ProviderConfiguration } from './base/service-provider';
import { ServiceProvider } from './base/service-provider';

type Class<T> = new (...args: any[]) => T;

/**
 * PatchedHttpsProxyAgent is a custom implementation of HttpsProxyAgent that allows to pass additional options, currently not supported by the original implementation when calling tls.connect
 */
// eslint-disable-next-line jsdoc/require-jsdoc
export class PatchedHttpsProxyAgent<Uri extends string> extends HttpsProxyAgent<Uri> {
    private readonly extraOptions: any;

    /**
     * Extension of the base constructor.
     *
     * @param proxy
     * @param opts
     */
    constructor(proxy: Uri | URL, opts?: HttpsProxyAgentOptions<Uri>) {
        super(proxy, opts);
        this.extraOptions = opts;
    }

    /**
     * Performs transparent encryption of written data and all required TLS negotiation.
     *
     * @param req
     * @param opts
     * @returns {Promise<net.Socket>}
     */
    async connect(req: any, opts: any) {
        return super.connect(req, { ...this.extraOptions, ...opts });
    }
}

/**
 * Create a new instance of given type and set default configuration merged with the given config.
 *
 * @param ProviderType class that will be instantiated
 * @param config axios config with additional extension specific properties
 * @returns instance of the provided class
 */
function createInstance<T extends ServiceProvider>(
    ProviderType: Class<T>,
    config: AxiosRequestConfig & Partial<ProviderConfiguration>
): T {
    const providerConfig: AxiosRequestConfig & Partial<ProviderConfiguration> = cloneDeep(config);
    const agentOptions = {
        rejectUnauthorized: !providerConfig.ignoreCertErrors
    };
    const localProxy = getProxyForUrl(config.baseURL);
    if (localProxy && !isAppStudio()) {
        // axios doesn't handle proxies correctly, instead use a custom agent with axios proxy disabled
        providerConfig.httpsAgent = new PatchedHttpsProxyAgent(
            localProxy,
            agentOptions as HttpsProxyAgentOptions<string>
        );
        providerConfig.httpAgent = new HttpProxyAgent(localProxy);
        providerConfig.proxy = false;
    }
    // Default httpsAgent with optional parameters passed to the agent
    if (!providerConfig.httpsAgent) {
        providerConfig.httpsAgent = new HttpsAgent(agentOptions as AgentOptions);
    }
    delete providerConfig.ignoreCertErrors;
    providerConfig.withCredentials = providerConfig?.auth && Object.keys(providerConfig.auth).length > 0;

    /**
     * Make axios throw an error for 4xx errors.
     *
     * @param status - http response status
     * @returns success (true) or error (false)
     */
    providerConfig.validateStatus = (status) => status < 400;
    const instance = new ProviderType(providerConfig);

    instance.defaults.headers = instance.defaults.headers ?? {
        common: {},
        'delete': {},
        put: {},
        get: {},
        post: {},
        head: {},
        patch: {}
    };
    attachConnectionHandler(instance);
    if (providerConfig.auth?.password) {
        attachBasicAuthInterceptor(instance);
    }

    if (config.cookies) {
        config.cookies.split(';').forEach((singleCookieStr: string) => {
            instance.cookies.addCookie(singleCookieStr.trim());
        });
    }

    if (TlsPatch.isPatchRequired(config.baseURL)) {
        TlsPatch.apply();
    }
    return instance;
}

/**
 * Create an instance of a basic service provider.
 *
 * @param config axios config with additional extension specific properties
 * @returns instance of the basic service provider
 */
export function create(config: string | (AxiosRequestConfig & Partial<ProviderConfiguration>)): ServiceProvider {
    if (typeof config === 'string') {
        return createInstance(ServiceProvider, {
            baseURL: config
        });
    } else {
        return createInstance(ServiceProvider, config);
    }
}

/**
 * Create an instance of an ABAP service provider.
 *
 * @param config axios config with additional extension specific properties
 * @returns instance of an ABAP service provider
 */
export function createForAbap(config: AxiosRequestConfig & Partial<ProviderConfiguration>): AbapServiceProvider {
    return createInstance(AbapServiceProvider, config);
}

/** Supported ABAP environments on the cloud */
export enum AbapCloudEnvironment {
    Standalone = 'Standalone',
    EmbeddedSteampunk = 'EmbeddedSteampunk'
}

/** Cloud Foundry OAuth 2.0 options */
export interface CFAOauthOptions {
    service: ServiceInfo;

    refreshToken?: string;

    refreshTokenChangedCb?: RefreshTokenChanged;
}

export interface ReentranceTicketOptions {
    /** Backend API hostname */
    url: string;
}

/** Options for an ABAP Standalone Cloud system  (ABAP on BTP) */
export interface AbapCloudStandaloneOptions extends CFAOauthOptions {
    environment: AbapCloudEnvironment.Standalone;
}

/** Options for an ABAP Embedded Steampunk system */
export interface AbapEmbeddedSteampunkOptions extends ReentranceTicketOptions {
    environment: AbapCloudEnvironment.EmbeddedSteampunk;
}

/** Discriminated union of supported environments - {@link AbapCloudStandaloneOptions} and {@link AbapEmbeddedSteampunkOptions} */
export type AbapCloudOptions = AbapCloudStandaloneOptions | AbapEmbeddedSteampunkOptions;

/**
 * Create an instance of an ABAP service provider for a Cloud ABAP system.
 *
 * @param options {@link AbapCloudOptions}
 * @returns instance of an {@link AbapServiceProvider}
 */
export function createForAbapOnCloud(options: AbapCloudOptions & Partial<ProviderConfiguration>): AbapServiceProvider {
    let provider: AbapServiceProvider;
    switch (options.environment) {
        case AbapCloudEnvironment.Standalone: {
            const { service, refreshToken, refreshTokenChangedCb, cookies, ...config } = options;
            provider = createInstance<AbapServiceProvider>(AbapServiceProvider, {
                baseURL: service.url,
                cookies,
                ...config
            });

            if (!cookies) {
                // Only in the case where a username and password are provided use UAA otherwise use re-entrance
                // This is to support unattended authentication for now.
                if (options.service?.uaa?.username && options.service.uaa.password) {
                    attachUaaAuthInterceptor(provider, service, refreshToken, refreshTokenChangedCb);
                } else {
                    // Always use re-entrance tickets regardless of the ABAP Cloud environment where credentials are not provided
                    attachReentranceTicketAuthInterceptor({ provider });
                }
            }
            break;
        }
        case AbapCloudEnvironment.EmbeddedSteampunk: {
            const { url, cookies, ...config } = options;
            provider = createInstance<AbapServiceProvider>(AbapServiceProvider, {
                baseURL: url,
                cookies,
                ...config
            });
            if (!cookies) {
                attachReentranceTicketAuthInterceptor({ provider });
            }
            break;
        }
        default:
            const opts: never = options;
            throw new Error(`Unknown environment type supplied: ${inspect(opts)}`);
    }
    return provider;
}

/**
 * To create a destination provider only the destination name is absolutely required.
 */
export type MinimalDestinationConfig = Pick<Destination, 'Name'> & Partial<Destination>;

/**
 * Create an instance of a service provider for the given destination.
 *
 * @param options axios config with additional extension specific properties
 * @param destination destination config
 * @param destinationServiceInstance optional id of a destination service instance providing the destination
 * @returns instance of a service provider
 */
export function createForDestination(
    options: AxiosRequestConfig & Partial<ProviderConfiguration>,
    destination: MinimalDestinationConfig,
    destinationServiceInstance?: string
): ServiceProvider {
    const { cookies, ...config } = options;
    const providerConfig: AxiosRequestConfig & Partial<ProviderConfiguration> = {
        ...config,
        baseURL: getDestinationUrlForAppStudio(
            destination.Name,
            destination.Host ? new URL(destination.Host).pathname : undefined
        ),
        cookies: cookies
    };

    // SAML in AppStudio is not yet supported
    providerConfig.params = providerConfig.params ?? {};
    providerConfig.params.saml2 = 'disabled';

    let provider: ServiceProvider;
    if (isAbapSystem(destination)) {
        provider = createInstance<AbapServiceProvider>(AbapServiceProvider, providerConfig);
        // For an ABAP destination flow, need to show the destination host URL property instead of the BAS host URL i.e. https://mydest.dest
        (provider as AbapServiceProvider).publicUrl = destination.Host;
    } else {
        provider = createInstance<ServiceProvider>(ServiceProvider, providerConfig);
    }

    // resolve destination service user on first request if required
    if (destinationServiceInstance) {
        const oneTimeReqInterceptorId = provider.interceptors.request.use(
            async (request: InternalAxiosRequestConfig) => {
                const credentials = await getCredentialsForDestinationService(destinationServiceInstance);
                provider.defaults.headers.common[BAS_DEST_INSTANCE_CRED_HEADER] = credentials;
                provider.interceptors.request.eject(oneTimeReqInterceptorId);
                return request;
            }
        );
    }

    return provider;
}

/**
 * Create an instance of a basic service provider and then generate an extension for a service based on the given url.
 *
 * @param url full url pointing to a service
 * @param config axios config with additional extension specific properties
 * @returns instance of a service
 */
export function createServiceForUrl(
    url: string,
    config: AxiosRequestConfig & Partial<ProviderConfiguration> = {}
): ODataService {
    const urlObject = new URL(url);
    config.baseURL = urlObject.origin;

    const searchParams = new URLSearchParams(config.params);
    for (const [key, val] of urlObject.searchParams.entries()) {
        searchParams.append(key, val);
    }
    config.params = searchParams;

    const provider = createInstance(ServiceProvider, config);

    return provider.service(urlObject.pathname);
}
