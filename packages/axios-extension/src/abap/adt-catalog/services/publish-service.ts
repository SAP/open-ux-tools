import { AdtService } from './adt-service';
import type { AdtCategory, PublishResponse } from '../../types';

/**
 *
 */
export class PublishService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static adtCategory = {
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
     * Build the service binding content, used in the publish request.
     *
     * @param serviceType - The service type.
     * @param serviceBindingName - The service binding name.
     * @returns The service binding content.
     */
    private buildServiceBindingContent(serviceType: string, serviceBindingName: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?><adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core"><adtcore:objectReference adtcore:type="${serviceType}" adtcore:name="${serviceBindingName}"/></adtcore:objectReferences>`;
    }

    /**
     * Publish the service binding.
     *
     * @param type - The type of the service binding.
     * @param bindingName - The name of the service binding.
     * @returns The response status message.
     */
    public async publish(type: string, bindingName: string): Promise<PublishResponse> {
        const content = this.buildServiceBindingContent(type, bindingName);
        const response = await this.post(`/publishjobs`, content, {
            headers: {
                'Content-Type': 'application/xml',
                Accept: 'application/xml, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.StatusMessage'
            }
        });

        const data = this.parseResponse(response.data);
        return data['abap']['values']['DATA'];
    }

    /**
     * Get OData V4 service URI
     *
     * @param bindingName - The name of the service binding.
     * @returns service URI.
     */
    public async getODataV4ServiceUri(bindingName: string): Promise<string> {
        const response = await this.get(`/${bindingName}`, {
            headers: {
                Accept: 'application/vnd.sap.adt.businessservices.odatav4.v1+xml'
            },
            params: {
                servicename: bindingName,
                serviceversion: '0001',
                srvdname: bindingName
            }
        });

        const data = this.parseResponse(response.data);
        return String(data['serviceGroup']['services']['serviceUrl']);
    }
}
