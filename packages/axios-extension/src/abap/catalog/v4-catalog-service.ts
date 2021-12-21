import { CatalogService, Annotations, ODataServiceInfo } from './base';
import { ODataVersion } from '../../base/odata-service';

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
 *
 */
export class V4CatalogService extends CatalogService {
    public static readonly PATH = '/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002';

    /**
     * @param groups
     * @param entitySet
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
     *
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
        return this.mapServices(serviceGroups, this.entitySet);
    }

    /**
     * For OData v4, all annotations are already included in the metadata and no additional request is required.
     */
    public getAnnotations(): Promise<Annotations[]> {
        return Promise.resolve([]);
    }
}
