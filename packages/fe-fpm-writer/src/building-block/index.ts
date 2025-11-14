import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import { coerce, lt } from 'semver';
import { join, parse, relative } from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import format from 'xml-formatter';
import * as xpath from 'xpath';
import type { Editor } from 'mem-fs-editor';

import { getMinimumUI5Version } from '@sap-ux/project-access';

import {
    BuildingBlockType,
    type BuildingBlock,
    type BuildingBlockConfig,
    type BuildingBlockMetaPath,
    type CustomColumn,
    type RichTextEditor,
    bindingContextAbsolute,
    type TemplateConfig,
    type CustomFilterField,
    EmbededFragment
} from './types';
import type { Manifest, InternalCustomElement } from '../common/types';

import { getErrorMessage, validateBasePath, validateDependenciesLibs } from '../common/validate';
import { getTemplatePath } from '../templates';
import { CodeSnippetLanguage, type FilePathProps, type CodeSnippet } from '../prompts/types';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { detectTabSpacing, extendJSON } from '../common/file';
import { getManifest, getManifestPath } from '../common/utils';
import { getDefaultFragmentContent, setCommonDefaults } from '../common/defaults';
import { getOrAddNamespace } from './prompts/utils/xml';
import { i18nNamespaces, translate } from '../i18n';

const PLACEHOLDERS = {
    'id': 'REPLACE_WITH_BUILDING_BLOCK_ID',
    'entitySet': 'REPLACE_WITH_ENTITY',
    'qualifier': 'REPLACE_WITH_A_QUALIFIER'
};

/**
 * Type for embedded fragment data used in building block processing.
 */
type EmbeddedFragmentData = InternalCustomElement & EmbededFragment;

/**
 * Configuration for building block templates.
 */
interface BuildingBlockTemplateConfig {
    nodes: {
        explicit: string;
        default: string;
    };
    templateType: string;
    templateFile: string;
    namespace: {
        uri: string;
        prefix: string;
    };
    resultPropertyName: string;
    processor: (
        buildingBlockData: BuildingBlock,
        fs: Editor,
        viewPath: string,
        config: BuildingBlockTemplateConfig,
        embededFragment?: EmbeddedFragmentData
    ) => void;
}

/**
 * Configuration map for building block types.
 */
export const BUILDING_BLOCK_CONFIG: Partial<Record<BuildingBlockType, BuildingBlockTemplateConfig>> = {
    [BuildingBlockType.CustomColumn]: {
        nodes: { explicit: 'columns', default: 'Column' },
        templateType: 'common',
        templateFile: 'common/Fragment.xml',
        namespace: { uri: 'sap.fe.macros.table', prefix: 'macrosTable' },
        resultPropertyName: 'hasTableColumns',
        processor: processCustomColumn
    },
    [BuildingBlockType.CustomFilterField]: {
        nodes: { explicit: 'filterFields', default: 'FilterField' },
        templateType: 'filter',
        templateFile: 'filter/fragment.xml',
        namespace: { uri: 'sap.fe.macros.filterBar', prefix: 'macros' },
        resultPropertyName: 'hasFilterFields',
        processor: processCustomFilterField
    }
};

interface MetadataPath {
    contextPath?: string;
    metaPath: string;
}

/**
 * Configuration for aggregation path update.
 */
interface AggregationConfig {
    aggregationName: string;
    elementName: string;
    resultPropertyName: string;
}

/**
 * Generates a building block into the provided xml view file.
 *
 * @param {string} basePath - the base path
 * @param {BuildingBlockConfig} config - the building block configuration parameters
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Editor} the updated memfs editor instance
 */
export async function generateBuildingBlock<T extends BuildingBlock>(
    basePath: string,
    config: BuildingBlockConfig<T>,
    fs?: Editor
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

    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);

    // Read the view xml and template files and update contents of the view xml file
    const xmlDocument = getUI5XmlDocument(basePath, viewOrFragmentPath, fs);
    const { updatedAggregationPath, processedBuildingBlockData, hasAggregation, aggregationNamespace } =
        processBuildingBlock(buildingBlockData, xmlDocument, manifestPath, manifest, aggregationPath, fs);

    const templateConfig: TemplateConfig = {
        hasAggregation,
        aggregationNamespace
    };
    const templateDocument = getTemplateDocument(processedBuildingBlockData, xmlDocument, fs, manifest, templateConfig);

    if (buildingBlockData.buildingBlockType === BuildingBlockType.RichTextEditor) {
        const minUI5Version = manifest ? coerce(getMinimumUI5Version(manifest)) : undefined;
        if (minUI5Version && lt(minUI5Version, '1.117.0')) {
            const t = translate(i18nNamespaces.buildingBlock, 'richTextEditorBuildingBlock.');
            throw new Error(`${t('minUi5VersionRequirement', { minUI5Version: minUI5Version })}`);
        }
        getOrAddNamespace(xmlDocument, 'sap.fe.macros.richtexteditor', 'richtexteditor');
    }

    fs = updateViewFile(
        basePath,
        viewOrFragmentPath,
        updatedAggregationPath,
        xmlDocument,
        templateDocument,
        fs,
        config.replace
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
 * Updates aggregation path based on XML document structure.
 *
 * @param {Document} xmlDocument - The XML document to analyze
 * @param {string} aggregationPath - The current aggregation path
 * @param {CustomColumn | CustomFilterField} buildingBlockData - The building block data with embedded fragment
 * @param {AggregationConfig} config - Configuration specifying aggregation and element names
 * @returns {object} Object containing the updated aggregation path
 */
function updateAggregationPath<T extends CustomColumn | CustomFilterField>(
    xmlDocument: Document,
    aggregationPath: string,
    buildingBlockData: T,
    config: AggregationConfig
): { updatedAggregationPath: string; hasElement: boolean } {
    if (!buildingBlockData.embededFragment) {
        return { updatedAggregationPath: aggregationPath, hasElement: false };
    }

    const xpathSelect = xpath.useNamespaces((xmlDocument.firstChild as any)._nsMap);
    const hasAggregation = xpathSelect(`//*[local-name()='${config.aggregationName}']`, xmlDocument);
    if (hasAggregation && Array.isArray(hasAggregation) && hasAggregation.length > 0) {
        return {
            updatedAggregationPath: aggregationPath + `/${getOrAddNamespace(xmlDocument)}:${config.aggregationName}`,
            hasElement: true
        };
    } else {
        const useDefaultAggregation = xpathSelect(`//*[local-name()='${config.elementName}']`, xmlDocument);
        if (useDefaultAggregation && Array.isArray(useDefaultAggregation) && useDefaultAggregation.length > 0) {
            return { updatedAggregationPath: aggregationPath, hasElement: true };
        }
    }

    return { updatedAggregationPath: aggregationPath, hasElement: false };
}

/**
 * Processes building block configuration.
 *
 * @param {BuildingBlock} buildingBlockData - The building block data
 * @param {Document} xmlDocument - The XML document
 * @param {string} manifestPath - The manifest file path
 * @param {Manifest} manifest - The manifest object
 * @param {string} aggregationPath - The aggregation path
 * @param {Editor} fs - The memfs editor instance
 * @returns {object} Object containing updated aggregation path and processed building block data
 */
function processBuildingBlock<T extends BuildingBlock>(
    buildingBlockData: T,
    xmlDocument: Document,
    manifestPath: string,
    manifest: Manifest,
    aggregationPath: string,
    fs: Editor
): {
    updatedAggregationPath: string;
    processedBuildingBlockData: T;
    hasAggregation: boolean;
    aggregationNamespace: string;
} {
    let updatedAggregationPath = aggregationPath;
    let hasAggregation = false;
    let aggregationNamespace = 'macrosTable';
    let embededFragment: EmbeddedFragmentData | undefined;
    let viewPath: string | undefined;

    // Get configuration for the building block type
    const config = BUILDING_BLOCK_CONFIG[buildingBlockData.buildingBlockType];
    if (!config) {
        // Return defaults if no configuration is found
        return {
            updatedAggregationPath,
            processedBuildingBlockData: buildingBlockData,
            hasAggregation,
            aggregationNamespace
        };
    }

    // Process embedded fragment for types that support it
    if (
        (isCustomColumn(buildingBlockData) || isCustomFilterField(buildingBlockData)) &&
        buildingBlockData.embededFragment
    ) {
        embededFragment = setCommonDefaults(buildingBlockData.embededFragment, manifestPath, manifest);
        viewPath = join(embededFragment.path, `${embededFragment.fragmentFile ?? embededFragment.name}.fragment.xml`);

        // Use the processor function from the configuration
        config.processor(buildingBlockData, fs, viewPath, config, embededFragment);

        const result = updateAggregationPath(xmlDocument, aggregationPath, buildingBlockData, {
            aggregationName: config.nodes.explicit,
            elementName: config.nodes.default,
            resultPropertyName: config.resultPropertyName
        });
        updatedAggregationPath = result.updatedAggregationPath;
        hasAggregation = result.hasElement;
        aggregationNamespace = getOrAddNamespace(xmlDocument, config.namespace.uri, config.namespace.prefix);
    }

    return {
        updatedAggregationPath,
        processedBuildingBlockData: buildingBlockData,
        hasAggregation,
        aggregationNamespace
    };
}

/**
 * Processes custom column building block.
 *
 * @param {BuildingBlock} buildingBlockData - The building block data
 * @param {Editor} fs - The memfs editor instance
 * @param {string} viewPath - The view path
 * @param {BuildingBlockTemplateConfig} config - The building block configuration
 */
function processCustomColumn(
    buildingBlockData: BuildingBlock,
    fs: Editor,
    viewPath: string,
    config: BuildingBlockTemplateConfig
): void {
    if (!isCustomColumn(buildingBlockData)) {
        throw new Error('Expected CustomColumn building block data');
    }

    const columnConfig = buildingBlockData.embededFragment!;
    let processedEventHandler: string | undefined;

    // Apply event handler
    if (columnConfig.eventHandler) {
        processedEventHandler = applyEventHandlerConfiguration(fs, columnConfig, columnConfig.eventHandler, {
            controllerSuffix: false,
            typescript: columnConfig.typescript
        });
        columnConfig.eventHandler = processedEventHandler;
    }

    columnConfig.content = getDefaultFragmentContent('Sample Text', processedEventHandler);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath(config.templateFile), viewPath, columnConfig);
    }
}

/**
 * Processes custom filter field building block.
 *
 * @param {BuildingBlock} buildingBlockData - The building block data
 * @param {Editor} fs - The memfs editor instance
 * @param {string} viewPath - The view path
 * @param {BuildingBlockTemplateConfig} config - The building block configuration
 * @param {EmbeddedFragmentData} embededFragment - The embedded fragment data
 */
function processCustomFilterField(
    buildingBlockData: BuildingBlock,
    fs: Editor,
    viewPath: string,
    config: BuildingBlockTemplateConfig,
    embededFragment?: EmbeddedFragmentData
): void {
    if (!isCustomFilterField(buildingBlockData)) {
        throw new Error('Expected CustomFilterField building block data');
    }

    if (!embededFragment) {
        throw new Error('EmbeddedFragment is required for CustomFilterField');
    }

    const filterConfig = {
        controlID: buildingBlockData.filterFieldKey!,
        label: buildingBlockData.label,
        property: buildingBlockData.property,
        required: buildingBlockData.required ?? false,
        position: buildingBlockData.position!,
        eventHandler: buildingBlockData.embededFragment?.eventHandler,
        ns: embededFragment.ns,
        name: embededFragment.name,
        path: embededFragment.path
    };

    // Apply event handler
    if (filterConfig.eventHandler) {
        filterConfig.eventHandler = applyEventHandlerConfiguration(fs, filterConfig, filterConfig.eventHandler, {
            controllerSuffix: false,
            typescript: buildingBlockData.embededFragment?.typescript,
            templatePath: 'filter/Controller'
        });
    }

    if (!fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath(config.templateFile), viewPath, filterConfig);
    }
}

/**
 * Type guard to check if the building block data is a custom column.
 *
 * @param {BuildingBlock} data - The building block data to check
 * @returns {boolean} True if the data is a custom column
 */
function isCustomColumn(data: BuildingBlock): data is CustomColumn {
    return data.buildingBlockType === BuildingBlockType.CustomColumn;
}

/**
 * Type guard to check if the building block data is a custom filter field.
 *
 * @param {BuildingBlock} data - The building block data to check
 * @returns {boolean} True if the data is a custom filter field
 */
function isCustomFilterField(data: BuildingBlock): data is CustomFilterField {
    return data.buildingBlockType === BuildingBlockType.CustomFilterField;
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
 * @param {boolean} targetProperty - Whether to construct metaPath using targetProperty.
 * @returns {MetadataPath} Resolved metadata path information.
 */
function getMetaPath(
    applyContextPath: boolean,
    metaPath?: BuildingBlockMetaPath,
    usePlaceholders?: boolean,
    targetProperty?: string
): MetadataPath {
    if (!metaPath) {
        return getDefaultMetaPath(applyContextPath, usePlaceholders);
    }
    const { bindingContextType = bindingContextAbsolute, alwaysAbsolutePath = true } = metaPath;
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

    if (targetProperty) {
        const isAbsolute = bindingContextType === bindingContextAbsolute;
        // Example usage:
        // Absolute: entitySet = "Travel", targetProperty = "Status" => "/Travel/Status"
        // Relative: entitySet = "_Agency", targetProperty = "AgencyType" => "_Agency/AgencyType"
        const prefix = isAbsolute ? '/' : '';
        return { metaPath: `${prefix}${entitySet}/${targetProperty}` };
    }

    return {
        metaPath:
            bindingContextType === bindingContextAbsolute || alwaysAbsolutePath
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
 * @param {Record<string, unknown>} templateConfig - additional template configuration
 * @returns {string} the template xml file content
 */
function getTemplateContent<T extends BuildingBlock>(
    buildingBlockData: T,
    viewDocument: Document | undefined,
    manifest: Manifest | undefined,
    fs: Editor,
    usePlaceholders?: boolean,
    templateConfig?: TemplateConfig
): string {
    const templateFolderName = buildingBlockData.buildingBlockType;
    const templateFilePath = getTemplatePath(`/building-block/${templateFolderName}/View.xml`);
    if (typeof buildingBlockData.metaPath === 'object' || buildingBlockData.metaPath === undefined) {
        // Special handling for chart - while runtime does not support approach without contextPath
        // or for equal or below UI5 v1.96.0 contextPath is applied
        const minUI5Version = manifest ? coerce(getMinimumUI5Version(manifest)) : undefined;
        let targetProperty: string | undefined;
        if (buildingBlockData.buildingBlockType === BuildingBlockType.RichTextEditor) {
            // Get target property for RichTextEditor building block
            targetProperty = (buildingBlockData as RichTextEditor).targetProperty;
        }

        const applyContextPath =
            buildingBlockData.buildingBlockType === BuildingBlockType.Chart ||
            !!(minUI5Version && lt(minUI5Version, '1.97.0'));
        // Convert object based metapath to string
        const metadataPath = getMetaPath(applyContextPath, buildingBlockData.metaPath, usePlaceholders, targetProperty);
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
            macrosNamespace: viewDocument ? getOrAddNamespace(viewDocument, 'sap.fe.macros', 'macros') : 'macros',
            data: buildingBlockData,
            config: templateConfig
        },
        {}
    );
}

/**
 * Method returns the manifest content for the required dependency library.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} library - the dependency library
 * @returns {Promise<string>} Manifest content for the required dependency library.
 */
export async function getManifestContent(fs: Editor, library = 'sap.fe.macros'): Promise<string> {
    // "sap.fe.macros" is missing - enhance manifest.json for missing "sap.fe.macros"
    const templatePath = getTemplatePath('/building-block/common/manifest.json');
    return render(fs.read(templatePath), { libraries: { [library]: {} } });
}

/**
 * Returns the template xml file document.
 *
 * @param {BuildingBlock} buildingBlockData - the building block data
 * @param {Document} viewDocument - the view xml file document
 * @param {Editor} fs - the memfs editor instance
 * @param  {Manifest} manifest - the manifest content
 * @param {Record<string, unknown>} templateConfig - additional template configuration
 * @returns {Document} the template xml file document
 */
function getTemplateDocument<T extends BuildingBlock>(
    buildingBlockData: T,
    viewDocument: Document | undefined,
    fs: Editor,
    manifest: Manifest | undefined,
    templateConfig: TemplateConfig
): Document {
    const templateContent = getTemplateContent(
        buildingBlockData,
        viewDocument,
        manifest,
        fs,
        undefined,
        templateConfig
    );
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
 * @param {boolean} [replace] - If true, replaces the target element with the template xml document;
 * if false, appends the source node.
 * @returns {Editor} the updated memfs editor instance
 */
function updateViewFile(
    basePath: string,
    viewPath: string,
    aggregationPath: string,
    viewDocument: Document,
    templateDocument: Document,
    fs: Editor,
    replace: boolean = false
): Editor {
    const xpathSelect = xpath.useNamespaces((viewDocument.firstChild as any)._nsMap);

    // Find target aggregated element and append template as child
    const targetNodes = xpathSelect(aggregationPath, viewDocument);
    if (targetNodes && Array.isArray(targetNodes) && targetNodes.length > 0) {
        const targetNode = targetNodes[0] as Node;
        const sourceNode = viewDocument.importNode(templateDocument.documentElement, true);
        if (replace) {
            targetNode.parentNode?.replaceChild(sourceNode, targetNode);
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
