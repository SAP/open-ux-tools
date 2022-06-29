import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import type { BuildingBlock } from './types';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import format from 'xml-formatter';
import { getErrorMessage, validateBasePath } from '../common/validate';

/**
 * Generates a building block into the provided xml view file.
 *
 * @param {string} basePath - the base path
 * @param {string} viewOrFragmentPath - the path of the view or fragment xml file relative to the base path
 * @param {string} aggregationPath - the aggregation xpath
 * @param {BuildingBlock} buildingBlockData - the building block data
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Editor} the updated memfs editor instance
 */
export function generateBuildingBlock<T extends BuildingBlock>(
    basePath: string,
    viewOrFragmentPath: string,
    aggregationPath: string,
    buildingBlockData: T,
    fs: Editor
): Editor {
    // Validate the base and view paths
    validateBasePath(basePath, fs);
    if (!fs.exists(join(basePath, viewOrFragmentPath))) {
        throw new Error(`Invalid view path ${viewOrFragmentPath}.`);
    }

    // Read the view xml and template files and update contents of the view xml file
    const viewDocument = getViewDocument(basePath, viewOrFragmentPath, fs);
    const templateDocument = getTemplateDocument(buildingBlockData, viewDocument, fs);
    fs = updateViewFile(basePath, viewOrFragmentPath, aggregationPath, viewDocument, templateDocument, fs);

    return fs;
}

/**
 * Returns the view xml file document.
 *
 * @param {string} basePath - the base path
 * @param {string} viewPath - the path of the xml view relative to the base path
 * @param {Editor} fs - the memfs editor instance
 * @returns {Document} the view xml file document
 */
function getViewDocument(basePath: string, viewPath: string, fs: Editor): Document {
    let viewContent: string;
    try {
        viewContent = fs.read(join(basePath, viewPath));
    } catch (error) {
        throw new Error(`Unable to read xml view file. Details: ${getErrorMessage(error)}`);
    }

    const errorHandler = (level: string, message: string) => {
        throw new Error(`Unable to parse xml view file. Details: [${level}] - ${message}`);
    };

    // Parse the xml view content
    let viewDocument: Document;
    try {
        viewDocument = new DOMParser({ errorHandler }).parseFromString(viewContent);
    } catch (error) {
        throw new Error(`Unable to parse xml view file. Details: ${getErrorMessage(error)}`);
    }

    return viewDocument;
}
/**
 * Returns the macros namespace from the xml view document if it exists or creates a new one and returns it.
 *
 * @param {Document} viewDocument - the view xml file document
 * @returns {string} the macros namespace
 */
function getOrAddMacrosNamespace(viewDocument: Document): string {
    const namespaceMap = (viewDocument.firstChild as any)._nsMap;
    const macrosNamespaceEntry = Object.entries(namespaceMap).find(([_, value]) => value === 'sap.fe.macros');
    if (!macrosNamespaceEntry) {
        (viewDocument.firstChild as any)._nsMap['macros'] = 'sap.fe.macros';
    }
    return macrosNamespaceEntry ? macrosNamespaceEntry[0] : 'macros';
}

/**
 * Returns the template xml file document.
 *
 * @param {BuildingBlock} buildingBlockData - the building block data
 * @param {Document} viewDocument - the view xml file document
 * @param {Editor} fs - the memfs editor instance
 * @returns {Document} the template xml file document
 */
function getTemplateDocument<T extends BuildingBlock>(
    buildingBlockData: T,
    viewDocument: Document,
    fs: Editor
): Document {
    const templateFolderName = buildingBlockData.buildingBlockType;
    const templateFilePath = join(__dirname, `../../templates/building-block/${templateFolderName}/View.xml`);
    const templateContent = render(fs.read(templateFilePath), {
        macrosNamespace: getOrAddMacrosNamespace(viewDocument),
        data: buildingBlockData
    });
    const errorHandler = (level: string, message: string) => {
        throw new Error(`Unable to parse template file with building block data. Details: [${level}] - ${message}`);
    };

    // Parse the rendered template content
    let templateDocument: Document;
    try {
        templateDocument = new DOMParser({ errorHandler }).parseFromString(templateContent);
    } catch (error) {
        throw new Error(`Unable to parse template file with building block data. Details: ${getErrorMessage(error)}`);
    }

    return templateDocument;
}

/**
 * Updates the view file by inserting the template as a child of the element specified in the aggregated xpath.
 *
 * @param {string} basePath - the base path
 * @param {string} viewPath - the path of the xml view relative to the base path
 * @param {string} aggregationPath - the aggregation xpath
 * @param {Document} viewDocument - the view xml document
 * @param {Document} templateDocument - the template xml document
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Editor} the updated memfs editor instance
 */
function updateViewFile(
    basePath: string,
    viewPath: string,
    aggregationPath: string,
    viewDocument: Document,
    templateDocument: Document,
    fs: Editor
): Editor {
    const xpathSelect = xpath.useNamespaces((viewDocument.firstChild as any)._nsMap);

    // Find target aggregated element and append template as child
    const targetNodes = xpathSelect(aggregationPath, viewDocument);
    if (targetNodes && targetNodes.length > 0) {
        const targetNode = targetNodes[0] as Node;
        const sourceNode = viewDocument.importNode(templateDocument.documentElement, true);
        targetNode.appendChild(sourceNode);

        // Serialize and format new view xml document
        const newXmlContent = new XMLSerializer().serializeToString(viewDocument);
        fs.write(join(basePath, viewPath), format(newXmlContent));
    } else {
        throw new Error(`Aggregation control not found ${aggregationPath}.`);
    }
    return fs;
}
