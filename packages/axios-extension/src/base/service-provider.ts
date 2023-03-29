import type { AxiosRequestConfig } from 'axios';
import { Axios } from 'axios';
import type { Logger } from '@sap-ux/logger';
import { ToolsLogger } from '@sap-ux/logger';
import { ODataService } from './odata-service';
import { Cookies } from '../auth';

export type Service = Axios & { log: Logger };

export interface ProviderConfiguration {
    /**
     * Ignore certificate verification errors
     */
    ignoreCertErrors: boolean;
    /**
     * Value to be passed into the `Cookie` request header
     * https://datatracker.ietf.org/doc/html/rfc6265#section-4.2
     */
    cookies: string;
}

export interface ServiceProviderExtension {
    service(path: string): Service;
}

/**
 * Basic service provider class containing generic functionality to create and keep service instances as well as logging
 */
export class ServiceProvider extends Axios implements ServiceProviderExtension {
    public readonly log: Logger = new ToolsLogger();

    public readonly cookies: Cookies = new Cookies();

    protected readonly services: { [path: string]: Service } = {};

    /**
     * Create a service instance or return an existing one for the given path.
     *
     * @param path path of the service relative to the service provider
     * @returns a service instance
     */
    service<T extends Service = ODataService>(path: string): T {
        if (!this.services[path]) {
            this.services[path] = this.createService<T>(path, ODataService);
        }
        return this.services[path] as T;
    }

    /**
     * Create an axios configuration for a new service instance.
     *
     * @param path path of the service relative to the service provider
     * @returns axios config
     */
    protected generateServiceConfig(path: string): AxiosRequestConfig {
        const config = Object.assign({}, this.defaults);
        return {
            ...config,
            baseURL: this.defaults.baseURL + path,
            headers: this.defaults.headers?.common ?? {}
        };
    }

    /**
     * Create a service instance for the given path, service class and public URL.
     *
     * @param path path of the service relative to the service provider
     * @param ServiceClass class type to be used to create an instance
     * @param publicUrl the public URL exposing the ABAP UI application, defaults to the Axios base URL if not configured
     * @returns a service instance
     */
    protected createService<T extends Service>(path: string, ServiceClass: any, publicUrl = this.defaults.baseURL): T {
        const service = new ServiceClass(this.generateServiceConfig(path), publicUrl);
        service.log = this.log;
        service.interceptors = this.interceptors;
        return service;
    }

    /**
     * Retrieve the public URL exposing the ABAP UI application.
     *
     * @returns string Axios Base URL
     */
    protected getPublicUrl(): string {
        return this.defaults.baseURL;
    }
}
