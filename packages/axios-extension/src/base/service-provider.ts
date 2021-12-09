import { Axios, AxiosRequestConfig } from 'axios';
import { Logger } from '@sap-ux/logger';
import { Destination } from '@sap-ux/btp-utils';
import { Agent as HttpsAgent } from 'https';
import { attachCookieInterceptor, attachBasicAuthInterceptor } from '../auth';
import { ODataService } from './odata-service';
import cloneDeep from 'lodash.clonedeep';

export type Service = Axios;

export interface ServiceConfiguration {
    ignoreCertErrors: boolean;
}

export interface ServiceProviderExtension {
    service(path: string): Service;
}

type Class<T> = new (...args: any[]) => T;

export class ServiceProviderFactory extends Axios {
    protected static createInstance<T extends Axios>(
        providerType: Class<T>,
        config: string | (AxiosRequestConfig & Partial<ServiceConfiguration>)
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

    public static create(config: string | (AxiosRequestConfig & Partial<ServiceConfiguration>)): ServiceProvider {
        return ServiceProvider.createInstance<ServiceProvider>(ServiceProvider, config);
    }

    public static createForDestination(destination: Destination): ServiceProvider {
        // TODO
        const config = { baseURL: destination.Host };
        return ServiceProvider.createInstance<ServiceProvider>(ServiceProvider, config);
    }

    public static createServiceForUrl(
        url: string,
        config: AxiosRequestConfig & Partial<ServiceConfiguration> = {}
    ): ODataService {
        const urlObject = new URL(url);
        config.baseURL = urlObject.origin;
        config.params = urlObject.searchParams;
        const provider = this.createInstance<ServiceProvider>(ServiceProvider, config);

        return provider.service(urlObject.pathname);
    }
}

export class ServiceProvider extends ServiceProviderFactory implements ServiceProviderExtension {
    public log: Logger;
    protected readonly services: { [path: string]: Service } = {};

    service<T extends Service = ODataService>(path: string): T {
        if (!this.services[path]) {
            this.services[path] = this.createService<T>(path, ODataService);
        }
        return this.services[path] as T;
    }

    protected generateServiceConfig(path: string): AxiosRequestConfig {
        const config = Object.assign({}, this.defaults);
        return {
            ...config,
            baseURL: this.defaults.baseURL + path,
            headers: this.defaults.headers?.common ?? {}
        };
    }

    protected createService<T extends Service>(path: string, serviceClass: any): T {
        const service = new serviceClass(this.generateServiceConfig(path));
        service.interceptors = this.interceptors;
        return service;
    }
}
