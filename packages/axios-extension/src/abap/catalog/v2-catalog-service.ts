import type { ODataServiceInfo, Annotations, FilterOptions, ServiceType } from './base';
import { CatalogService } from './base';
import { ODataVersion } from '../../base/odata-service';
import { ODataRequestError } from '../../base/odata-request-error';

const V2_CLASSIC_ENTITYSET = 'ServiceCollection';
const V2_RECOMMENDED_ENTITYSET = 'RecommendedServiceCollection';
const V2_S4CLOUD_FILTER =
    '((IsSapService%20eq%20true)and(ReleaseStatus%20eq%20%27RELEASED%27))or((IsSapService%20eq%20false))';

/**
 * Structure representing a V2 service
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
    ServiceType: ServiceType;
}

/**
 * OData V2 specific implmentation of SAP's catalog service
 */
export class V2CatalogService extends CatalogService {
    public static readonly PATH = '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2';

    protected async determineEntitySet() {
        const doc = await this.document();
        this.entitySet = doc.EntitySets.includes(V2_RECOMMENDED_ENTITYSET)
            ? V2_RECOMMENDED_ENTITYSET
            : V2_CLASSIC_ENTITYSET;
    }

    /**
     * Returns the service path for the provided serivce URL.
     *
     * @param serviceUrl - service url (may be full service url or service path)
     * @param baseUrl - base url for the odata service
     * @returns - service path
     */
    private getServicePath(serviceUrl: string, baseUrl: string): string {
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(serviceUrl);
        } catch {
            // there are cases where the service url is just the path and not the full service url
            parsedUrl = new URL(serviceUrl, baseUrl);
        }
        return parsedUrl.pathname;
    }

    /**
     * Map the V2 service information to a version independent structure.
     *
     * @param services v2 services information
     * @returns version independent information
     */
    protected mapServices(services: ODataServiceV2Info[]): ODataServiceInfo[] {
        return services.map((service) => {
            const path = this.getServicePath(service.ServiceUrl, this.defaults.baseURL);
            return {
                id: service.ID,
                name: service.TechnicalServiceName,
                path: path,
                serviceVersion: service.TechnicalServiceVersion + '',
                odataVersion: ODataVersion.v2,
                serviceType: service.ServiceType
            };
        });
    }

    /**
     * Fetch all services from the backend.
     *
     * @returns version independent service information
     */
    protected async fetchServices(): Promise<ODataServiceInfo[]> {
        const params = {
            $format: 'json'
        };

        if (!this.entitySet) {
            await this.determineEntitySet();
        }

        if (this.entitySet === V2_CLASSIC_ENTITYSET && (await this.isS4Cloud)) {
            params['$filter'] = V2_S4CLOUD_FILTER;
        }
        const response = await this.get<ODataServiceV2Info[]>(`/${this.entitySet}`, { params });
        const data = response.odata();

        // check if the service responded with an odata error
        if (ODataRequestError.containsError(data)) {
            throw new ODataRequestError(data);
        }

        return this.mapServices(data);
    }

    /**
     * Find a specific service by title.
     *
     * @param filter filter options
     * @param filter.title filter by title
     * @param filter.path filter by path
     * @returns service information matching the given filter
     */
    protected async findService({ title, path }: FilterOptions): Promise<ODataServiceV2Info> {
        let version = 1;
        if (!title) {
            const titleWithParameters = path.replace(/\/$/, '').split('/').pop().split(';');
            title = titleWithParameters[0].toUpperCase();
            if (!title) {
                throw new Error(`Cannot determine service title from path: ${path}`);
            }
            const segParams = titleWithParameters.slice(1);
            segParams.forEach((parameter) => {
                const [key, value] = parameter.split('=');
                if (key === 'v') {
                    version = parseInt(value, 10);
                }
            });
        }

        const params = {
            $format: 'json',
            $filter: `Title eq '${title}' and TechnicalServiceVersion eq ${version}`
        };
        const requestPath = this.entitySet ? `/${this.entitySet}` : '/ServiceCollection';
        const response = await this.get<ODataServiceV2Info[]>(requestPath, { params });
        const services = response.odata();

        if (services.length > 1) {
            // #14793: Fix for user created multi namespaces for the same service
            const servicesWithSameNameSpace = services.filter((service) =>
                service.ServiceUrl?.toUpperCase().includes((path || title).toUpperCase())
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
     * Get service annotations for the service matching the given filter.
     *
     * @param filter filter options
     * @param filter.id filter by id
     * @param filter.title filter by title
     * @param filter.path filter by path
     * @returns service annotations
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
                `/ServiceCollection('${encodeURIComponent(id)}')/Annotations`,
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
     * Get all annotations available for the service matching one of the below filter options.
     *
     * @param filter filter options
     * @param filter.id filter by id
     * @param filter.title filter by title
     * @param filter.path filter by path
     * @returns annotations
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

    /**
     * Calls endpoint `ServiceTypeForHUBServices` to determine the service type.
     *
     * @param path service path
     * @returns service type
     */
    public async getServiceType(path: string): Promise<ServiceType | undefined> {
        let serviceType: ServiceType;
        const { ID: id } = await this.findService({ path });

        if (id) {
            const result = await this.get<ODataServiceV2Info>(
                `/ServiceTypeForHUBServices('${encodeURIComponent(id)}')`
            );
            if (result) {
                serviceType = result.odata().ServiceType;
            }
        }
        return serviceType;
    }
}
