import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';

/**
 * Input parameter for creating a new transport request for an UI5 app object.
 */
export interface NewUi5ObjectRequestParams {
    /**
     * A valid package name is required to create a new transport request
     */
    packageName: string;
    /**
     * Name of a Fiori UI5 app to be deployed.
     * It is acceptable to use a new app name that does not exist.
     */
    ui5AppName: string;
    /**
     * Description of the new transport request to be created
     */
    description: string;
}

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
     * @param reqParam Request parameter for creating a new transport request for an UI5 app object.
     * @returns Newly created transport request number
     */
    public async createTransportRequest(reqParam: NewUi5ObjectRequestParams): Promise<string> {
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
                            <DEVCLASS>${reqParam.packageName}</DEVCLASS>
                            <REQUEST_TEXT>${reqParam.description}</REQUEST_TEXT>
                            <REF>/sap/bc/adt/filestore/ui5-bsp/objects/${reqParam.ui5AppName}/$create</REF>
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
