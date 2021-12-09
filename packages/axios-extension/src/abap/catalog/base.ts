import { ODataService } from '../../base/odata-service';

export interface Service {}

export abstract class CatalogService extends ODataService {
    s4cloud: boolean;
    useRecommendedServices: boolean;

    services: Service[];

    protected abstract fetchServices(): Promise<Service[]>;

    /**
     * Returns list of services from the catalog service.
     *
     * @returns list of services
     */
    async listServices(): Promise<Service[]> {
        if (!this.services) {
            this.services = await this.fetchServices();
        }
        return this.services;
    }

    //abstract getAnnotations({ id, title, path }: any): Promise<any[]>;
}
