import { AdtService } from './adt-service';
import { LocalPackageText } from '../../types';
import type { AdtCategory, AdtTransportStatus, TransportRequest } from '../../types';
import XmlParser from 'fast-xml-parser';
import * as xpath from 'xpath';
import { DOMParser } from '@xmldom/xmldom';

/**
 * TransportChecksService implements ADT requests for fetching a list of available transport requests
 * for a given package name and a given app name.
 */
export class TransportChecksService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static AdtCategory = {
        scheme: 'http://www.sap.com/adt/categories/cts',
        term: 'transportchecks'
    };

    /**
     * @see AdtService.getAdtCatagory()
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return TransportChecksService.AdtCategory;
    }

    /**
     * TransportChecksService API function to fetch a list of available transport requests.
     *
     * @param packageName Package name for deployment
     * @param appName Fiori project name for deployment. A new project that has not been deployed before is also allowed
     * @returns A list of transport requests that can be used for deploy
     */
    public async getTransportRequests(packageName: string, appName: string): Promise<TransportRequest[]> {
        const acceptHeaders = {
            headers: {
                Accept: 'application/vnd.sap.as+xml; dataname=com.sap.adt.transport.service.checkData',
                'content-type':
                    'application/vnd.sap.as+xml; charset=UTF-8; dataname=com.sap.adt.transport.service.checkData'
            }
        };

        const data = `
                <?xml version="1.0" encoding="UTF-8"?>
                <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
                    <asx:values>
                        <DATA>
                        <PGMID/>
                        <OBJECT/>
                        <OBJECTNAME/>
                        <DEVCLASS>${packageName}</DEVCLASS>
                        <SUPER_PACKAGE/>
                        <OPERATION>I</OPERATION>
                        <URI>/sap/bc/adt/filestore/ui5-bsp/objects/${appName}/$create</URI>
                        </DATA>
                    </asx:values>
                </asx:abap>
            `;

        const response = await this.post('', data, acceptHeaders);
        return this.getTransportRequestList(response.data);
    }

    /**
     * Get a list of valid transport requests
     * from ADT transportcheckes response response.
     *
     * @param xml Raw XML string from ADT transportcheckes reponse data
     * @returns a list of valid transport requests can be used for deploy config
     */
    private getTransportRequestList(xml: string): TransportRequest[] {
        if (XmlParser.validate(xml) !== true) {
            this.log.warn(`Invalid XML: ${xml}`);
            return [];
        }
        const doc = new DOMParser().parseFromString(xml);

        const status = xpath.select1('//RESULT/text()', doc)?.toString() as AdtTransportStatus;
        switch (status) {
            case 'S':
                return this.getTransportList(doc);
            case 'E':
            default:
                this.log.warn(`Error or unkown response content: ${xml}`);
                return [];
        }
    }

    /**
     * Provide a list of transport requests available for the input package name and project name
     * in a ADT CTS request.
     *
     * @param doc document
     * @returns
     * - For local package, return [].
     * - For errors or other unkonwn reasons no transport number found, an error is thrown.
     */
    private getTransportList(doc: Document): TransportRequest[] {
        const recording = xpath.select1('//RECORDING/text()', doc)?.toString();
        const locked = (xpath.select1('//LOCKS', doc) as Element)?.textContent;
        const localPackage = xpath.select1('//DLVUNIT/text()', doc)?.toString();
        if (recording && !locked) {
            return this.getTransportListForNewProject(doc);
        } else if (locked) {
            return this.getLockedTransport(doc);
        } else if (LocalPackageText.includes(localPackage)) {
            return [];
        } else {
            throw new Error('Unable to parse ADT response');
        }
    }

    /**
     * This function processes ADT response for new project name that have not been deployed before,
     * all the available transport requests are returned.
     *
     * @param doc document
     * @returns transport numbers
     */
    private getTransportListForNewProject(doc: Document): TransportRequest[] {
        const transportReqs = xpath.select('//REQ_HEADER', doc) as Element[];
        const list = [];
        if (transportReqs && transportReqs.length > 0) {
            for (const transportReqEle of transportReqs) {
                const transportReq = this.convertTransportRequest(transportReqEle);
                if (transportReq) {
                    list.push(transportReq);
                }
            }
        }
        return list;
    }

    /**
     * This function processes ADT response for existing project name that has been locked.
     * A single, previously provided transport requests is returned in the list.
     *
     * @param doc document
     * @returns transport numbers
     */
    private getLockedTransport(doc: Document): TransportRequest[] {
        const transportReqEle = xpath.select1('//LOCKS//REQ_HEADER', doc) as Element;

        const transportReq = this.convertTransportRequest(transportReqEle);
        if (transportReq) {
            return [transportReq];
        } else {
            return [];
        }
    }

    /**
     * Convert transport request in XML element of ADT response to typed object.
     *
     * @param transportReqEle XML element of transport request data in ADT response
     * @returns JSON object format of input XML element
     */
    private convertTransportRequest(transportReqEle: Element): TransportRequest | undefined {
        if (!transportReqEle) {
            return undefined;
        }
        const transportNumber = xpath.select1('TRKORR/text()', transportReqEle)?.toString();
        if (!transportNumber) {
            return undefined;
        }
        return {
            transportNumber: transportNumber,
            user: xpath.select1('AS4USER/text()', transportReqEle)?.toString(),
            description: xpath.select1('AS4TEXT/text()', transportReqEle)?.toString(),
            client: xpath.select1('CLIENT/text()', transportReqEle)?.toString(),
            targetSystem: xpath.select1('TARSYSTEM/text()', transportReqEle)?.toString()
        };
    }
}
