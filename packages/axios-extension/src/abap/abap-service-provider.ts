import { ServiceProvider } from '../base/service-provider';
import type { CatalogService } from './catalog';
import { V2CatalogService, V4CatalogService } from './catalog';

import type { AtoSettings } from './ato';
import { parseAtoResponse, TenantType } from './ato';
import { Ui5AbapRepositoryService } from './ui5-abap-repository-service';
import { AppIndexService } from './app-index-service';
import { ODataVersion } from '../base/odata-service';
import { LayeredRepositoryService } from './lrep-service';
import { adt, adtSchema } from './adt';
import type { AdtCollection } from './types';
import { AdtSchemaStore } from './adt/adtSchemaStore';
import type { AbapServiceProviderExtension } from './interface';

/**
 * Extension of the service provider for ABAP services.
 */
export class AbapServiceProvider extends ServiceProvider implements AbapServiceProviderExtension {
    public s4Cloud: boolean | undefined;

    protected atoSettings: AtoSettings;

    protected schemaStore = new AdtSchemaStore();

    public getSchemaStore(): AdtSchemaStore {
        return this.schemaStore;
    }

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
     * @param schema Auto fill by adt decorator process
     * @returns ABAP Transport Organizer settings
     */
    @adt('settings')
    public async getAtoInfo(
        dummy1: string,
        dummy2: string,
        @adtSchema schema?: AdtCollection,
        dummy3?: string
    ): Promise<AtoSettings> {
        if (!schema) {
            this.atoSettings = {};
        } else if (!this.atoSettings) {
            try {
                const url = schema.href;
                console.log(schema.accept);
                const acceptHeaderValue = schema.accept.find((accept) => accept.includes('xml'));
                const acceptHeaders = {
                    headers: {
                        Accept: acceptHeaderValue
                    }
                };
                console.log(acceptHeaderValue);
                const response = await this.get(url, acceptHeaders);
                this.atoSettings = parseAtoResponse(response.data);
            } catch (error) {
                this.atoSettings = {};
                throw error;
            }
        }
        return this.atoSettings;
    }

    // public async getADTSerivce(path: string, config: any): Promise<void> {
    //     try {
    //         const response = await this.get(path, config);
    //         console.log(response.data);
    //     } catch (error) {
    //         throw error;
    //     }
    // }

    /**
     * Detect if the given configuration points to an S/4HANA Cloud system.
     *
     * @returns true if it an S/4HANA cloud system
     */
    public async isS4Cloud(): Promise<boolean> {
        if (this.s4Cloud === undefined) {
            try {
                const settings = await this.getAtoInfo('', '', undefined, '');
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

    /**
     * Create or get an existing instance of design time adaptation service.
     *
     * @returns an instance of the design time adaptation service.
     */
    public layeredRepository(): LayeredRepositoryService {
        if (!this.services[LayeredRepositoryService.PATH]) {
            this.services[LayeredRepositoryService.PATH] = this.createService<LayeredRepositoryService>(
                LayeredRepositoryService.PATH,
                LayeredRepositoryService
            );
        }
        return this.services[LayeredRepositoryService.PATH] as LayeredRepositoryService;
    }
}
