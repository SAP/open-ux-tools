import { AxiosRequestConfig } from 'axios';
import { ServiceProvider, ServiceConfiguration } from '../base/service-provider';
import { ODataVersion } from '../types';
import { CatalogService, V2CatalogService, V4CatalogService } from './catalog';

import { ATO_CATALOG_URL_PATH, parseAtoResponse, TenantType } from './ato';
import { Ui5AbapRepositoryService } from './ui5-abap-repository-service';
import { ServiceInfo } from 'auth/service-info';
import { attachUaaAuthInterceptor } from '../auth';
import { AppIndexService } from './app-index-service';

export interface AbapServiceProviderExtension {
    s4Cloud: boolean | undefined;
    catalog(oDataVersion: ODataVersion): Promise<CatalogService>;
    ui5AbapRepository(): Ui5AbapRepositoryService;
}

export class AbapServiceProvider extends ServiceProvider implements AbapServiceProviderExtension {
    public s4Cloud: boolean | undefined;

    public async isS4Cloud(): Promise<boolean> {
        if (this.s4Cloud === undefined) {
            const response = await this.get(ATO_CATALOG_URL_PATH);
            const settings = parseAtoResponse(response.data);
            this.s4Cloud =
                settings.tenantType === TenantType.Customer &&
                settings.operationsType === 'C' &&
                settings.isExtensibilityDevelopmentSystem === true &&
                settings.developmentPrefix !== '' &&
                settings.developmentPackage !== '';
        }
        return this.s4Cloud;
    }

    public async catalog(version: ODataVersion): Promise<CatalogService> {
        let service: CatalogService;
        if (version === ODataVersion.v2) {
            service =
                (this.services[V2CatalogService.PATH] as CatalogService) ??
                this.createService<CatalogService>(V2CatalogService.PATH, V2CatalogService);
        } else if (version === ODataVersion.v4) {
            service =
                (this.services[V4CatalogService.PATH] as CatalogService) ??
                this.createService<CatalogService>(V4CatalogService.PATH, V4CatalogService);
        } else {
            throw new Error('not implemented yet');
        }
        service.s4cloud = await this.isS4Cloud();
        return service;
    }

    public ui5AbapRepository(): Ui5AbapRepositoryService {
        if (!this.services[Ui5AbapRepositoryService.PATH]) {
            this.services[Ui5AbapRepositoryService.PATH] = this.createService<Ui5AbapRepositoryService>(
                Ui5AbapRepositoryService.PATH,
                Ui5AbapRepositoryService
            );
        }
        return this.services[Ui5AbapRepositoryService.PATH] as Ui5AbapRepositoryService;
    }

    public appIndex(): AppIndexService {
        if (!this.services[AppIndexService.PATH]) {
            this.services[AppIndexService.PATH] = this.createService<AppIndexService>(
                AppIndexService.PATH,
                AppIndexService
            );
        }
        return this.services[AppIndexService.PATH] as AppIndexService;
    }

    public static create(config: string | (AxiosRequestConfig & Partial<ServiceConfiguration>)): AbapServiceProvider {
        return ServiceProvider.createInstance<AbapServiceProvider>(AbapServiceProvider, config);
    }

    public static createForAbapOnBtp(service: ServiceInfo, refreshToken?: string): AbapServiceProvider {
        const provider = ServiceProvider.createInstance<AbapServiceProvider>(AbapServiceProvider, {
            baseURL: service.url
        });
        attachUaaAuthInterceptor(provider, service, refreshToken);
        return provider;
    }
}
