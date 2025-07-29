import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import { join, parse, relative } from 'path';
import type { UpdateViewOptions } from './types';
import { BuildingBlockType, type BuildingBlock, type BuildingBlockConfig, type BuildingBlockMetaPath } from './types';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import format from 'xml-formatter';
import { getErrorMessage, validateBasePath, validateDependenciesLibs } from '../common/validate';
import { getTemplatePath } from '../templates';
import { CodeSnippetLanguage, type FilePathProps, type CodeSnippet } from '../prompts/types';
import { coerce, lt } from 'semver';
import type { Manifest } from '../common/types';
import { getMinimumUI5Version } from '@sap-ux/project-access';
import { detectTabSpacing, extendJSON } from '../common/file';
import { getManifest, getManifestPath } from '../common/utils';

const PLACEHOLDERS = {
    'id': 'REPLACE_WITH_BUILDING_BLOCK_ID',
    'entitySet': 'REPLACE_WITH_ENTITY',
    'qualifier': 'REPLACE_WITH_A_QUALIFIER'
};

interface MetadataPath {
    contextPath?: string;
    metaPath: string;
}

/**
 * Generates a building block into the provided xml view file.
 *
 * @param {string} basePath - the base path
 * @param {BuildingBlockConfig} config - the building block configuration parameters
 * @param {Editor} [fs] - the memfs editor instance
 * @param {UpdateViewOptions} [updateViewOptions] - Options for updating the view file.
 * @returns {Editor} the updated memfs editor instance
 */
export async function generateBuildingBlock<T extends BuildingBlock>(
    basePath: string,
    config: BuildingBlockConfig<T>,
    fs?: Editor,
    updateViewOptions?: UpdateViewOptions
): Promise<Editor> {
    const { viewOrFragmentPath, aggregationPath, buildingBlockData, allowAutoAddDependencyLib = true } = config;
    // Validate the base and view paths
    if (!fs) {
        fs = create(createStorage());
    }
    await validateBasePath(basePath, fs, []);

    if (!fs.exists(join(basePath, viewOrFragmentPath))) {
        throw new Error(`Invalid view path ${viewOrFragmentPath}.`);
    }

    // Read the view xml and template files and update contents of the view xml file
    const xmlDocument = getUI5XmlDocument(basePath, viewOrFragmentPath, fs);
    const { content: manifest } = await getManifest(basePath, fs);
    const templateDocument = getTemplateDocument(buildingBlockData, xmlDocument, fs, manifest);
    fs = updateViewFile(
        basePath,
        viewOrFragmentPath,
        aggregationPath,
        xmlDocument,
        templateDocument,
        fs,
        updateViewOptions
    );

    if (allowAutoAddDependencyLib && manifest && !validateDependenciesLibs(manifest, ['sap.fe.macros'])) {
        // "sap.fe.macros" is missing - enhance manifest.json for missing "sap.fe.macros"
        const manifestPath = await getManifestPath(basePath, fs);
        const manifestContent = await getManifestContent(fs);
        const content = fs.read(manifestPath);
        const tabInfo = detectTabSpacing(content);
        extendJSON(fs, {
            filepath: manifestPath,
            content: manifestContent,
            tabInfo: tabInfo
        });
    }

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
 * Method returns default values for metadata path.
 *
 * @param {boolean} applyContextPath - whether to apply contextPath.
 * @param {boolean} usePlaceholders - apply placeholder values if value for attribute/property is not provided
 * @returns {MetadataPath} Default values for metadata path.
 */
function getDefaultMetaPath(applyContextPath: boolean, usePlaceholders?: boolean): MetadataPath {
    if (applyContextPath) {
        return {
            metaPath: usePlaceholders ? `/${PLACEHOLDERS.qualifier}` : '',
            contextPath: usePlaceholders ? PLACEHOLDERS.entitySet : ''
        };
    }
    return {
        metaPath: usePlaceholders ? `/${PLACEHOLDERS.entitySet}/${PLACEHOLDERS.qualifier}` : ''
    };
}

/**
 * Method converts object based metaPath to metadata path.
 *
 * @param {boolean} applyContextPath - whether to apply contextPath.
 * @param {BuildingBlockMetaPath} metaPath - object based metaPath.
 * @param {boolean} usePlaceholders - apply placeholder values if value for attribute/property is not provided
 * @returns {MetadataPath} Resolved metadata path information.
 */
function getMetaPath(
    applyContextPath: boolean,
    metaPath?: BuildingBlockMetaPath,
    usePlaceholders?: boolean
): MetadataPath {
    if (!metaPath) {
        return getDefaultMetaPath(applyContextPath, usePlaceholders);
    }
    const { bindingContextType = 'absolute', alwaysAbsolutePath = true } = metaPath;
    let { entitySet, qualifier } = metaPath;
    entitySet = entitySet || (usePlaceholders ? PLACEHOLDERS.entitySet : '');
    const qualifierOrPlaceholder = qualifier || (usePlaceholders ? PLACEHOLDERS.qualifier : '');
    if (applyContextPath) {
        const qualifierParts: string[] = qualifierOrPlaceholder.split('/');
        qualifier = qualifierParts.pop() as string;
        return {
            metaPath: qualifier,
            contextPath: qualifierParts.length ? `/${entitySet}/${qualifierParts.join('/')}` : `/${entitySet}`
        };
    }
    return {
        metaPath:
            bindingContextType === 'absolute' || alwaysAbsolutePath
                ? `/${entitySet}/${qualifierOrPlaceholder}`
                : qualifierOrPlaceholder
    };
}

/**
 * Returns the content of the xml file document.
 *
 * @param {BuildingBlock} buildingBlockData - the building block data
 * @param {Document} viewDocument - the view xml file document
 * @param {Manifest} manifest - the manifest content
 * @param {Editor} fs - the memfs editor instance
 * @param {boolean} usePlaceholders - apply placeholder values if value for attribute/property is not provided
 * @returns {string} the template xml file content
 */
function getTemplateContent<T extends BuildingBlock>(
    buildingBlockData: T,
    viewDocument: Document | undefined,
    manifest: Manifest | undefined,
    fs: Editor,
    usePlaceholders?: boolean
): string {
    const templateFolderName = buildingBlockData.buildingBlockType;
    const templateFilePath = getTemplatePath(`/building-block/${templateFolderName}/View.xml`);
    if (typeof buildingBlockData.metaPath === 'object' || buildingBlockData.metaPath === undefined) {
        // Special handling for chart - while runtime does not support approach without contextPath
        // or for equal or below UI5 v1.96.0 contextPath is applied
        const minUI5Version = manifest ? coerce(getMinimumUI5Version(manifest)) : undefined;
        const applyContextPath =
            buildingBlockData.buildingBlockType === BuildingBlockType.Chart ||
            !!(minUI5Version && lt(minUI5Version, '1.97.0'));
        // Convert object based metapath to string
        const metadataPath = getMetaPath(applyContextPath, buildingBlockData.metaPath, usePlaceholders);
        buildingBlockData = { ...buildingBlockData, metaPath: metadataPath.metaPath };
        if (!buildingBlockData.contextPath && metadataPath.contextPath) {
            buildingBlockData.contextPath = metadataPath.contextPath;
        }
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
 * Method returns the manifest content for the required dependency library.
 *
 * @param {Editor} fs - the memfs editor instance
 * @returns {Promise<string>} Manifest content for the required dependency library.
 */
export async function getManifestContent(fs: Editor): Promise<string> {
    // "sap.fe.macros" is missing - enhance manifest.json for missing "sap.fe.macros"
    const templatePath = getTemplatePath('/building-block/common/manifest.json');
    return render(fs.read(templatePath), { libraries: { 'sap.fe.macros': {} } });
}

/**
 * Returns the template xml file document.
 *
 * @param {BuildingBlock} buildingBlockData - the building block data
 * @param {Document} viewDocument - the view xml file document
 * @param {Editor} fs - the memfs editor instance
 * @param  {Manifest} manifest - the manifest content
 * @returns {Document} the template xml file document
 */
function getTemplateDocument<T extends BuildingBlock>(
    buildingBlockData: T,
    viewDocument: Document | undefined,
    fs: Editor,
    manifest: Manifest | undefined
): Document {
    const templateContent = getTemplateContent(buildingBlockData, viewDocument, manifest, fs);
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
 * @param {UpdateViewOptions} [updateViewOptions] - Options for updating the view file.
 *   @param {string} [updateViewOptions.replaceTargetLocalName] - If specified, replaces the child element of the target node
 *     with this local name (e.g., 'Page') with the new building block. If not specified, the new building block is appended as a child.
 * @returns {Editor} the updated memfs editor instance
 */
function updateViewFile(
    basePath: string,
    viewPath: string,
    aggregationPath: string,
    viewDocument: Document,
    templateDocument: Document,
    fs: Editor,
    updateViewOptions?: UpdateViewOptions
): Editor {
    const xpathSelect = xpath.useNamespaces((viewDocument.firstChild as any)._nsMap);

    // Find target aggregated element and append template as child
    const targetNodes = xpathSelect(aggregationPath, viewDocument);
    if (targetNodes && Array.isArray(targetNodes) && targetNodes.length > 0) {
        const targetNode = targetNodes[0] as Node;
        const sourceNode = viewDocument.importNode(templateDocument.documentElement, true);

        if (updateViewOptions?.replaceTargetLocalName) {
            // replace the target node with the source node if the replaceTargetLocalName is provided
            const elementToReplace = Array.from(targetNode.childNodes).find(
                (node) =>
                    node.nodeType === node.ELEMENT_NODE &&
                    (node as Element).localName === updateViewOptions.replaceTargetLocalName
            );
            if (elementToReplace) {
                targetNode.replaceChild(sourceNode, elementToReplace);
            } else {
                throw new Error(`Cannot replace node: Page Node in aggregationPath: ${aggregationPath}`);
            }
        } else {
            targetNode.appendChild(sourceNode);
        }

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
export async function getSerializedFileContent<T extends BuildingBlock>(
    basePath: string,
    config: BuildingBlockConfig<T>,
    fs?: Editor
): Promise<{ [questionName: string]: CodeSnippet }> {
    const snippets: { [questionName: string]: CodeSnippet } = {};
    const { buildingBlockData, viewOrFragmentPath, allowAutoAddDependencyLib = true } = config;
    if (!buildingBlockData?.buildingBlockType) {
        return {};
    }
    // Validate the base and view paths
    if (!fs) {
        fs = create(createStorage());
    }
    // Read the view xml and template files and get content of the view xml file
    const xmlDocument = viewOrFragmentPath ? getUI5XmlDocument(basePath, viewOrFragmentPath, fs) : undefined;
    const { content: manifest, path: manifestPath } = await getManifest(basePath, fs, false);
    const content = getTemplateContent(buildingBlockData, xmlDocument, manifest, fs, true);
    const filePathProps = getFilePathProps(basePath, viewOrFragmentPath);
    // Snippet for fragment xml
    snippets['viewOrFragmentPath'] = {
        content,
        language: CodeSnippetLanguage.XML,
        filePathProps
    };
    // Snippet for manifest.json
    if (allowAutoAddDependencyLib) {
        const manifestContent = await getManifestContent(fs);
        snippets['manifest'] = {
            content: manifestContent,
            language: CodeSnippetLanguage.JSON,
            filePathProps: {
                fileName: parse(manifestPath).base,
                relativePath: relative(basePath, manifestPath),
                fullPath: manifestPath
            }
        };
    }

    return snippets;
}
