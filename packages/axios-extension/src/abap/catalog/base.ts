import { ODataService } from '../../base/odata-service';

/**
 * TODO: cleanup required
 * Structure representing a service, this is non odata version specific currently
 */
export interface ServiceConfig {
    ID: string;
    //Description: string;
    //Title: string; // v2
    //MetadataUrl: string;
    ServiceUrl: string;
    TechnicalName: string;
    TechnicalServiceName: string; // v2
    Version: string;
    //TechnicalServiceVersion: number; // v2
    //ServiceId: string; // v4
    //ServiceVersion: string; // v4
    //GroupId: string; // v4, qualifies v4 ServiceId which is not unique
    //ServiceAlias: string; // v4*/
}

/**
 * Structure representing annotations (including their definitions)
 */
export interface Annotations {
    TechnicalName: string;
    Version: string;
    Definitions: string;
    Uri: string;
}

/**
 * Filter options to search for annotations
 */
export interface FilterOptions {
    id?: string;
    title?: string;
    path?: string;
}

export abstract class CatalogService extends ODataService {
    entitySet: string;

    services: ServiceConfig[];

    public isS4Cloud: Promise<boolean>;

    protected abstract fetchServices(): Promise<ServiceConfig[]>;

    /**
     * Returns list of services from the catalog service.
     *
     * @returns list of services
     */
    async listServices(): Promise<ServiceConfig[]> {
        if (!this.services) {
            this.services = await this.fetchServices();
        }
        return this.services;
    }

    abstract getAnnotations({ id, title, path }: FilterOptions): Promise<Annotations[]>;
}
