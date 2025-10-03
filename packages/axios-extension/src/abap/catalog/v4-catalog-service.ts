import type { Annotations, ODataServiceInfo, ServiceType } from './base';
import { CatalogService } from './base';
import { ODataVersion } from '../../base/odata-service';
import { ODataRequestError } from '../../base/odata-request-error';
import { type Logger, ToolsLogger } from '@sap-ux/logger';

const V4_RECOMMENDED_ENTITYSET = 'RecommendedServices';
const V4_CLASSIC_ENTITYSET = 'Services';

export interface V4Service {
    RepositoryId: string;
    ServiceId: string;
    ServiceVersion: string;
    ServiceAlias: string;
    Description: string;
    ServiceUrl: string;
    ServiceType: ServiceType;
}

/**
 * v4 Service Group
 */
export interface ServiceGroup {
    GroupId: string;
    Description: string;
    DefaultSystem: {
        SystemAlias: string;
        Description: string;
        Services: V4Service[];
    };
}

interface ServiceGroupResponse {
    value: ServiceGroup[];
}

/**
 * OData V4 specific implmentation of SAP's catalog service
 */
export class V4CatalogService extends CatalogService {
    private readonly logger: Logger = new ToolsLogger();
    public static readonly PATH = '/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002';

    /**
     * Map the V4 service information to a version independent structure.
     *
     * @param groups v4 service groups
     * @param entitySet entity set used for service selection. e.g. `RecommendedServices`
     * @param dedup if true, duplicate services will be removed based on their id. Duplicate services may appear in multiple groups, e.g. '/IWBEP/ALL'.
     * @returns version independent information
     */
    protected mapServices(groups: ServiceGroup[], entitySet: string, dedup = false): ODataServiceInfo[] {
        const services: ODataServiceInfo[] = [];
        // Duplicates can appear in multiple groups, e.g. '/IWBEP/ALL'
        const uniqueServiceIds = new Set<string>();
        groups
            .filter((group) => group?.DefaultSystem?.[entitySet]?.length > 0)
            .forEach((group) => {
                services.push(
                    ...(group.DefaultSystem[entitySet] as V4Service[]).flatMap((service) => {
                        if (dedup) {
                            if (uniqueServiceIds.has(service.ServiceId)) {
                                return [];
                            }
                            uniqueServiceIds.add(service.ServiceId);
                        }
                        return {
                            id: service.ServiceId,
                            group: group.GroupId,
                            path: service.ServiceUrl.split('?').shift(),
                            name: `${group.GroupId} > ${service.ServiceAlias || service.ServiceId}`,
                            serviceVersion: service.ServiceVersion,
                            odataVersion: ODataVersion.v4,
                            serviceType: service.ServiceType
                        };
                    })
                );
            });
        return services;
    }

    /**
     * Fetch all services from the backend using the @nexlink parameter to fetch all pages serially.
     *
     * @returns version independent service information
     */
    protected async fetchServicesNextLink(): Promise<ODataServiceInfo[]> {
        if (this.entitySet === undefined) {
            const metadata = await this.metadata();
            this.entitySet = metadata.includes('Name="RecommendedServices"')
                ? V4_RECOMMENDED_ENTITYSET
                : V4_CLASSIC_ENTITYSET;
        }
        const params = new URLSearchParams([
            ['$count', 'true'],
            ['$expand', `DefaultSystem($expand=${this.entitySet})`]
        ]);

        const response = await this.get<ServiceGroupResponse>('/ServiceGroups', { params }, true);
        let serviceGroupResponseOdata = response.odata();
        const serviceGroups = serviceGroupResponseOdata.value;
        let numPageRequests = 1;
        // Page by using the backends nextLink search parameters for the next request
        while (serviceGroupResponseOdata['@odata.nextLink']) {
            const nextLink = new URL(serviceGroupResponseOdata['@odata.nextLink'], this.defaults.baseURL);
            serviceGroupResponseOdata = (
                await this.get<ServiceGroupResponse>('/ServiceGroups', { params: nextLink.searchParams }, true)
            ).odata();
            numPageRequests++;
            serviceGroups.push(...serviceGroupResponseOdata.value);
        }
        this.logger.log(`Fetched ${serviceGroups.length} service groups in ${numPageRequests} requests.`);

        // check if the service responded with an odata error
        if (ODataRequestError.containsError(serviceGroups)) {
            throw new ODataRequestError(serviceGroups);
        }

        return this.mapServices(serviceGroups, this.entitySet);
    }

    /**
     * Fetches all services from the catalog.
     *
     * @param useNextLink if true, uses the nextLink parameter to fetch all pages serially, otherwise fetches all pages in parallel.
     * @returns v4 services
     */
    protected async fetchServices(useNextLink = false): Promise<ODataServiceInfo[]> {
        if (useNextLink) {
            return this.fetchServicesNextLink();
        }
        return this.fetchServicesParallel();
    }

    /**
     * Fetches all services from the catalog in parallel. Uses the total service count to fetch all service group pages in parallel
     * to improve performance where larger numbers of services and therefore pages are available.
     *
     * @returns List of unique services
     */
    protected async fetchServicesParallel(): Promise<ODataServiceInfo[]> {
        const defaultInitialPageSize = 1000; // default page size for the services, large enough to get the first page and skiptoken to determine max page size
        if (this.entitySet === undefined) {
            const metadata = await this.metadata();
            this.entitySet = metadata.includes('Name="RecommendedServices"')
                ? V4_RECOMMENDED_ENTITYSET
                : V4_CLASSIC_ENTITYSET;
        }
        const params = new URLSearchParams([
            ['$count', 'true'],
            ['$top', defaultInitialPageSize.toString()], // Get the first page of services,
            ['$expand', `DefaultSystem($expand=${this.entitySet})`]
        ]);

        const response = await this.get<ServiceGroupResponse>('/ServiceGroups', { params }, true);
        const serviceGroupResponseOdata = response.odata();
        const serviceGroups = serviceGroupResponseOdata.value;
        const serviceGroupCount = serviceGroupResponseOdata['@odata.count'];
        const pageSize = parseInt(serviceGroupResponseOdata['@odata.nextLink']?.split('skiptoken=')[1], 10);
        let numPageRequests = 1;

        // If we dont have a valid skip token, we assume we have all services in the first page
        if (!isNaN(pageSize)) {
            const numPages = Math.ceil(serviceGroupCount / pageSize);
            // Create an array of promises to fetch all pages in parallel
            const fetchPromises = Array.from({ length: numPages - 1 }, (_, index) => {
                const nextParams = new URLSearchParams([
                    ['$count', 'true'],
                    ['$skip', String((index + 1) * pageSize)],
                    ['$top', pageSize.toString()], // Fetch the next 200 services
                    ['$expand', `DefaultSystem($expand=${this.entitySet})`]
                ]);
                numPageRequests++;
                return this.get<ServiceGroupResponse>('/ServiceGroups', { params: nextParams }, true);
            });

            const pageResults = await Promise.all(fetchPromises); // Fetch all remaining pages in parallel
            pageResults.forEach((pageResponse) => {
                const pageData = pageResponse.odata();
                serviceGroups.push(...pageData.value);
            });
        }
        this.logger.log(`Fetched ${serviceGroups.length} service groups in ${numPageRequests} requests.`);
        // check if the service responded with an odata error
        if (ODataRequestError.containsError(serviceGroups)) {
            throw new ODataRequestError(serviceGroups);
        }

        return this.mapServices(serviceGroups, this.entitySet, true);
    }

    /**
     * For OData v4, all annotations are already included in the metadata and no additional request is required.
     *
     * @returns an empty array
     */
    public getAnnotations(): Promise<Annotations[]> {
        return Promise.resolve([]);
    }

    /**
     * For OData v4, no additonal call is required to retrieve the service type.
     *
     * @returns undefined
     */
    public getServiceType(): Promise<undefined> {
        return Promise.resolve(undefined);
    }
}
