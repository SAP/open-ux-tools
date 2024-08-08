import { DOMParser } from '@xmldom/xmldom';
import type { Editor } from 'mem-fs-editor';

/**
 * Method validates if passed id is available.
 *
 * @param fs  - the file system object for reading files
 * @param viewOrFragmentPath - path to fragment or view file
 * @param id - id to check/validate
 * @returns true if passed id is available.
 */
export function isElementIdAvailable(fs: Editor, viewOrFragmentPath: string, id: string): boolean {
    const xmlContent = fs.read(viewOrFragmentPath).toString();
    const xmlDocument = new DOMParser({ errorHandler: (): void => {} }).parseFromString(xmlContent);
    return xmlDocument.documentElement ? !xmlDocument.getElementById(id) : true;
}

/**
 * Converts the provided xpath string from `/mvc:View/Page/content` to
 * `/mvc:View/*[local-name()='Page']/*[local-name()='content']`.
 *
 * @param path - the xpath string
 * @returns the augmented xpath string.
 */
const augmentXpathWithLocalNames = (path: string): string => {
    const result = [];
    for (const token of path.split('/')) {
        result.push(token === '' || token.includes(':') ? token : `*[local-name()='${token}']`);
    }
    return result.join('/');
};

/**
 * Returns a list of xpath strings for each element of the xml file provided.
 *
 * @param xmlFilePath - the xml file path
 * @param fs - the file system object for reading files
 * @returns the list of xpath strings.
 */
export function getXPathStringsForXmlFile(xmlFilePath: string, fs: Editor): Record<string, string> {
    const result: Record<string, string> = {};
    try {
        const xmlContent = fs.read(xmlFilePath);
        const errorHandler = (level: string, message: string) => {
            throw new Error(`Unable to parse the xml view file. Details: [${level}] - ${message}`);
        };
        const xmlDocument = new DOMParser({ errorHandler }).parseFromString(xmlContent);
        const nodes = [{ parentNode: '', node: xmlDocument.firstChild }];
        while (nodes && nodes.length > 0) {
            const { parentNode, node } = nodes.shift()!;
            if (!node) {
                continue;
            }
            result[`${parentNode}/${node.nodeName}`] = augmentXpathWithLocalNames(`${parentNode}/${node.nodeName}`);
            const childNodes = Array.from(node.childNodes);
            for (const childNode of childNodes) {
                if (childNode.nodeType === childNode.ELEMENT_NODE) {
                    nodes.push({
                        parentNode: `${parentNode}/${node.nodeName}`,
                        node: childNode
                    });
                }
            }
        }
    } catch (error) {
        throw new Error(`An error occurred while parsing the view or fragment xml. Details: ${getErrorMessage(error)}`);
    }
    return result;
}

/**
 * Returns the message property if the error is an instance of `Error` else a string representation of the error.
 *
 * @param {Error} error  - the error instance
 * @returns {string} the error message.
 */
function getErrorMessage(error: Error): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Method returns ids of specific macro element found in passed xml file.
 *
 * @param viewOrFragmentPath - path to fragment or view file
 * @param fs  - the file system object for reading files
 * @returns an array of ids found in passed xml file.
 */
export async function getFilterBarIdsInFile(viewOrFragmentPath: string, fs: Editor): Promise<string[]> {
    const ids: string[] = [];
    const buildingBlockSelector = 'macros:FilterBar';
    const xmlContent = fs.read(viewOrFragmentPath);
    const errorHandler = (level: string, message: string): void => {
        throw new Error(`Unable to parse the xml view file. Details: [${level}] - ${message}`);
    };
    const xmlDocument = new DOMParser({ errorHandler }).parseFromString(xmlContent);
    const elements = Array.from(xmlDocument.getElementsByTagName(buildingBlockSelector));
    for (const element of elements) {
        const id = element.getAttributeNode('id')?.value;
        id && ids.push(id);
    }
    return ids;
}
