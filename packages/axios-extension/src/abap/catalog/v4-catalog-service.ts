import { CatalogService, Service } from './base';

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

export class V4CatalogService extends CatalogService {
    public static readonly PATH = '/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002';

    protected extractServices(groups: ServiceGroup[], entitySet: string): Service[] {
        const services: Service[] = [];
        groups.forEach((group) => {
            services.push(
                ...(group.DefaultSystem[entitySet] as V4Service[]).map((service) =>
                    Object.assign(service, { GroupId: group.GroupId })
                )
            );
        });

        return services;
    }

    protected async fetchServices(): Promise<Service[]> {
        if (this.useRecommendedServices === undefined) {
            const metadata = await this.metadata();
            this.useRecommendedServices = metadata.includes('Name="RecommendedServices"');
        }

        const entitySet = this.useRecommendedServices ? V4_RECOMMENDED_ENTITYSET : V4_CLASSIC_ENTITYSET;

        const params: { [key: string]: string | boolean } = {
            $count: true,
            $expand: `DefaultSystem($expand=${entitySet})`
        };

        let response = await this.get<ServiceGroup[]>('/ServiceGroups', { params });
        const serviceGroups = response.odata() || [];

        // paging required
        while (response.data['@odata.nextLink']) {
            const nextLink = new URL(response.data['@odata.nextLink']);
            response = await super.get('/ServiceGroups', { params: { ...params, ...nextLink.searchParams } });
            serviceGroups.push(...response.odata());
        }
        return this.extractServices(serviceGroups, entitySet);
    }
}
