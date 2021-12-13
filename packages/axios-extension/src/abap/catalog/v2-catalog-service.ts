import { CatalogService, Service, Annotations } from './base';

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
            if (await this.isS4Cloud) {
                params['$filter'] = V2_S4CLOUD_FILTER;
            }
        }
        const response = await this.get<Service[]>(`/${entitySet}`, { params });
        return response.odata();
    }

    /**
     * TODO: replace placeholder implementation with refactored version of the code below
     */
    public async getAnnotations(): Promise<Annotations[]> {
        return Promise.resolve([]);
    }

    /**
     * Find a specific service by title
     * @param title service title
     */
    /*protected async findService({ title, path }: FilterOptions): Promise<Service> {
    if (!title) {
        title = path
            .replace(/\/$/, '')
            .split('/')
            .pop();
        if (!title) {
            throw new Error(`Cannot determine service title from path: ${path}`);
        }
    }

    title = title.toUpperCase(); // Same as WebIDE. #6368 for details.
    // TODO: use ServiceUrl instead of title extraction
    // filter += '$filter=' + encodeURIComponent(`ServiceUrl eq "${encodeURIComponent(this.system.url + path)}"`);
    const services = await this.get<Service[]>(
        `/ServiceCollection/?$filter=Title%20eq%20%27${title}%27&$format=json`
    );
    if (services.length > 1) {
        // #14793: Fix for user created multi namespaces for the same service
        const servicesWithSameNameSpace = services.filter((service) =>
            service.ServiceUrl?.toUpperCase().includes(path.toUpperCase())
        );
        if (servicesWithSameNameSpace.length > 1) {
            this.log.warn('Service filter was not sufficient to identify one service.');
        } else if (servicesWithSameNameSpace.length > 0) {
            this.log.info(`Service filter chose service: ${servicesWithSameNameSpace[0].TechnicalServiceName}`);
            return servicesWithSameNameSpace[0];
        }
    }
    return services.length > 0 ? services[0] : undefined;
}*/

    /**
     * Get all annotations available for the service matching one of the below filter options
     * @param id service id
     * @param title sevice title
     * @param path service path
     */
    /*public async getAnnotations({ id, title, path }: FilterOptions): Promise<Annotations[]> {
    if (!id && !title && !path) {
        throw new Error('No filter parameters passed in');
    }

    const serviceAnnotations = await this.getServiceAnnotations({ id, title, path });
    const annotations: Annotations[] = [];
    if (serviceAnnotations) {
        for (const service of serviceAnnotations) {
            const _path = `/Annotations(TechnicalName='${encodeURIComponent(service.TechnicalName)}',Version='${
                service.Version
            }')/$value/`;

            const annotDefs = await this.get<string>(_path);
            if (annotDefs) {
                annotations.push({
                    TechnicalName: service.TechnicalName,
                    Version: service.Version,
                    Definitions: annotDefs,
                    Uri: this.system.service + _path
                });
            } else {
                this.log.warn(
                    `No annotations found for TechnicalName=${service.TechnicalName}, Version=${service.Version}`
                );
            }
        }
    }
    return annotations;
}

private async getServiceAnnotations({ id, title, path }: FilterOptions): Promise<Service[]> {
    if (!id) {
        const serviceInfo = await this.findService({ title, path });
        if (serviceInfo) {
            id = serviceInfo.ID;
        }
    }
    if (id) {
        return this.get<Service[]>(`/ServiceCollection('${encodeURIComponent(id)}')/Annotations?$format=json`);
    } else {
        return undefined;
    }
}

    */
}
