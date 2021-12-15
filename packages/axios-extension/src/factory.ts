import { AxiosRequestConfig } from 'axios';
import cloneDeep from 'lodash.clonedeep';
import { Destination, getDestinationUrlForAppStudio, isAbapSystem } from '@sap-ux/btp-utils';
import { Agent as HttpsAgent } from 'https';
import {
    attachConnectionHandler,
    attachBasicAuthInterceptor,
    ServiceInfo,
    attachUaaAuthInterceptor,
    RefreshTokenChanged
} from './auth';
import { ProviderConfiguration, ServiceProvider } from './base/service-provider';
import { ODataService } from './base/odata-service';
import { AbapServiceProvider } from './abap';

type Class<T> = new (...args: any[]) => T;

function createInstance<T extends ServiceProvider>(
    providerType: Class<T>,
    config: AxiosRequestConfig & Partial<ProviderConfiguration>
): T {
    let providerConfig: AxiosRequestConfig & Partial<ProviderConfiguration>;

    providerConfig = cloneDeep(config);
    providerConfig.httpsAgent = new HttpsAgent({
        rejectUnauthorized: !providerConfig.ignoreCertErrors
    });
    delete providerConfig.ignoreCertErrors;
    providerConfig.withCredentials = providerConfig?.auth && Object.keys(providerConfig.auth).length > 0;

    const instance = new providerType(providerConfig);
    attachConnectionHandler(instance);
    if (providerConfig.auth?.password) {
        attachBasicAuthInterceptor(instance);
    }

    return instance;
}

export function create(config: string | (AxiosRequestConfig & Partial<ProviderConfiguration>)): ServiceProvider {
    if (typeof config === 'string') {
        return createInstance(ServiceProvider, {
            baseURL: config
        });
    } else {
        return createInstance(ServiceProvider, config);
    }
}

export function createForAbap(config: AxiosRequestConfig & Partial<ProviderConfiguration>): AbapServiceProvider {
    return createInstance(AbapServiceProvider, config);
}

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

export async function createForDestination(
    config: AxiosRequestConfig,
    destination: Destination,
    destinationServiceInstance?: string
): Promise<ServiceProvider> {
    const providerConfig = {
        ...config,
        baseURL: await getDestinationUrlForAppStudio(
            destination.Name,
            destinationServiceInstance,
            new URL(destination.Host).pathname
        )
    };

    // SAML in AppStudio is not yet supported
    providerConfig.params = providerConfig.params ?? {};
    providerConfig.params.saml2 = 'disabled';

    if (isAbapSystem(destination)) {
        return createInstance(AbapServiceProvider, providerConfig);
    } else {
        return createInstance(ServiceProvider, providerConfig);
    }
}

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
