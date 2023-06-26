import type { ODataVersion } from '../../base/odata-service';
import { ODataService } from '../../base/odata-service';

export interface ODataServiceInfo {
    id: string;
    name: string;
    group?: string;
    path: string;
    odataVersion: ODataVersion;
    serviceVersion: string;
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

    protected abstract fetchServices(): Promise<ODataServiceInfo[]>;

    /**
     * Returns list of services from the catalog service.
     *
     * @returns list of services
     */
    async listServices(): Promise<ODataServiceInfo[]> {
        if (!this.services) {
            this.services = await this.fetchServices();
        }
        return this.services;
    }

    abstract getAnnotations({ id, title, path }: FilterOptions): Promise<Annotations[]>;
}
