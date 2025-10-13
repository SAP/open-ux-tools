import { ODataVersion } from '../base/odata-service';
import { ServiceProvider } from '../base/service-provider';
import { AdtCatalogService } from './adt-catalog/adt-catalog-service';
import { AppIndexService } from './app-index-service';
import type { CatalogService } from './catalog';
import { V2CatalogService, V4CatalogService } from './catalog';
import { LayeredRepositoryService } from './lrep-service';
import type { AbapCDSView, AtoSettings, BusinessObject, SystemInfo } from './types';
import { TenantType } from './types';
import { Ui5AbapRepositoryService } from './ui5-abap-repository-service';
// Can't use an `import type` here. We need the classname at runtime to create object instances:
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ODataServiceGenerator } from './adt-catalog/generators/odata-service-generator';
import type { GeneratorEntry } from './adt-catalog/generators/types';
import { UiServiceGenerator } from './adt-catalog/generators/ui-service-generator';
import { type AdtService, AtoService, GeneratorService, RapGeneratorService } from './adt-catalog/services';
import { SystemInfoService } from './adt-catalog/services/systeminfo-service';

/**
 * Extension of the service provider for ABAP services.
 */
export class AbapServiceProvider extends ServiceProvider {
    protected atoSettings: AtoSettings;

    /**
     * Maintain the public facing URL which is required for destination related flows
     */
    protected _publicUrl: string;

    /**
     * The connected system info
     */
    protected _systemInfo: SystemInfo | undefined;

    /**
     * Get the name of the currently logged in user. This is the basic implementation that could be overwritten by subclasses.
     * The function returns a promise because it may be required to fetch the information from the backend.
     *
     * @returns the username
     */
    public async user(): Promise<string | undefined> {
        return (await Promise.resolve(this.defaults.auth?.username)) || (await this.getSystemInfo())?.userName;
    }

    /**
     * Get user information.
     *
     * @returns user name or undefined
     */
    public async getSystemInfo(): Promise<SystemInfo | undefined> {
        if (this._systemInfo) {
            return this._systemInfo;
        }
        try {
            const systemInfoService = this.createService<SystemInfoService>('', SystemInfoService);
            this._systemInfo = await systemInfoService.getSystemInfo();
        } catch (error) {
            this.log.error(`An error occurred retrieving system info: ${error}`);
        }
        return this._systemInfo;
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
     * Set the public facing URL, typically used for a destination related flows.
     *
     * @param host
     */
    public set publicUrl(host: string) {
        this._publicUrl = host;
    }

    /**
     * Retrieve the public facing URL, default to Axios base URL if not configured.
     *
     * @returns string Axios baseUrl if public URL is not configured by a destination
     */
    public get publicUrl(): string {
        return this._publicUrl || this.defaults.baseURL;
    }

    /**
     * Detect if the given configuration points to an S/4HANA Cloud system.
     *
     * @returns true if it an S/4HANA cloud system
     */
    public async isAbapCloud(): Promise<boolean> {
        if (this.atoSettings === undefined) {
            await this.getAtoInfo();
        }
        return this.atoSettings.tenantType === TenantType.Customer && this.atoSettings.operationsType === 'C';
    }

    /**
     * Create or get an existing instance of AdtCatalogService for fetching ADT schema.
     *
     * @returns AdtCatalogService
     */
    private getAdtCatalogService(): AdtCatalogService {
        if (!this.services[AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH]) {
            const adtCatalogService = this.createService<AdtCatalogService>(
                AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH,
                AdtCatalogService
            );
            this.services[AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH] = adtCatalogService;
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
        Object.defineProperty(service, 'isAbapCloud', {
            get: this.isAbapCloud.bind(this)
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
     * @param alias - optional alias path on which the LREP service is exposed
     * @returns an instance of the design time adaptation service.
     */
    public getLayeredRepository(alias?: string): LayeredRepositoryService {
        const path = alias ?? LayeredRepositoryService.PATH;
        if (!this.services[path]) {
            this.services[path] = this.createService<LayeredRepositoryService>(path, LayeredRepositoryService);
        }
        return this.services[path] as LayeredRepositoryService;
    }

    /**
     * Retrieve singleton instance of AdtService subclass to serve the specific ADT request query.
     *
     * @example
     * ```ts
     * const transportRequestService = abapServiceProvider.getAdtService<TransportRequestService>(TransportRequestService);
     * ```
     * @param adtServiceSubclass Subclass of class AdtService, type is specified by using AdtService class constructor signature.
     * @returns Subclass type of class AdtService
     */
    public async getAdtService<T extends AdtService>(adtServiceSubclass: typeof AdtService): Promise<T | null> {
        const subclassName = adtServiceSubclass.name;
        if (!this.services[subclassName]) {
            // Retrieve ADT schema for the specific input AdtService subclass
            const adtCatalogService = this.getAdtCatalogService();
            const adtSchema = await adtCatalogService.getServiceDefinition(adtServiceSubclass.getAdtCatagory());
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

    /**
     * Create a UI Service generator for the given referenced object.
     *
     * @param referencedObject - referenced object (business object or abap cds view)
     * @returns a UI Service generator
     */
    public async getUiServiceGenerator(referencedObject: BusinessObject | AbapCDSView): Promise<UiServiceGenerator> {
        const generatorService = await this.getAdtService<GeneratorService>(GeneratorService);
        if (!generatorService) {
            throw new Error('Generators are not supported on this system');
        }
        const config = await generatorService.getUIServiceGeneratorConfig(referencedObject.uri);
        const gen = this.createService<UiServiceGenerator>(this.getServiceUrlFromConfig(config), UiServiceGenerator);
        gen.configure(config, referencedObject, this.getContentType(config));
        return gen;
    }

    /**
     * Gets an OData Service generator.
     *
     * @param packageName - Name of package to be used for generated artifacts in ABAP system
     * @returns An OData Service generator
     */
    public async getODataServiceGenerator(packageName: string): Promise<ODataServiceGenerator> {
        const generatorService = await this.getAdtService<RapGeneratorService>(RapGeneratorService);
        if (!generatorService) {
            throw new Error('RAP Generator are not support on this system');
        }
        const config = await generatorService.getRAPGeneratorConfig();
        const generator = this.createService<ODataServiceGenerator>(
            this.getServiceUrlFromConfig(config),
            ODataServiceGenerator
        );
        generator.setContentType(this.getContentType(config));
        generator.configure(config, packageName || '$TMP');
        return generator;
    }

    /**
     * Get the service URL from the generator config.
     *
     * @param config - generator config
     * @returns the service URL
     */
    private getServiceUrlFromConfig(config: GeneratorEntry): string {
        // make code in this function defensive against undefined href
        if (Array.isArray(config.link) && !config.link[0]?.href) {
            throw new Error('No service URL found in the generator config');
        }
        const endIndex = config.link[0].href.indexOf(config.id) + config.id.length;
        return config.link[0].href.substring(0, endIndex);
    }

    /**
     * @param config - generator config
     * @returns the type of the content link from service generator config
     */
    private getContentType(config: GeneratorEntry): string {
        const contentEndpoint = config.link?.find(
            (link) => typeof link.href === 'string' && link.href.includes('/content')
        );
        return contentEndpoint.type;
    }

    /**
     * Create a service provider to lock a binding path.
     *
     * @param path - service binding path
     * @returns a service provider instance to lock the service binding
     */
    public async createLockServiceBindingGenerator(path: string): Promise<UiServiceGenerator> {
        const gen = this.createService<UiServiceGenerator>(path, UiServiceGenerator);
        return gen;
    }
}
