import { ServiceProvider } from '../base/service-provider';
import type { CatalogService } from './catalog';
import { V2CatalogService, V4CatalogService } from './catalog';
import { Ui5AbapRepositoryService } from './ui5-abap-repository-service';
import { AppIndexService } from './app-index-service';
import { ODataVersion } from '../base/odata-service';
import { LayeredRepositoryService } from './lrep-service';
import { AdtCatalogService } from './adt-catalog/adt-catalog-service';
import type { AtoSettings } from './types';
import { TenantType } from './types';
// Can't use an `import type` here. We need the classname at runtime to create object instances:
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AdtService, AtoService } from './adt-catalog/services';

/**
 * Extension of the service provider for ABAP services.
 */
export class AbapServiceProvider extends ServiceProvider {
    public s4Cloud: boolean | undefined;

    protected atoSettings: AtoSettings;

    /**
     * Get the name of the currently logged in user. This is the basic implementation that could be overwritten by subclasses.
     * The function returns a promise because it may be required to fetch the information from the backend.
     *
     * @returns the username
     */
    public user(): Promise<string | undefined> {
        return Promise.resolve(this.defaults.auth?.username);
    }

    /**
     * Set the ATO settings for the provider so that it does not try to fetch them with the first request.
     *
     * @param atoSettings ABAP Transport Organizer settings
     */
    public setAtoInfo(atoSettings: AtoSettings) {
        this.atoSettings = atoSettings;
    }

    /**
     * Get the ATO settings either locally or from the server if not yet available.
     *
     * @returns ABAP Transport Organizer settings
     */
    public async getAtoInfo(): Promise<AtoSettings> {
        if (this.atoSettings) {
            return this.atoSettings;
        }
        let atoService: AtoService;
        try {
            atoService = await this.getAdtService<AtoService>(AtoService);
            if (atoService) {
                this.atoSettings = await atoService.getAtoInfo();
            } else {
                this.atoSettings = {};
            }
        } catch (error) {
            this.atoSettings = {};
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
     * Create or get an existing instance of AdtCatalogService for fetching ADT schema.
     *
     * @returns AdtCatalogService
     */
    private getAdtCatalogService(): AdtCatalogService {
        if (!this.services[AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH]) {
            const adtCatalogSerivce = this.createService<AdtCatalogService>(
                AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH,
                AdtCatalogService
            );
            this.services[AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH] = adtCatalogSerivce;
        }

        return this.services[AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH] as AdtCatalogService;
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
     * @param alias - optional alias path on which the UI5Repository service is exposed
     * @returns an instance of the UI5 ABAP repository service.
     */
    public getUi5AbapRepository(alias?: string): Ui5AbapRepositoryService {
        const path = alias ?? Ui5AbapRepositoryService.PATH;
        if (!this.services[path]) {
            this.services[path] = this.createService<Ui5AbapRepositoryService>(path, Ui5AbapRepositoryService);
        }
        return this.services[path] as Ui5AbapRepositoryService;
    }

    /**
     * Create or get an existing instance of the app index service.
     *
     * @returns an instance of the app index service.
     */
    public getAppIndex(): AppIndexService {
        if (!this.services[AppIndexService.PATH]) {
            this.services[AppIndexService.PATH] = this.createService<AppIndexService>(
                AppIndexService.PATH,
                AppIndexService
            );
        }
        return this.services[AppIndexService.PATH] as AppIndexService;
    }

    /**
     * Create or get an existing instance of design time adaptation service.
     *
     * @returns an instance of the design time adaptation service.
     */
    public getLayeredRepository(): LayeredRepositoryService {
        if (!this.services[LayeredRepositoryService.PATH]) {
            this.services[LayeredRepositoryService.PATH] = this.createService<LayeredRepositoryService>(
                LayeredRepositoryService.PATH,
                LayeredRepositoryService
            );
        }
        return this.services[LayeredRepositoryService.PATH] as LayeredRepositoryService;
    }

    /**
     * Retrieve singleton instance of AdtService subclass to serve the specific ADT request query.
     *
     * @example
     * ```ts
     * const transportRequestSerivce = abapServiceProvider.getAdtService<TransportRequestService>(TransportRequestService);
     * ```
     * @param adtServiceSubclass Subclass of class AdtService, type is specified by using AdtService class constructor signature.
     * @returns Subclass type of class AdtService
     */
    public async getAdtService<T extends AdtService>(adtServiceSubclass: typeof AdtService): Promise<T | null> {
        const subclassName = adtServiceSubclass.name;
        if (!this.services[subclassName]) {
            // Retrieve ADT schema for the specific input AdtService subclass
            const adtCatalogSerivce = this.getAdtCatalogService();
            const adtSchema = await adtCatalogSerivce.getServiceDefinition(adtServiceSubclass.getAdtCatagory());
            // No ADT schema available neither locally nor from service query.
            if (!adtSchema) {
                return null;
            }
            // Create singleton instance of AdtService subclass
            this.services[subclassName] = this.createService<T>(adtSchema.href, adtServiceSubclass);
            (this.services[subclassName] as AdtService).attachAdtSchema(adtSchema);
        }

        return this.services[subclassName] as T;
    }
}
