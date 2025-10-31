import { AdtService } from './adt-service';
import type { AdtCategory, ODataServiceTechnicalDetails } from '../../types';

/**
 *
 */
export class PublishService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static readonly adtCategory = {
        scheme: 'http://www.sap.com/categories/servicebindings/bindingtypes',
        term: 'ODataV4'
    };

    /**
     * Get ADT scheme ID.
     *
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return PublishService.adtCategory;
    }

    /**
     * Get OData V4 service URI for the given business object.
     *
     * @param technicalDetails - technical name of OData service
     * @returns service URI.
     */
    public async getODataV4ServiceUri(technicalDetails: ODataServiceTechnicalDetails): Promise<string> {
        const { serviceDefinitionName, serviceName, serviceVersion } = technicalDetails;
        const response = await this.get(`/${encodeURIComponent(serviceName)}`, {
            headers: {
                Accept: 'application/vnd.sap.adt.businessservices.odatav4.v2+xml'
            },
            params: {
                servicename: serviceName,
                serviceversion: serviceVersion,
                srvdname: serviceDefinitionName
            }
        });
        interface ServiceResponse {
            serviceGroup: {
                services: {
                    serviceUrl: string;
                };
            };
        }
        const data = this.parseResponse<ServiceResponse>(response.data);
        return String(data.serviceGroup.services.serviceUrl);
    }
}
