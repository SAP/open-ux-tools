import { AdtService } from './adt-service';
import type { AdtCategory, ODataServiceTechnicalDetails } from '../../types';
import type { GeneratorEntry } from '../generators/types';

/**
 *
 */
export class GeneratorService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static adtCategory = {
        scheme: 'http://www.sap.com/adt/categories/respository',
        term: 'generators'
    };

    /**
     * Get ADT scheme ID.
     *
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return GeneratorService.adtCategory;
    }

    private id: string;

    /**
     * Get the UI service generator for the given referenced object.
     *
     * @param objectUri - The object (business object or abap cds view) uri.
     * @returns TBD
     */
    public async getUIServiceGeneratorConfig(objectUri: string): Promise<GeneratorEntry> {
        const response = await this.get('', {
            headers: {
                Accept: 'application/atom+xml;type=feed'
            },
            params: {
                referencedObject: objectUri,
                type: 'webapi'
            }
        });

        const data = this.parseResponse<any>(response.data).feed?.entry as GeneratorEntry;
        if (data?.id === 'published-ui-service') {
            return data;
        } else {
            throw new Error('UI Service Generator not found');
        }
    }

    /**
     * Get OData V4 service URI
     *
     * @param technicalDetails - technical name of OData service
     * @returns service URI.
     */
    public async getODataV4ServiceUri(technicalDetails: ODataServiceTechnicalDetails): Promise<string> {
        const { serviceDefinitionName, serviceName, serviceVersion } = technicalDetails;
        const response = await this.get(`/${serviceName}`, {
            headers: {
                Accept: 'application/vnd.sap.adt.businessservices.odatav4.v1+xml'
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
