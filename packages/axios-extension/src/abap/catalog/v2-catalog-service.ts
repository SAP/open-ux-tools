import { CatalogService, ODataServiceInfo, Annotations, FilterOptions } from './base';
import { ODataVersion } from '../../base/odata-service';

const V2_CLASSIC_ENTITYSET = 'ServiceCollection';
const V2_RECOMMENDED_ENTITYSET = 'RecommendedServiceCollection';
const V2_S4CLOUD_FILTER =
    '((IsSapService%20eq%20true)and(ReleaseStatus%20eq%20%27RELEASED%27))or((IsSapService%20eq%20false))';

/**
 * TODO: cleanup required
 * Structure representing a service, this is non odata version specific currently
 */
export interface ODataServiceV2Info {
    ID: string;
    Description: string;
    Title: string;
    MetadataUrl: string;
    ServiceUrl: string;
    TechnicalName: string;
    TechnicalServiceName: string;
    Version: string;
    TechnicalServiceVersion: number;
}

/**
 *
 */
export class V2CatalogService extends CatalogService {
    public static readonly PATH = '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2';

    /**
     * @param services
     */
    protected mapServices(services: ODataServiceV2Info[]): ODataServiceInfo[] {
        return services.map((service) => {
            return {
                id: service.ID,
                name: service.TechnicalServiceName,
                path: new URL(service.ServiceUrl).pathname,
                serviceVersion: service.TechnicalServiceVersion + '',
                odataVersion: ODataVersion.v2
            };
        });
    }

    /**
     *
     */
    protected async fetchServices(): Promise<ODataServiceInfo[]> {
        const params = {
            $format: 'json'
        };

        if (this.entitySet === undefined) {
            const doc = await this.document();
            this.entitySet = doc.EntitySets.includes(V2_RECOMMENDED_ENTITYSET)
                ? V2_RECOMMENDED_ENTITYSET
                : V2_CLASSIC_ENTITYSET;
        }

        if (this.entitySet === V2_CLASSIC_ENTITYSET && (await this.isS4Cloud)) {
            params['$filter'] = V2_S4CLOUD_FILTER;
        }
        const response = await this.get<ODataServiceV2Info[]>(`/${this.entitySet}`, { params });
        return this.mapServices(response.odata());
    }

    /**
     * Find a specific service by title
     *
     * @param title.title
     * @param title service title
     * @param title.path
     */
    protected async findService({ title, path }: FilterOptions): Promise<ODataServiceV2Info> {
        if (!title) {
            title = path.replace(/\/$/, '').split('/').pop().toUpperCase();
            if (!title) {
                throw new Error(`Cannot determine service title from path: ${path}`);
            }
        }

        // TODO: use ServiceUrl instead of title extraction
        // filter += '$filter=' + encodeURIComponent(`ServiceUrl eq "${encodeURIComponent(this.system.url + path)}"`);
        const params = {
            $format: 'json',
            $filter: `Title%20eq%20%27${title}%27`
        };
        const response = await this.get<ODataServiceV2Info[]>(`/${this.entitySet}`, { params });
        const services = response.odata();

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
    }

    /**
     * @param root0
     * @param root0.id
     * @param root0.title
     * @param root0.path
     */
    protected async getServiceAnnotations({ id, title, path }: FilterOptions): Promise<ODataServiceV2Info[]> {
        if (!id) {
            const ServiceConfig = await this.findService({ title, path });
            if (ServiceConfig) {
                id = ServiceConfig.ID;
            }
        }
        if (id) {
            const response = await this.get<ODataServiceV2Info[]>(
                `/${this.entitySet}('${encodeURIComponent(id)}')/Annotations`,
                {
                    params: { $format: 'json' }
                }
            );
            return response.odata();
        } else {
            return [];
        }
    }

    /**
     * Get all annotations available for the service matching one of the below filter options
     *
     * @param id.id
     * @param id service id
     * @param title sevice title
     * @param path service path
     * @param id.title
     * @param id.path
     */
    public async getAnnotations({ id, title, path }: FilterOptions): Promise<Annotations[]> {
        if (!id && !title && !path) {
            throw new Error('No filter parameters passed in');
        }

        const serviceAnnotations = await this.getServiceAnnotations({ id, title, path });
        const annotations: Annotations[] = [];
        for (const service of serviceAnnotations) {
            const _path = `/Annotations(TechnicalName='${encodeURIComponent(service.TechnicalName)}',Version='${
                service.Version
            }')/$value/`;

            const response = await this.get<string>(_path, {
                headers: {
                    Accept: 'application/xml'
                }
            });
            if (response.data) {
                annotations.push({
                    TechnicalName: service.TechnicalName,
                    Version: service.Version,
                    Definitions: response.data,
                    Uri: this.defaults.baseURL + _path
                });
            } else {
                this.log.warn(
                    `No annotations found for TechnicalName=${service.TechnicalName}, Version=${service.Version}`
                );
            }
        }
        return annotations;
    }
}
