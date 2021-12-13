import { AxiosRequestConfig } from 'axios';
import cloneDeep from 'lodash.clonedeep';
import { Destination, getDestinationUrlForAppStudio, isAbapSystem } from '@sap-ux/btp-utils';
import { Agent as HttpsAgent } from 'https';
import { attachCookieInterceptor, attachBasicAuthInterceptor, ServiceInfo, attachUaaAuthInterceptor } from './auth';
import { ServiceConfiguration, ServiceProvider } from './base/service-provider';
import { ODataService } from './base/odata-service';
import { AbapServiceProvider } from './abap';

type Class<T> = new (...args: any[]) => T;

function createInstance<T extends ServiceProvider>(
    providerType: Class<T>,
    config: AxiosRequestConfig & Partial<ServiceConfiguration>
): T {
    let providerConfig: AxiosRequestConfig & Partial<ServiceConfiguration>;
    if (typeof config === 'string') {
        providerConfig = {
            baseURL: config
        };
    } else {
        providerConfig = cloneDeep(config);
        providerConfig.httpsAgent = new HttpsAgent({
            rejectUnauthorized: !providerConfig.ignoreCertErrors
        });
        delete providerConfig.ignoreCertErrors;
        providerConfig.withCredentials = providerConfig?.auth && Object.keys(providerConfig.auth).length > 0;
    }
    const instance = new providerType(providerConfig);
    attachCookieInterceptor(instance);
    if (providerConfig.auth?.password) {
        attachBasicAuthInterceptor(instance);
    }

    return instance;
}

export function create(config: string | (AxiosRequestConfig & Partial<ServiceConfiguration>)): ServiceProvider {
    if (typeof config === 'string') {
        return createInstance(ServiceProvider, {
            baseURL: config
        });
    } else {
        return createInstance(ServiceProvider, config);
    }
}

export function createForAbap(config: AxiosRequestConfig & Partial<ServiceConfiguration>): AbapServiceProvider {
    return createInstance(AbapServiceProvider, config);
}

export function createForAbapOnBtp(service: ServiceInfo, refreshToken?: string): AbapServiceProvider {
    const provider = createInstance<AbapServiceProvider>(AbapServiceProvider, {
        baseURL: service.url
    });
    attachUaaAuthInterceptor(provider, service, refreshToken);
    return provider;
}

export async function createForDestination(
    config: AxiosRequestConfig,
    destination: Destination,
    destinationServiceInstance?: string
): Promise<ServiceProvider> {
    const providerConfig = {
        ...config,
        baseURL: await getDestinationUrlForAppStudio(destination, destinationServiceInstance)
    };
    if (isAbapSystem(destination)) {
        return createInstance(AbapServiceProvider, providerConfig);
    } else {
        return createInstance(ServiceProvider, providerConfig);
    }
}

export function createServiceForUrl(
    url: string,
    config: AxiosRequestConfig & Partial<ServiceConfiguration> = {}
): ODataService {
    const urlObject = new URL(url);
    config.baseURL = urlObject.origin;
    config.params = urlObject.searchParams;
    const provider = createInstance(ServiceProvider, config);

    return provider.service(urlObject.pathname);
}
