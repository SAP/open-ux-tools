import XmlParser from 'fast-xml-parser';

export function parseSearchConfigRef(xml: string): string {
    if (XmlParser.validate(xml) !== true) {
        return null;
    }
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true
    };
    const obj = XmlParser.getTraversalObj(xml, options);
    const parsed = XmlParser.convertToJson(obj, options);
    const configuraitons = parsed.configurations;
    const config = Array.isArray(configuraitons) ? configuraitons[0] : configuraitons.configuration;
    return config?.link?.href;
}

export function parseTransportRequests(xml: string): string[] {
    if (XmlParser.validate(xml) !== true) {
        return null;
    }
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true
    };
    const obj = XmlParser.getTraversalObj(xml, options);
    const parsed = XmlParser.convertToJson(obj, options);
    return [];
}
