import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';

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
        term: 'transports'
    };

    /**
     * @see AdtService.getAdtCatagory()
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return TransportRequestService.AdtCategory;
    }

    /**
     * TransportRequestService API function to create a new transport number.
     *
     * @param packageName Package name for deployment
     * @param ui5AppName Fiori UI5 app name for deployment
     * @param description Description of the new transport request to be created
     * @returns Newly created transport request number
     */
    public async createTransportRequest(packageName: string, ui5AppName: string, description: string): Promise<string> {
        const acceptHeaders = {
            headers: {
                Accept: 'text/plain',
                'content-type':
                    'application/vnd.sap.as+xml; charset=UTF-8; dataname=com.sap.adt.CreateCorrectionRequest'
            }
        };

        const data = `
                <?xml version="1.0" encoding="UTF-8"?>
                <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
                    <asx:values>
                        <DATA>
                            <OPERATION>I</OPERATION>
                            <DEVCLASS>${packageName}</DEVCLASS>
                            <REQUEST_TEXT>${description}</REQUEST_TEXT>
                            <REF>/sap/bc/adt/filestore/ui5-bsp/objects/${ui5AppName}/$create</REF>
                        </DATA>
                    </asx:values>
                </asx:abap>
            `;
        const response = await this.post('', data, acceptHeaders);
        return this.getTransportNumberFromResponse(response.data);
    }

    /**
     * Read the newly created transport number from response XML data.
     *
     * @param text XML response of create transport request.
     * @returns Newly created transport number or null
     */
    private getTransportNumberFromResponse(text: string): string | null {
        const responseStringPrefix = '/com.sap.cts/object_record/';
        if (!text || !text.startsWith(responseStringPrefix)) {
            return null;
        } else {
            const newTransportNumber = text.replace(responseStringPrefix, '');
            return newTransportNumber;
        }
    }
}
