import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';
import XmlParser from 'fast-xml-parser';
import * as xpath from 'xpath';
import { DOMParser } from '@xmldom/xmldom';

/**
 * TransportRequestService implements ADT requests for creating a new transport request number
 * that can be used for deploying Fiori project to ABAP backend.
 */
export class TransportRequestService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static AdtCategory = {
        scheme: 'http://www.sap.com/adt/categories/cts',
        term: 'transportmanagement'
    };

    /**
     * @see AdtService.getAdtCatagory()
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return TransportRequestService.AdtCategory;
    }

    /**
     *
     * @param description Description of the new transport request to be created
     * @returns Newly created transport request number
     */
    public async createTransportRequest(description: string): Promise<string> {
        const acceptHeaders = {
            headers: {
                Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
                'content-type': 'text/plain'
            }
        };

        const data = `
                <?xml version="1.0" encoding="ASCII"?>
                <tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" tm:useraction="newrequest">
                    <tm:request tm:desc="${description}" tm:type="K" tm:target="LOCAL" tm:cts_project="">
                    </tm:request>
                </tm:root>
            `;
        const response = await this.post('', data, acceptHeaders);
        return this.getTransportNumberFromResponse(response.data);
    }

    /**
     * Read the newly created transport number from response XML data.
     *
     * @param xml XML response of create transport request.
     * @returns Newly created transport number or null
     */
    private getTransportNumberFromResponse(xml: string): string | null {
        if (XmlParser.validate(xml) !== true) {
            this.log.warn(`Invalid XML: ${xml}`);
            return '';
        }
        const doc = new DOMParser().parseFromString(xml);
        const select = xpath.useNamespaces({ 'tm': 'http://www.sap.com/cts/adt/tm' });
        const attrElement = select('//tm:request/@tm:number', doc) as Element[];
        if (attrElement && attrElement.length === 1) {
            const createdTransportNumber = attrElement[0].nodeValue;
            return createdTransportNumber;
        } else {
            return null;
        }
    }
}
