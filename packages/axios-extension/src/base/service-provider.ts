import { Axios, AxiosRequestConfig } from 'axios';
import { DevNullLogger, Logger } from '@sap-ux/logger';
import { ODataService } from './odata-service';

export type Service = Axios & { log: Logger };

export interface ProviderConfiguration {
    /**
     * Ignore certificate verification errors
     */
    ignoreCertErrors: boolean;
}

export interface ServiceProviderExtension {
    service(path: string): Service;
}

export class ServiceProvider extends Axios implements ServiceProviderExtension {
    public log: Logger = new DevNullLogger();
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
        service.log = this.log;
        service.interceptors = this.interceptors;
        return service;
    }
}
