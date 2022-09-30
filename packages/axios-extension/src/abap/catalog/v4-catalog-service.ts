import type { Annotations, ODataServiceInfo } from './base';
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
                            odataVersion: ODataVersion.v4
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

        const params: { [key: string]: string | boolean } = {
            $count: true,
            $expand: `DefaultSystem($expand=${this.entitySet})`
        };

        let response = await this.get<ServiceGroup[]>('/ServiceGroups', { params });
        const serviceGroups = response.odata() || [];
        // paging required
        while (response.data['@odata.nextLink']) {
            const nextLink = new URL(response.data['@odata.nextLink']);
            response = await super.get('/ServiceGroups', { params: { ...params, ...nextLink.searchParams } });
            serviceGroups.push(...response.odata());
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
}
