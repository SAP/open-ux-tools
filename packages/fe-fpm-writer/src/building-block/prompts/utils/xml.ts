import { DOMParser } from '@xmldom/xmldom';
import type { Editor } from 'mem-fs-editor';
import { BuildingBlockType } from '../../types';

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
export const augmentXpathWithLocalNames = (path: string): string => {
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
 * @returns the list of xpath strings & page macro definition if page macro has been added by user.
 */
export function getXPathStringsForXmlFile(
    xmlFilePath: string,
    fs: Editor
): { inputChoices: Record<string, string>; pageMacroDefinition?: string } {
    const result: Record<string, string> = {};
    let pageMacroDefinition: string | undefined;
    try {
        const xmlContent = fs.read(xmlFilePath);
        const errorHandler = (level: string, message: string) => {
            throw new Error(`Unable to parse the xml view file. Details: [${level}] - ${message}`);
        };
        const xmlDocument = new DOMParser({ errorHandler }).parseFromString(xmlContent);
        const nodes = [{ parentNode: '', node: xmlDocument.firstChild }];

        // check macros namespace and page macro definition
        const macrosNamespace = getOrAddNamespace(xmlDocument);
        pageMacroDefinition = macrosNamespace ? `${macrosNamespace}:Page` : 'macros:Page';
        let hasPageMacroChild = false;

        while (nodes && nodes.length > 0) {
            const { parentNode, node } = nodes.shift()!;
            if (!node) {
                continue;
            }
            // If the current node does NOT have a <macros:Page> child, add <mvc:View> XPath to the result.
            // This prevents suggesting insertion points outside macros:Page when a macros:Page is present.
            hasPageMacroChild = Array.from(node.childNodes).some(
                (child) =>
                    child.nodeType === child.ELEMENT_NODE &&
                    (child as Element).localName === 'Page' &&
                    child.nodeName === pageMacroDefinition
            );
            if (!hasPageMacroChild) {
                result[`${parentNode}/${node.nodeName}`] = augmentXpathWithLocalNames(`${parentNode}/${node.nodeName}`);
            }

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
    return { inputChoices: result, pageMacroDefinition };
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

/**
 * Ensures that a given XML namespace URI is defined in the document and returns its prefix.
 *
 * @param ui5XmlDocument - The XML document
 * @param type - The type of namespace ('macros', 'richtexteditor', 'page')
 * @returns The prefix bound to the namespace URI (existing or newly added)
 */
export function getOrAddNamespace(
    ui5XmlDocument: Document,
    type: BuildingBlockType.RichTextEditor | BuildingBlockType.Page = BuildingBlockType.Page
): string {
    type NamespaceType = BuildingBlockType.RichTextEditor | BuildingBlockType.Page;
    const namespaceConfig: Record<NamespaceType, { uri: string; prefix: string }> = {
        [BuildingBlockType.RichTextEditor]: { uri: 'sap.fe.macros.richtexteditor', prefix: 'richtexteditor' },
        [BuildingBlockType.Page]: { uri: 'sap.fe.macros', prefix: 'macros' }
    };
    const { uri: namespaceUri, prefix: defaultPrefix } = namespaceConfig[type];
    const root = ui5XmlDocument.documentElement;

    // Check all namespace attributes for a matching URI
    for (const attr of Array.from(root.attributes)) {
        if (attr.name.startsWith('xmlns:') && attr.value === namespaceUri) {
            return attr.name.split(':')[1]; // Return existing prefix
        }
    }

    // Otherwise, add a new namespace binding with the default prefix
    root.setAttributeNS('http://www.w3.org/2000/xmlns/', `xmlns:${defaultPrefix}`, namespaceUri);

    return defaultPrefix;
}
