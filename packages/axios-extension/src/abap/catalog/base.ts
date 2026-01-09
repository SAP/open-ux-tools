import type { ODataVersion } from '../../base/odata-service';
import { ODataService } from '../../base/odata-service';
import { isAxiosError } from '../../base/odata-request-error';

export const ServiceType = {
    UI: 'UI',
    NotClassified: 'Not Classified',
    WebApi: 'WEB_API',
    NotDetermined: 'Not Determined'
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

/**
 * HTTP status codes for catalog request errors
 */
export const CatalogErrorCode = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404
} as const;

export type CatalogErrorCode = (typeof CatalogErrorCode)[keyof typeof CatalogErrorCode];

/**
 * Result of fetching services from a catalog, including error status.
 * Provides structured error information instead of throwing exceptions.
 */
export interface CatalogRequestResult {
    /** OData version of the catalog (v2 or v4) */
    version: ODataVersion;
    /** Whether the catalog request was successful */
    success: boolean;
    /** Services returned from the catalog (empty array on failure) */
    services: ODataServiceInfo[];
    /** HTTP status code if the request failed */
    errorCode?: CatalogErrorCode;
    /** Error message if the request failed */
    errorMessage?: string;
}

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

    /**
     * Get the OData version for this catalog.
     *
     * @returns the OData version (v2 or v4)
     */
    abstract getVersion(): ODataVersion;

    /**
     * List services with structured error handling.
     * Returns success/error status instead of throwing exceptions.
     *
     * @param useNextLink if true, use next link for pagination
     * @returns CatalogRequestResult with services or error information
     */
    async listServicesWithStatus(useNextLink = false): Promise<CatalogRequestResult> {
        try {
            const services = await this.listServices(useNextLink);
            return {
                version: this.getVersion(),
                success: true,
                services
            };
        } catch (error) {
            const errorCode = isAxiosError(error) ? (error.response?.status as CatalogErrorCode) : undefined;
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                version: this.getVersion(),
                success: false,
                services: [],
                errorCode,
                errorMessage
            };
        }
    }
}
