import type { Annotations, ODataServiceInfo, ServiceType } from './base';
import { CatalogService } from './base';
import { ODataVersion } from '../../base/odata-service';
import { ODataRequestError } from '../../base/odata-request-error';

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
    public static readonly PATH = '/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002';

    /**
     * Map the V4 service information to a version independent structure.
     *
     * @param groups v4 service groups
     * @param entitySet entity set used for service selection
     * @returns version independent information
     */
    protected mapServices(groups: ServiceGroup[], entitySet: string): ODataServiceInfo[] {
        const services: ODataServiceInfo[] = [];
        groups
            .filter((group) => group?.DefaultSystem?.[entitySet]?.length > 0)
            .forEach((group) => {
                services.push(
                    ...(group.DefaultSystem[entitySet] as V4Service[]).map((service) => {
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
     * Fetch all services from the backend.
     *
     * @returns version independent service information
     */
    protected async fetchServices(): Promise<ODataServiceInfo[]> {
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
        // Page by using the backends nextLink search parameters for the next request
        while (serviceGroupResponseOdata['@odata.nextLink']) {
            const nextLink = new URL(serviceGroupResponseOdata['@odata.nextLink'], this.defaults.baseURL);
            serviceGroupResponseOdata = (
                await this.get<ServiceGroupResponse>('/ServiceGroups', { params: nextLink.searchParams }, true)
            ).odata();
            serviceGroups.push(...serviceGroupResponseOdata.value);
        }

        // check if the service responded with an odata error
        if (ODataRequestError.containsError(serviceGroups)) {
            throw new ODataRequestError(serviceGroups);
        }

        return this.mapServices(serviceGroups, this.entitySet);
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
