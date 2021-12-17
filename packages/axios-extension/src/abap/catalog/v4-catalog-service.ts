import { CatalogService, ServiceConfig, Annotations } from './base';

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

    protected extractServices(groups: ServiceGroup[], entitySet: string): ServiceConfig[] {
        const services: ServiceConfig[] = [];
        groups
            .filter((group) => group?.DefaultSystem?.[entitySet]?.length > 0)
            .forEach((group) => {
                services.push(
                    ...(group.DefaultSystem[entitySet] as V4Service[]).map((service) => {
                        return {
                            ID: service.ServiceId /* + group.GroupId */,
                            ServiceUrl: service.ServiceUrl,
                            Version: service.ServiceVersion,
                            TechnicalName: '',
                            TechnicalServiceName: ''
                        };
                    })
                );
            });
        return services;
    }

    protected async fetchServices(): Promise<ServiceConfig[]> {
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
        return this.extractServices(serviceGroups, this.entitySet);
    }

    /**
     * For OData v4, all annotations are already included in the metadata and no additional request is required.
     */
    public getAnnotations(): Promise<Annotations[]> {
        return Promise.resolve([]);
    }
}
