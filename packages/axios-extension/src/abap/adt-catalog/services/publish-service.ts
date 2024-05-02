import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser();

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
    public async publish(
        type: string,
        bindingName: string
    ): Promise<{ SEVERITY: string; SHORT_TEXT: string; LONG_TEXT: string }> {
        const content = this.buildServiceBindingContent(type, bindingName);
        const response = await this.post(`/publishjobs`, content, {
            headers: {
                'Content-Type': 'application/xml',
                Accept: 'application/xml, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.StatusMessage'
            }
        });

        const data = parser.parse(response.data, true);
        this.log.info('data: ' + JSON.stringify(data));
        return data['asx:abap']['asx:values'].DATA;
    }
}
