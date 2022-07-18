import XmlParser from 'fast-xml-parser';

export enum TenantType {
    SAP = 'SAP',
    Customer = 'CUSTOMER'
}

/**
 * Possible values for operations type property: (C)loud and on-(P)remise.
 */
export type OperationsType = 'C' | 'P';

export interface AtoSettings {
    developmentPackage?: string;
    developmentPrefix?: string;
    operationsType?: OperationsType;
    isExtensibilityDevelopmentSystem?: boolean;
    tenantType?: TenantType;
    isTransportRequestRequired?: boolean;
}

/**
 * Parse an XML document for ATO (Adaptation Transport Organizer) settings.
 *
 * @param xml xml document containing ATO settings
 * @returns parsed ATO settings
 */
export function parseAtoResponse(xml: string): AtoSettings {
    if (XmlParser.validate(xml) !== true) {
        return {};
    }
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true
    };
    const obj = XmlParser.getTraversalObj(xml, options);
    const parsed = XmlParser.convertToJson(obj, options);
    return parsed.settings ? (parsed.settings as AtoSettings) : {};
}
