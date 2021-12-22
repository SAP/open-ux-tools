import { ServiceProvider } from '../base/service-provider';
import { CatalogService, V2CatalogService, V4CatalogService } from './catalog';

import { AtoSettings, ATO_CATALOG_URL_PATH, parseAtoResponse, TenantType } from './ato';
import { Ui5AbapRepositoryService } from './ui5-abap-repository-service';
import { AppIndexService } from './app-index-service';
import { ODataVersion } from '../base/odata-service';

export interface AbapServiceProviderExtension {
    s4Cloud: boolean | undefined;
    user(): Promise<string>;
    catalog(oDataVersion: ODataVersion): CatalogService;
    ui5AbapRepository(): Ui5AbapRepositoryService;
}

/**
 * Extension of the service provider for ABAP services.
 */
export class AbapServiceProvider extends ServiceProvider implements AbapServiceProviderExtension {
    public s4Cloud: boolean | undefined;

    protected atoSettings: AtoSettings;

    /**
     * Get the username that is currently logged in. This is the basic implementation that could be overwritten by subclasses.
     *
     * @returns the username
     */
    public user(): Promise<string> {
        return Promise.resolve(this.defaults.auth?.username);
    }

    public setAtoInfo(atoSettings: AtoSettings): void {
        this.atoSettings = atoSettings;
    }

    public async getAtoInfo(): Promise<AtoSettings> {
        if (!this.atoSettings) {
            try {
                const response = await this.get(ATO_CATALOG_URL_PATH);
                this.atoSettings = parseAtoResponse(response.data);
            } catch (error) {
                this.atoSettings = {};
                throw error;
            }
        }
        return this.atoSettings;
    }

    /**
     * Detect if the given configuration points to an S/4HANA Cloud system.
     *
     * @returns true if it an S/4HANA cloud system
     */
    public async isS4Cloud(): Promise<boolean> {
        if (this.s4Cloud === undefined) {
            try {
                const settings = await this.getAtoInfo();
                this.s4Cloud =
                    settings.tenantType === TenantType.Customer &&
                    settings.operationsType === 'C' &&
                    settings.isExtensibilityDevelopmentSystem === true &&
                    settings.developmentPrefix !== '' &&
                    settings.developmentPackage !== '';
            } catch (error) {
                this.log.warn('Failed to detect whether this is an SAP S/4HANA Cloud system or not.');
                this.s4Cloud = false;
            }
        }
        return this.s4Cloud;
    }

    /**
     * Create or get an existing instance of the catalog service for the given OData version.
     *
     * @param version OData version of the requested catalog service
     * @returns an instance of the catalog service.
     */
    public catalog(version: ODataVersion): CatalogService {
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
        Object.defineProperty(service, 'isS4Cloud', {
            get: this.isS4Cloud.bind(this)
        });
        return service;
    }

    /**
     * Create or get an existing instance of the UI5 ABAP repository service.
     *
     * @returns an instance of the UI5 ABAP repository service.
     */
    public ui5AbapRepository(): Ui5AbapRepositoryService {
        if (!this.services[Ui5AbapRepositoryService.PATH]) {
            this.services[Ui5AbapRepositoryService.PATH] = this.createService<Ui5AbapRepositoryService>(
                Ui5AbapRepositoryService.PATH,
                Ui5AbapRepositoryService
            );
        }
        return this.services[Ui5AbapRepositoryService.PATH] as Ui5AbapRepositoryService;
    }

    /**
     * Create or get an existing instance of the app index service.
     *
     * @returns an instance of the app index service.
     */
    public appIndex(): AppIndexService {
        if (!this.services[AppIndexService.PATH]) {
            this.services[AppIndexService.PATH] = this.createService<AppIndexService>(
                AppIndexService.PATH,
                AppIndexService
            );
        }
        return this.services[AppIndexService.PATH] as AppIndexService;
    }
}
