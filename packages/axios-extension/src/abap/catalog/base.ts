import type { ODataVersion } from '../../base/odata-service';
import { ODataService } from '../../base/odata-service';

export const ServiceType = {
    UI: 'UI',
    NotClassified: 'Not Classified',
    WebApi: 'WEB_API',
    NotDetermined: 'Not Determined'
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export interface ODataServiceInfo {
    id: string;
    name: string;
    group?: string;
    path: string;
    odataVersion: ODataVersion;
    serviceVersion: string;
    serviceType?: ServiceType;
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

/**
 * OData version independent abstract base class of SAP's catalog service
 */
export abstract class CatalogService extends ODataService {
    entitySet: string;

    services: ODataServiceInfo[];

    public isS4Cloud: Promise<boolean>;

    /**
     * Fetch all services from the backend.
     *
     * @param useNextLink if true, the next link will be used to fetch the next page of results, pages are fetched serially.
     */
    protected abstract fetchServices(useNextLink?: boolean): Promise<ODataServiceInfo[]>;

    /**
     * Returns list of services from the catalog service.
     *
     * @param useNextLink if true, the next link tags will be used to fetch the next page of results, pages are fetched serially.
     * Note that this will be less performant for larger datasets.
     * @returns list of services
     */
    async listServices(useNextLink = false): Promise<ODataServiceInfo[]> {
        if (!this.services) {
            this.services = await this.fetchServices(useNextLink);
        }
        return this.services;
    }

    abstract getAnnotations({ id, title, path }: FilterOptions): Promise<Annotations[]>;
    abstract getServiceType(path: string): Promise<ServiceType | undefined>;
}
