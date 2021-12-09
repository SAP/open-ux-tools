import { CatalogService, Service } from './base';

const V2_CLASSIC_ENTITYSET = 'ServiceCollection';
const V2_RECOMMENDED_ENTITYSET = 'RecommendedServiceCollection';
const V2_S4CLOUD_FILTER =
    '((IsSapService%20eq%20true)and(ReleaseStatus%20eq%20%27RELEASED%27))or((IsSapService%20eq%20false))';

export class V2CatalogService extends CatalogService {
    public static readonly PATH = '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2';

    protected async fetchServices(): Promise<Service[]> {
        const params = {
            $format: 'json'
        };
        let entitySet: string;

        if (this.useRecommendedServices === undefined) {
            const doc = await this.document();
            this.useRecommendedServices = doc.EntitySets.includes(V2_RECOMMENDED_ENTITYSET);
        }

        if (this.useRecommendedServices) {
            entitySet = V2_RECOMMENDED_ENTITYSET;
        } else {
            entitySet = V2_CLASSIC_ENTITYSET;
            if (this.s4cloud) {
                params['$filter'] = V2_S4CLOUD_FILTER;
            }
        }
        const response = await this.get<Service[]>(`/${entitySet}`, { params });
        return response.odata();
    }
}
