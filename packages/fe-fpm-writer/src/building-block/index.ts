import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import { join, parse } from 'path';
import { type BuildingBlock, type BuildingBlockConfig, type BuildingBlockMetaPath } from './types';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import format from 'xml-formatter';
import { getErrorMessage, validateBasePath } from '../common/validate';
import { getTemplatePath } from '../templates';
import { CodeSnippetLanguage, type FilePathProps, type CodeSnippet } from '../prompts/types';

const PLACEHOLDERS = {
    'id': 'REPLACE_WITH_BUILDING_BLOCK_ID',
    'entitySet': 'REPLACE_WITH_ENTITY',
    'qualifier': 'REPLACE_WITH_A_QUALIFIER'
};

/**
 * Generates a building block into the provided xml view file.
 *
 * @param {string} basePath - the base path
 * @param {BuildingBlockConfig} config - the building block configuration parameters
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Editor} the updated memfs editor instance
 */
export function generateBuildingBlock<T extends BuildingBlock>(
    basePath: string,
    config: BuildingBlockConfig<T>,
    fs?: Editor
): Editor {
    // Validate the base and view paths
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);
    if (!fs.exists(join(basePath, config.viewOrFragmentPath))) {
        throw new Error(`Invalid view path ${config.viewOrFragmentPath}.`);
    }

    // Read the view xml and template files and update contents of the view xml file
    const xmlDocument = getUI5XmlDocument(basePath, config.viewOrFragmentPath, fs);
    const templateDocument = getTemplateDocument(config.buildingBlockData, xmlDocument, fs);
    fs = updateViewFile(basePath, config.viewOrFragmentPath, config.aggregationPath, xmlDocument, templateDocument, fs);

    return fs;
}

/**
 * Returns the UI5 xml file document (view/fragment).
 *
 * @param {string} basePath - the base path
 * @param {string} viewPath - the path of the xml view relative to the base path
 * @param {Editor} fs - the memfs editor instance
 * @returns {Document} the view xml file document
 */
function getUI5XmlDocument(basePath: string, viewPath: string, fs: Editor): Document {
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
 * Returns the macros namespace from the xml document if it exists or creates a new one and returns it.
 *
 * @param {Document} ui5XmlDocument - the view/fragment xml file document
 * @returns {string} the macros namespace
 */
function getOrAddMacrosNamespace(ui5XmlDocument: Document): string {
    const namespaceMap = (ui5XmlDocument.firstChild as any)._nsMap;
    const macrosNamespaceEntry = Object.entries(namespaceMap).find(([_, value]) => value === 'sap.fe.macros');
    if (!macrosNamespaceEntry) {
        (ui5XmlDocument.firstChild as any)._nsMap['macros'] = 'sap.fe.macros';
        ui5XmlDocument.documentElement.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:macros', 'sap.fe.macros');
    }
    return macrosNamespaceEntry ? macrosNamespaceEntry[0] : 'macros';
}

/**
 * Method converts object based metaPath to string.
 *
 * @param {BuildingBlockMetaPath} metaPath - object based metaPath.
 * @param {boolean} usePlaceholders - apply placeholder values if value for attribute/property is not provided
 * @returns {string} Resolved string metaPath.
 */
function getMetaPath(metaPath?: BuildingBlockMetaPath, usePlaceholders?: boolean): string {
    if (!metaPath) {
        return usePlaceholders ? `/${PLACEHOLDERS.entitySet}/${PLACEHOLDERS.qualifier}` : '';
    }
    const { entitySet, qualifier, bindingContextType = 'absolute' } = metaPath;
    let entityPath = entitySet || (usePlaceholders ? PLACEHOLDERS.entitySet : '');
    const lastIndex = entityPath.lastIndexOf('.');
    entityPath = lastIndex >= 0 ? entityPath.substring?.(lastIndex + 1) : entityPath;
    const qualifierOrPlaceholder = qualifier || (usePlaceholders ? PLACEHOLDERS.qualifier : '');
    return bindingContextType === 'absolute' ? `/${entityPath}/${qualifierOrPlaceholder}` : qualifierOrPlaceholder;
}

/**
 * Returns the content of the xml file document.
 *
 * @param {BuildingBlock} buildingBlockData - the building block data
 * @param {Document} viewDocument - the view xml file document
 * @param {Editor} fs - the memfs editor instance
 * @param {boolean} usePlaceholders - apply placeholder values if value for attribute/property is not provided
 * @returns {string} the template xml file content
 */
function getTemplateContent<T extends BuildingBlock>(
    buildingBlockData: T,
    viewDocument: Document | undefined,
    fs: Editor,
    usePlaceholders?: boolean
): string {
    const templateFolderName = buildingBlockData.buildingBlockType;
    const templateFilePath = getTemplatePath(`/building-block/${templateFolderName}/View.xml`);
    if (typeof buildingBlockData.metaPath === 'object' || buildingBlockData.metaPath === undefined) {
        // Convert object based metapath to string
        const metaPath = getMetaPath(buildingBlockData.metaPath, usePlaceholders);
        buildingBlockData = { ...buildingBlockData, metaPath };
    }
    // Apply placeholders
    if (!buildingBlockData.id) {
        buildingBlockData.id = PLACEHOLDERS.id;
    }
    return render(
        fs.read(templateFilePath),
        {
            macrosNamespace: viewDocument ? getOrAddMacrosNamespace(viewDocument) : 'macros',
            data: buildingBlockData
        },
        {}
    );
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
    viewDocument: Document | undefined,
    fs: Editor
): Document {
    const templateContent = getTemplateContent(buildingBlockData, viewDocument, fs);
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
    if (targetNodes && Array.isArray(targetNodes) && targetNodes.length > 0) {
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

/**
 * Gets the properties for the file if the relative path is defined.
 *
 * @param {string} basePath - The base path
 * @param {string} relativePath - The relative path to the file in the config
 * @returns {FilePathProps} An object with file properties
 */
function getFilePathProps(basePath: string, relativePath?: string): FilePathProps {
    if (relativePath) {
        return {
            fileName: parse(relativePath).base,
            relativePath,
            fullPath: join(basePath, relativePath)
        };
    }
    return {};
}

/**
 * Gets the serialized content of the updated view file.
 *
 * @param {string} basePath - The base path
 * @param {BuildingBlockConfig} config - The building block configuration
 * @param {Editor} [fs] - The memfs editor instance
 * @returns {{ [questionName: string]: CodeSnippet }} An object with serialized code snippet content and file props
 */
export function getSerializedFileContent<T extends BuildingBlock>(
    basePath: string,
    config: BuildingBlockConfig<T>,
    fs?: Editor
): { [questionName: string]: CodeSnippet } {
    if (!config.buildingBlockData?.buildingBlockType) {
        return {};
    }
    // Validate the base and view paths
    if (!fs) {
        fs = create(createStorage());
    }
    // Read the view xml and template files and get content of the view xml file
    const xmlDocument = config.viewOrFragmentPath
        ? getUI5XmlDocument(basePath, config.viewOrFragmentPath, fs)
        : undefined;
    const content = getTemplateContent(config.buildingBlockData, xmlDocument, fs, true);
    const filePathProps = getFilePathProps(basePath, config.viewOrFragmentPath);
    return {
        viewOrFragmentPath: {
            content,
            language: CodeSnippetLanguage.XML,
            filePathProps
        }
    };
}
