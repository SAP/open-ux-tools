import { ServiceProvider } from '../base/service-provider';
import type { CatalogService } from './catalog';
import { V2CatalogService, V4CatalogService } from './catalog';
import type { AdtServices } from './adt-catalog';
import { Ui5AbapRepositoryService } from './ui5-abap-repository-service';
import { AppIndexService } from './app-index-service';
import { ODataVersion } from '../base/odata-service';
import { LayeredRepositoryService } from './lrep-service';
import { AdtServiceName, AdtServiceConfigs, parseAtoResponse, TenantType } from './adt-catalog';
import type { AbapServiceProviderExtension } from './abap-service-provider-extension';
import { getTransportNumberFromResponse, getTransportRequestList } from './adt-catalog/handlers/transport';
import { AdtCatalogService } from './adt-catalog/adt-catalog-service';
import type { AdtCollection, TransportRequest } from './types';

/**
 * Extension of the service provider for ABAP services.
 */
export class AbapServiceProvider extends ServiceProvider {
    public s4Cloud: boolean | undefined;

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
        let serviceSchema: AdtCollection;
        try {
            serviceSchema = await this.getAdtCatalogService().getServiceDefinition(
                AdtServiceConfigs[AdtServiceName.AtoSettings]
            );
        } catch {
            // Service not available on target ABAP backend version, return empty setting config
            this.atoSettings = {};
            return this.atoSettings;
        }

        if (!this.atoSettings) {
            try {
                const acceptHeaders = {
                    headers: {
                        Accept: 'application/*'
                    }
                };
                const response = await this.get(serviceSchema.href, acceptHeaders);
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
     * @returns an instance of the UI5 ABAP repository service.
     */
    public get ui5AbapRepository(): Ui5AbapRepositoryService {
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
    public get appIndex(): AppIndexService {
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
    public get layeredRepository(): LayeredRepositoryService {
        if (!this.services[LayeredRepositoryService.PATH]) {
            this.services[LayeredRepositoryService.PATH] = this.createService<LayeredRepositoryService>(
                LayeredRepositoryService.PATH,
                LayeredRepositoryService
            );
        }
        return this.services[LayeredRepositoryService.PATH] as LayeredRepositoryService;
    }

    public getAdtService<T extends AdtService>(serviceName: AdtServiceName): T {
        if (!this.services[AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH]) {
            const adtCatalogSerivce = this.createService<AdtCatalogService>(
                AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH,
                AdtCatalogService
            );
            this.services[AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH] = new AdtServices(adtCatalogSerivce);
        }

        return this.services[AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH] as AdtServices;
    }

    /**
     *
     * @param packageName Package name for deployment
     * @param appName Fiori project name for deployment. A new project that has not been deployed before is also allowed
     * @returns array of transports id's
     */
    public async getTransportRequests(packageName: string, appName: string): Promise<TransportRequest[]> {
        let serviceSchema: AdtCollection;
        try {
            serviceSchema = await this.getAdtCatalogService().getServiceDefinition(
                AdtServiceConfigs[AdtServiceName.TransportChecks]
            );
        } catch {
            // Service not available on target ABAP backend version, return empty setting config
            return [];
        }

        if (!serviceSchema || !serviceSchema.href) {
            return [];
        }
        const urlPath = serviceSchema.href;
        const acceptHeaders = {
            headers: {
                Accept: 'application/vnd.sap.as+xml; dataname=com.sap.adt.transport.service.checkData',
                'content-type':
                    'application/vnd.sap.as+xml; charset=UTF-8; dataname=com.sap.adt.transport.service.checkData'
            }
        };

        const data = `
                <?xml version="1.0" encoding="UTF-8"?>
                <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
                    <asx:values>
                        <DATA>
                        <PGMID/>
                        <OBJECT/>
                        <OBJECTNAME/>
                        <DEVCLASS>${packageName}</DEVCLASS>
                        <SUPER_PACKAGE/>
                        <OPERATION>I</OPERATION>
                        <URI>/sap/bc/adt/filestore/ui5-bsp/objects/${appName}/$create</URI>
                        </DATA>
                    </asx:values>
                </asx:abap>
            `;

        const response = await this.post(urlPath, data, acceptHeaders);
        return getTransportRequestList(response.data, this.log);
    }

    /**
     *
     * @param description Description of the new transport request to be created
     * @returns Newly created transport request number
     */
    public async createTransportRequest(description: string): Promise<string> {
        let serviceSchema: AdtCollection;
        try {
            serviceSchema = await this.getAdtCatalogService().getServiceDefinition(
                AdtServiceConfigs[AdtServiceName.CreateTransport]
            );
        } catch {
            // Service not available on target ABAP backend version, return empty string
            return '';
        }

        if (!serviceSchema || !serviceSchema.href) {
            return '';
        }
        const urlPath = serviceSchema.href;
        const acceptHeaders = {
            headers: {
                Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
                'content-type': 'text/plain'
            }
        };

        const data = `
                <?xml version="1.0" encoding="ASCII"?>
                <tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" tm:useraction="newrequest">
                    <tm:request tm:desc="${description}" tm:type="K" tm:target="LOCAL" tm:cts_project="">
                        <tm:task tm:owner=""/>
                    </tm:request>
                </tm:root>
            `;
        const response = await this.post(urlPath, data, acceptHeaders);
        return getTransportNumberFromResponse(response.data, this.log);
    }
}
