import XmlParser from 'fast-xml-parser';
import * as xpath from 'xpath';
import { DOMParser } from '@xmldom/xmldom';
import type { Logger } from '@sap-ux/logger';
import type { TransportRequest } from '../../types';
import { t } from '../../../i18n';

const LocalPackageText = ['LOCAL_PACKAGE', 'LOCAL'];
const enum AdtTransportStatus {
    Success = 'S',
    Error = 'E'
}

/**
 * Get a list of valid transport requests
 * from ADT transportcheckes response response.
 *
 * @param xml Raw XML string from ADT transportcheckes reponse data
 * @param log Service provider logger
 * @returns a list of valid transport requests can be used for deploy config
 */
export function getTransportRequestList(xml: string, log: Logger): TransportRequest[] {
    if (XmlParser.validate(xml) !== true) {
        log.warn(`Invalid XML: ${xml}`);
        return [];
    }
    const doc = new DOMParser().parseFromString(xml);

    const status = xpath.select1('//RESULT/text()', doc)?.toString();
    switch (status) {
        case AdtTransportStatus.Success:
            return getTransportList(doc);
        case AdtTransportStatus.Error:
        default:
            log.warn(`Error or unkown response content: ${xml}`);
            return [];
    }
}

/**
 * Provide a list of transport requests available for the input package name and project name
 * in a ADT CTS request.
 *
 * @param doc
 * @returns
 * - For local package, return [].
 * - For errors or other unkonwn reasons no transport number found, an error is thrown.
 */
function getTransportList(doc: Document): TransportRequest[] {
    const recording = xpath.select1('//RECORDING/text()', doc)?.toString();
    const locked = (xpath.select1('//LOCKS', doc) as Element)?.textContent;
    const localPackage = xpath.select1('//DLVUNIT/text()', doc)?.toString();

    if (recording && !locked) {
        return getTransportListForNewProject(doc);
    } else if (locked) {
        return getLockedTransport(doc);
    } else if (LocalPackageText.includes(localPackage)) {
        return [];
    } else {
        throw new Error(t('error.unableToParseAdtResponse'));
    }
}

/**
 * This function processes ADT response for new project name that have not been deployed before,
 * all the available transport requests are returned.
 * @param doc
 * @returns
 */
function getTransportListForNewProject(doc: Document): TransportRequest[] {
    const transportReqs = xpath.select('//REQ_HEADER', doc) as Element[];
    const list = [];
    if (transportReqs && transportReqs.length > 0) {
        for (const transportReqEle of transportReqs) {
            const transportReq = convertTransportRequest(transportReqEle);
            if (transportReq) {
                list.push(transportReq);
            }
        }
    }
    return list;
}

/**
 * This function processes ADT response for existing project name that has been locked.
 * A single, previously provided transport request is returned in the list.
 * @param doc
 * @returns
 */
function getLockedTransport(doc: Document): TransportRequest[] {
    const transportReqEle = xpath.select1('//LOCKS//REQ_HEADER', doc) as Element;

    const transportReq = convertTransportRequest(transportReqEle);
    if (transportReq) {
        return [transportReq];
    } else {
        return [];
    }
}

/**
 * Convert transport request in XML element of ADT response to typed object.
 * @param transportReqEle XML element of transport request data in ADT response
 * @returns
 */
function convertTransportRequest(transportReqEle: Element): TransportRequest {
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
        date: xpath.select1('AS4DATE/text()', transportReqEle)?.toString(),
        time: xpath.select1('AS4TIME/text()', transportReqEle)?.toString(),
        description: xpath.select1('AS4TEXT/text()', transportReqEle)?.toString(),
        client: xpath.select1('CLIENT/text()', transportReqEle)?.toString(),
        targetSystem: xpath.select1('TARSYSTEM/text()', transportReqEle)?.toString(),
        transportRequestStatus: xpath.select1('TRSTATUS/text()', transportReqEle)?.toString(),
        transportRequestFunction: xpath.select1('TRFUNCTION/text()', transportReqEle)?.toString()
    };
}
