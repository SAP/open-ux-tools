import { XMLParser } from 'fast-xml-parser';

/**
 * Recursively checks if an object (parsed XML) contains an element with the specified id attribute.
 *
 * @param obj - parsed XML object to search in
 * @param id - id to search for
 * @param attrPrefix - attribute prefix used by the parser (default: '@_')
 * @returns true if an element with the id is found
 */
function hasElementWithId(obj: unknown, id: string, attrPrefix = '@_'): boolean {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    const objRecord = obj as Record<string, unknown>;
    const idAttr = `${attrPrefix}id`;

    // Check if this element has the id attribute
    if (objRecord[idAttr] === id) {
        return true;
    }

    for (const key in objRecord) {
        if (key.startsWith(attrPrefix)) {
            continue; // Skip attributes
        }

        if (checkIdInValue(objRecord[key], id, attrPrefix)) {
            return true;
        }
    }

    return false;
}

/**
 * Checks if a value (object or array) contains an element with the specified id.
 *
 * @param value - value to check (can be array or object)
 * @param id - id to search for
 * @param attrPrefix - attribute prefix used by the parser
 * @returns true if id is found in the value
 */
function checkIdInValue(value: unknown, id: string, attrPrefix: string): boolean {
    if (Array.isArray(value)) {
        return value.some((item) => hasElementWithId(item, id, attrPrefix));
    }
    if (typeof value === 'object' && value !== null) {
        return hasElementWithId(value, id, attrPrefix);
    }
    return false;
}

/**
 * Checks if an element with the specified id is available (does not exist) in the XML content.
 *
 * @param id - id to check for availability
 * @param xmlContent - XML content as string
 * @returns true if the id is available (not found), false if it exists
 */
function checkElementIdAvailable(id: string, xmlContent: string): boolean {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseAttributeValue: false
    });

    try {
        const xmlDocument: unknown = parser.parse(xmlContent);
        return xmlDocument ? !hasElementWithId(xmlDocument, id) : true;
    } catch {
        // Parse error = no valid document = no element with id
        return true;
    }
}

/**
 * Checks if a UI5 control ID is unique across XML files (fragments and views).
 *
 * @param id - ID to check
 * @param files - Array of XML file contents to check
 * @returns true if the id is unique (available), false if it already exists
 */
export function isUI5IdUnique(id: string, files: string[]): boolean {
    return files.every((content) => content === '' || checkElementIdAvailable(id, content));
}
