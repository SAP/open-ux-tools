import type { AxiosRequestConfig } from 'axios';
import cloneDeep from 'lodash.clonedeep';
import type { Destination } from '@sap-ux/btp-utils';
import { getDestinationUrlForAppStudio, getUserForDestinationService, isAbapSystem } from '@sap-ux/btp-utils';
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

    const instance = new ProviderType(providerConfig);
    attachConnectionHandler(instance);
    if (providerConfig.auth?.password) {
        attachBasicAuthInterceptor(instance);
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

/**
 * Create an instance of an ABAP service provider for an ABAP environment on SAP BTP.
 *
 * @param service ABAP environment service
 * @param refreshToken optional refresh token
 * @param refreshTokenChangedCb option callback for refresh token updates
 * @returns instance of an ABAP service provider
 */
export function createForAbapOnBtp(
    service: ServiceInfo,
    refreshToken?: string,
    refreshTokenChangedCb?: RefreshTokenChanged
): AbapServiceProvider {
    const provider = createInstance<AbapServiceProvider>(AbapServiceProvider, {
        baseURL: service.url
    });
    attachUaaAuthInterceptor(provider, service, refreshToken, refreshTokenChangedCb);
    return provider;
}

/**
 * Create an instance of an ABAP service provider for a Cloud ABAP system.
 *
 * @param options
 * @param options.url ABAP Service Instance URL
 * @returns instance of an ABAP service provider
 */
export function createForAbapOnCloud({
    url,
    ...config
}: { url: string } & Partial<ProviderConfiguration>): AbapServiceProvider {
    const provider = createInstance<AbapServiceProvider>(AbapServiceProvider, {
        baseURL: url,
        ...config
    });
    attachReentranceTicketAuthInterceptor({ provider });
    return provider;
}

/**
 * Create an instance of a service provider for the given destination.
 *
 * @param config axios config with additional extension specific properties
 * @param destination destination config
 * @param destinationServiceInstance optional id of a destination service instance providing the destination
 * @returns instance of a service provider
 */
export function createForDestination(
    config: AxiosRequestConfig,
    destination: Destination,
    destinationServiceInstance?: string
): ServiceProvider {
    const providerConfig: AxiosRequestConfig = {
        ...config,
        baseURL: getDestinationUrlForAppStudio(destination.Name, new URL(destination.Host).pathname)
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
            const url = new URL(provider.defaults.baseURL);
            url.username = await getUserForDestinationService(destinationServiceInstance);
            request.baseURL = provider.defaults.baseURL = url.toString();
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
