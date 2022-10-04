import XmlParser from 'fast-xml-parser';
import * as xpath from 'xpath';
import { DOMParser } from '@xmldom/xmldom';
import type { Logger } from '@sap-ux/logger';

export function getTransportNumberFromResponse(xml: string, log: Logger): string {
    log.warn(xml);
    if (XmlParser.validate(xml) !== true) {
        log.warn(`Invalid XML: ${xml}`);
        return '';
    }
    const doc = new DOMParser().parseFromString(xml);
    return '';
}

/**
 * Get a list of valid transport numbers
 * from ADT transportcheckes response response.
 *
 * @param xml Raw XML string from ADT transportcheckes reponse data
 * @param log Service provider logger
 * @returns a list of valid transport numbers can be used for deploy config
 */
export function getTransportNumberList(xml: string, log: Logger): string[] {
    if (XmlParser.validate(xml) !== true) {
        log.warn(`Invalid XML: ${xml}`);
        return [];
    }
    const doc = new DOMParser().parseFromString(xml);
    return getTransportChecksResponse(doc, xml, log);
}

const LocalPackageText = ['LOCAL_PACKAGE', 'LOCAL'];
const enum AdtTransportStatus {
    Success = 'S',
    Error = 'E'
}

/**
 * Implementation based on WebIDE with simplified error handling.
 * Might need to improve the error handling in the future to expose
 * the backend error messages to end user / API consumer in the future.
 *
 * @param doc
 * @param xml Raw XML from reponse data for logging purpose
 * @param log Service provider logger
 * @returns available transport numbers
 */
function getTransportChecksResponse(doc: Document, xml: string, log: Logger): string[] {
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
 * Provide a list of transport numbers available for the input package name and project name
 * in a ADT CTS request.
 *
 * @param doc
 * @returns
 * - For local package, an array list that contain a single empty string is returned.
 * - For errors or other unkonwn reasons no transport number found, an empty array list is returned.
 */
function getTransportList(doc: Document): string[] {
    const recording = xpath.select1('//RECORDING/text()', doc)?.toString();
    const locked = (xpath.select1('//LOCKS', doc) as Element)?.textContent;
    const localPackage = xpath.select1('//DLVUNIT/text()', doc)?.toString();

    if (recording && !locked) {
        return getTransportableList(doc);
    } else if (locked) {
        return getLockedTransport(doc);
    } else if (LocalPackageText.includes(localPackage)) {
        return [''];
    } else {
        return [];
    }
}

/**
 * This function processes ADT response for new project name that have not been deployed before,
 * all the available transport numbers are returned.
 *
 * @param doc
 * @returns
 */
function getTransportableList(doc: Document): string[] {
    const transportNums = xpath.select('//REQ_HEADER/TRKORR/text()', doc) as Element[];
    const list = [];
    if (transportNums && transportNums.length > 0) {
        for (const transportNumElement of transportNums) {
            const transportNum = transportNumElement?.toString();
            if (transportNum) {
                list.push(transportNum);
            }
        }
    }
    return list;
}

/**
 * This function processes ADT response for existing project name that has been locked.
 * A single, previously provided transport number is returned in the list.
 *
 * @param doc
 * @returns
 */
function getLockedTransport(doc: Document): string[] {
    const transportNum = xpath.select1('//LOCKS//REQ_HEADER/TRKORR/text()', doc)?.toString();
    if (transportNum) {
        return [transportNum];
    } else {
        return [];
    }
}
