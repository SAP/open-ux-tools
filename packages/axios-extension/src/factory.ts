import type { AxiosRequestConfig } from 'axios';
import cloneDeep from 'lodash/cloneDeep';
import type { Destination } from '@sap-ux/btp-utils';
import {
    getDestinationUrlForAppStudio,
    getCredentialsForDestinationService,
    isAbapSystem,
    BAS_DEST_INSTANCE_CRED_HEADER
} from '@sap-ux/btp-utils';
import { Agent as HttpsAgent } from 'https';
import type { ServiceInfo, RefreshTokenChanged } from './auth';
import {
    attachConnectionHandler,
    attachBasicAuthInterceptor,
    attachUaaAuthInterceptor,
    attachReentranceTicketAuthInterceptor
} from './auth';
import type { ProviderConfiguration } from './base/service-provider';
import { ServiceProvider } from './base/service-provider';
import type { ODataService } from './base/odata-service';
import { AbapServiceProvider } from './abap';
import { inspect } from 'util';

type Class<T> = new (...args: any[]) => T;

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
    providerConfig.httpsAgent = new HttpsAgent({
        rejectUnauthorized: !providerConfig.ignoreCertErrors
    });
    delete providerConfig.ignoreCertErrors;
    providerConfig.withCredentials = providerConfig?.auth && Object.keys(providerConfig.auth).length > 0;

    /**
     * Make axios throw an error for 4xx errors as well.
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
type AbapCloudOptions = AbapCloudStandaloneOptions | AbapEmbeddedSteampunkOptions;

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
                attachUaaAuthInterceptor(provider, service, refreshToken, refreshTokenChangedCb);
            }
            break;
        }
        case AbapCloudEnvironment.EmbeddedSteampunk: {
            const { url, cookies, ...config } = options;
            provider = createInstance<AbapServiceProvider>(AbapServiceProvider, {
                baseURL: url,
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
        provider = createInstance(AbapServiceProvider, providerConfig);
    } else {
        provider = createInstance(ServiceProvider, providerConfig);
    }

    // resolve destination service user on first request if required
    if (destinationServiceInstance) {
        const oneTimeReqInterceptorId = provider.interceptors.request.use(async (request: AxiosRequestConfig) => {
            const credentials = await getCredentialsForDestinationService(destinationServiceInstance);
            provider.defaults.headers.common[BAS_DEST_INSTANCE_CRED_HEADER] = credentials;
            provider.interceptors.request.eject(oneTimeReqInterceptorId);
            return request;
        });
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
    config.params = urlObject.searchParams;
    const provider = createInstance(ServiceProvider, config);

    return provider.service(urlObject.pathname);
}
