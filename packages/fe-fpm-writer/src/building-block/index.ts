import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import { coerce, lt } from 'semver';
import { join, parse, relative } from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import format from 'xml-formatter';
import * as xpath from 'xpath';
import type { Editor } from 'mem-fs-editor';

import { getMinimumUI5Version, getAppProgrammingLanguage } from '@sap-ux/project-access';
import {
    BuildingBlockType,
    PAGE_AGGREGATIONS,
    PAGE_TEMPLATE_TYPE_FULL,
    type BuildingBlock,
    type BuildingBlockConfig,
    type BuildingBlockMetaPath,
    type Page,
    type PageAggregationName,
    bindingContextAbsolute,
    type TemplateConfig
} from './types.js';
import type { Manifest } from '../common/types.js';
import { getErrorMessage, validateBasePath, validateDependenciesLibs } from '../common/validate.js';
import { getTemplatePath } from '../templates.js';
import { CodeSnippetLanguage, type FilePathProps, type CodeSnippet } from '../prompts/types.js';
import {
    CONFIG,
    copyTpl,
    createIdGenerator,
    detectTabSpacing,
    extendJSON,
    getRelativeTemplateComponentPath,
    type IdGeneratorFunction,
    type TemplateContext
} from '../common/file.js';
import { getManifest, getManifestPath } from '../common/utils.js';
import { getOrAddNamespace } from './prompts/utils/xml.js';
import { i18nNamespaces, translate } from '../i18n.js';
import { processBuildingBlock } from './processor.js';

const PLACEHOLDERS = {
    'id': 'REPLACE_WITH_BUILDING_BLOCK_ID',
    'entitySet': 'REPLACE_WITH_ENTITY',
    'qualifier': 'REPLACE_WITH_A_QUALIFIER'
};

const PAGE_TEMPLATE_COMMENT = 'This is a sample template, event handlers should be added for implementation';

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
 * @returns {Editor} the updated memfs editor instance
 */
export async function generateBuildingBlock<T extends BuildingBlock>(
    basePath: string,
    config: BuildingBlockConfig<T>,
    fs?: Editor
): Promise<Editor> {
    const { viewOrFragmentPath, aggregationPath, buildingBlockData, allowAutoAddDependencyLib = true } = config;
    // Validate the base and view paths
    fs ??= create(createStorage());
    await validateBasePath(basePath, fs, []);
    const fnGenerateId = config.buildingBlockData.generateId ?? (await createIdGenerator({ basePath, fsEditor: fs }));

    if (!fs.exists(join(basePath, viewOrFragmentPath))) {
        throw new Error(`Invalid view path ${viewOrFragmentPath}.`);
    }

    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);

    // Read the view xml and template files and update contents of the view xml file
    const xmlDocument = getUI5XmlDocument(basePath, viewOrFragmentPath, fs);
    const { updatedAggregationPath, processedBuildingBlockData, hasAggregation, aggregationNamespace } =
        processBuildingBlock(
            { ...buildingBlockData, generateId: fnGenerateId },
            xmlDocument,
            manifestPath,
            manifest,
            aggregationPath,
            fs
        );

    const templateConfig: TemplateConfig = {
        hasAggregation,
        aggregationNamespace
    };
    const templateDocument = getTemplateDocument(
        { ...processedBuildingBlockData, generateId: fnGenerateId },
        xmlDocument,
        fs,
        manifest,
        templateConfig
    );

    const isFullPageTemplate =
        buildingBlockData.buildingBlockType === BuildingBlockType.Page &&
        (buildingBlockData as Page).templateType === PAGE_TEMPLATE_TYPE_FULL;

    if (isFullPageTemplate) {
        const pageData = buildingBlockData as Page;
        appendPageAggregations(fs, xmlDocument, templateDocument, fnGenerateId, pageData);
    }

    if (
        buildingBlockData.buildingBlockType === BuildingBlockType.RichTextEditor ||
        buildingBlockData.buildingBlockType === BuildingBlockType.RichTextEditorButtonGroups
    ) {
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

    if (isFullPageTemplate) {
        await applyPageControllerTemplate(fs, basePath, viewOrFragmentPath);
    }

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
 * Appends the 7 Page building block aggregation fragments as child elements of the templateDocument root.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {Document} xmlDocument - the view XML document (used to resolve namespace prefixes)
 * @param {Document} templateDocument - the template document whose root element receives the children
 * @param {IdGeneratorFunction} generateId - function to generate unique IDs
 * @param {Page} pageData - the Page building block data containing optional aggregation mContent
 */
function appendPageAggregations(
    fs: Editor,
    xmlDocument: Document,
    templateDocument: Document,
    generateId: IdGeneratorFunction,
    pageData: Page
): void {
    const macrosNS = getOrAddNamespace(xmlDocument, 'sap.fe.macros', 'macros');
    const fragMacrosNS = macrosNS || 'macros';
    const macrosPrefix = `${fragMacrosNS}:`;
    const pageElement = templateDocument.documentElement;
    const aggErrorHandler = (level: string, message: string): never => {
        throw new Error(`Unable to parse page aggregation fragment. Details: [${level}] - ${message}`);
    };
    pageElement.appendChild(templateDocument.createComment(PAGE_TEMPLATE_COMMENT));
    for (const aggName of PAGE_AGGREGATIONS) {
        const mContent = pageData.aggregations?.[aggName] ?? '';
        const aggId = generateId(aggName);
        const aggContext = { macrosPrefix, mContent, aggId };
        const aggPath = getTemplatePath(`/building-block/page/${aggName}.xml`);
        const aggContent = render(fs.read(aggPath), aggContext, {}); // NOSONAR - template is a controlled file on disk, not user input
        // Always declare both default and prefixed sap.m namespaces so bare element names (e.g. IconTabBar)
        // and prefixed names (e.g. m:Button) both parse correctly regardless of the view's namespace config.
        const wrapped = `<root xmlns:${fragMacrosNS}="sap.fe.macros" xmlns="sap.m" xmlns:m="sap.m">${aggContent}</root>`;
        const aggDoc = new DOMParser({ errorHandler: aggErrorHandler }).parseFromString(wrapped, 'text/xml');
        for (const node of Array.from(aggDoc.documentElement.childNodes)) {
            if (node.nodeType === 1 /* Element */) {
                (node as Element).setAttribute('id', aggId);
                pageElement.appendChild(templateDocument.importNode(node, true));
            }
        }
    }
}

/**
 * Reorders the child elements of a macros:Page node to match the canonical PAGE_AGGREGATIONS order.
 * Preserves relative order of siblings with the same local name. Whitespace text nodes are dropped
 * because the xml-formatter call that follows will regenerate proper indentation.
 *
 * @param pageElement - the macros:Page DOM node whose children should be sorted
 */
function sortPageAggregationChildren(pageElement: Node): void {
    const allChildren = Array.from(pageElement.childNodes);
    const aggNames = PAGE_AGGREGATIONS as readonly string[];

    // Build pairs of [preceding comments, element] to preserve all user comments.
    // The PAGE_TEMPLATE_COMMENT is a special leading comment that always stays first.
    type NodeGroup = { comments: Node[]; element: Element };
    const groups: NodeGroup[] = [];
    const leadingComments: Node[] = [];
    let pendingComments: Node[] = [];
    let firstElementSeen = false;

    for (const node of allChildren) {
        if (node.nodeType === 8 /* Comment */) {
            if (!firstElementSeen) {
                // Comments before the first element are always leading comments
                leadingComments.push(node);
            } else {
                pendingComments.push(node);
            }
        } else if (node.nodeType === 1 /* Element */) {
            firstElementSeen = true;
            groups.push({ comments: pendingComments, element: node as Element });
            pendingComments = [];
        }
        // whitespace text nodes are intentionally dropped (xml-formatter regenerates indentation)
    }

    groups.sort((a, b) => {
        const aName = typeof a.element.localName === 'string' ? a.element.localName : '';
        const bName = typeof b.element.localName === 'string' ? b.element.localName : '';
        const aIdx = aggNames.indexOf(aName);
        const bIdx = aggNames.indexOf(bName);
        return (aIdx === -1 ? aggNames.length : aIdx) - (bIdx === -1 ? aggNames.length : bIdx);
    });

    while (pageElement.firstChild) {
        pageElement.removeChild(pageElement.firstChild); // NOSONAR - xmldom nodes do not implement Node.remove()
    }

    // Re-insert leading comments first (always before any element)
    for (const comment of leadingComments) {
        pageElement.appendChild(comment);
    }

    for (const { comments, element } of groups) {
        for (const comment of comments) {
            pageElement.appendChild(comment);
        }
        pageElement.appendChild(element);
    }

    // Trailing orphan comments (after the last element)
    for (const comment of pendingComments) {
        pageElement.appendChild(comment);
    }
}

/**
 * Appends a single Page building block aggregation template to an existing `<macros:Page>` element in a view XML file.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} basePath - the base path of the application
 * @param {string} viewPath - the path of the xml view relative to the base path
 * @param {{ aggregationName: PageAggregationName; mContent: string }} data - aggregation name and inner XML content
 * @param data.aggregationName
 * @param data.mContent
 * @returns {Editor} the updated memfs editor instance
 */
export async function appendPageBBAggregation(
    fs: Editor,
    basePath: string,
    viewPath: string,
    data: { aggregationName: PageAggregationName; mContent: string }
): Promise<Editor> {
    const { aggregationName: aggName, mContent } = data;
    const xmlDocument = getUI5XmlDocument(basePath, viewPath, fs);

    const generateId = await createIdGenerator({ basePath, fsEditor: fs });
    const aggId = generateId(aggName);

    const macrosNS = getOrAddNamespace(xmlDocument, 'sap.fe.macros', 'macros');
    const fragMacrosNS = macrosNS || 'macros';
    const macrosPrefix = `${fragMacrosNS}:`;
    const aggContext = { macrosPrefix, mContent, aggId };

    const aggPath = getTemplatePath(`/building-block/page/${aggName}.xml`);
    const aggContent = render(fs.read(aggPath), aggContext, {}); // NOSONAR - template is a controlled file on disk, not user input
    // Always declare both default and prefixed sap.m namespaces so bare element names (e.g. IconTabBar)
    // and prefixed names (e.g. m:Button) both parse correctly regardless of the view's namespace config.
    const wrapped = `<root xmlns:${fragMacrosNS}="sap.fe.macros" xmlns="sap.m" xmlns:m="sap.m">${aggContent}</root>`;

    const errorHandler = (level: string, message: string): never => {
        throw new Error(`Unable to parse page aggregation fragment. Details: [${level}] - ${message}`);
    };
    const aggDoc = new DOMParser({ errorHandler }).parseFromString(wrapped, 'text/xml');

    const firstChildView = xmlDocument.firstChild;
    if (!firstChildView) {
        throw new Error(`Unable to read namespace map from view ${viewPath}.`);
    }
    // Merge the view's namespace map with the macros prefix so the XPath query works even when
    // _nsMap does not include the macros prefix under the same key.
    const xpathSelect = xpath.useNamespaces({ ...(firstChildView as any)._nsMap, [fragMacrosNS]: 'sap.fe.macros' });
    const pageNodes = xpathSelect(`//${fragMacrosNS}:Page`, xmlDocument);
    if (!pageNodes || !Array.isArray(pageNodes) || pageNodes.length === 0) {
        throw new Error(`macros:Page element not found in view ${viewPath}.`);
    }

    const pageElement = pageNodes[0] as Node;
    const childNodes = Array.from(pageElement.childNodes);
    const hasExistingAggregation = childNodes.some(
        (node) =>
            node.nodeType === 1 /* Element */ &&
            (node as Element).localName === aggName &&
            (node as Element).namespaceURI === 'sap.fe.macros'
    );
    if (hasExistingAggregation) {
        sortPageAggregationChildren(pageElement);
        const existingXmlContent = new XMLSerializer().serializeToString(xmlDocument);
        fs.write(join(basePath, viewPath), format(existingXmlContent));
        return fs;
    }

    const hasExistingElementChildren = childNodes.some((n) => n.nodeType === 1 /* Element */);
    const hasTemplateComment = childNodes.some(
        (n) => n.nodeType === 8 /* Comment */ && (n as Comment).data?.includes(PAGE_TEMPLATE_COMMENT)
    );
    if (!hasExistingElementChildren && !hasTemplateComment) {
        pageElement.appendChild(xmlDocument.createComment(PAGE_TEMPLATE_COMMENT));
    }
    for (const node of Array.from(aggDoc.documentElement.childNodes)) {
        if (node.nodeType === 1 /* Element */) {
            (node as Element).setAttribute('id', aggId);
            pageElement.appendChild(xmlDocument.importNode(node, true));
        }
    }
    sortPageAggregationChildren(pageElement);

    const newXmlContent = new XMLSerializer().serializeToString(xmlDocument);
    fs.write(join(basePath, viewPath), format(newXmlContent));

    return fs;
}

/**
 * Copies the Page controller template (JS or TS) into the view directory if no controller file exists yet.
 * Uses getAppProgrammingLanguage for reliable detection, with a fallback to checking for an existing
 * .controller.ts sibling file for edge cases where language detection returns blank.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} basePath - the base path of the application
 * @param {string} viewOrFragmentPath - the relative path of the view/fragment file
 */
async function applyPageControllerTemplate(fs: Editor, basePath: string, viewOrFragmentPath: string): Promise<void> {
    if (!viewOrFragmentPath.endsWith('.view.xml')) {
        return;
    }
    const { dir: viewDir, name: viewName } = parse(viewOrFragmentPath);
    const viewBaseName = viewName.replace(/\.view$/, '');
    const detectedLanguage = await getAppProgrammingLanguage(basePath, fs);
    const isTypeScript =
        detectedLanguage === 'TypeScript' ||
        (!detectedLanguage && fs.exists(join(basePath, viewDir, `${viewBaseName}.controller.ts`)));
    const controllerExt = isTypeScript ? 'ts' : 'js';
    const controllerPath = join(basePath, viewDir, `${viewBaseName}.controller.${controllerExt}`);
    if (!fs.exists(controllerPath)) {
        copyTpl(fs, getTemplatePath(`/building-block/page/Controller.${controllerExt}`), controllerPath);
    }
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
        viewDocument = new DOMParser({ errorHandler }).parseFromString(viewContent, 'text/xml');
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
        if (
            (buildingBlockData.buildingBlockType === BuildingBlockType.RichTextEditor ||
                buildingBlockData.buildingBlockType === BuildingBlockType.CustomFormField) &&
            'targetProperty' in buildingBlockData &&
            typeof buildingBlockData.targetProperty === 'string'
        ) {
            targetProperty = buildingBlockData.targetProperty;
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
    const configKey = getRelativeTemplateComponentPath(templateFilePath);
    const config = CONFIG[configKey as keyof typeof CONFIG];
    let context = {
        macrosNamespace: viewDocument ? getOrAddNamespace(viewDocument, 'sap.fe.macros', 'macros') : 'macros',
        data: buildingBlockData,
        config: templateConfig
    };
    if (config?.getData) {
        const additionalContext = config.getData(
            buildingBlockData.generateId,
            buildingBlockData as Partial<TemplateContext>
        );
        context = { ...context, ...additionalContext };
    }
    return render(fs.read(templateFilePath), context, {});
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
        templateDocument = new DOMParser({ errorHandler }).parseFromString(templateContent, 'text/xml');
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
    const firstChild = viewDocument.firstChild;
    if (!firstChild) {
        throw new Error(`Unable to read namespace map from view ${viewPath}.`);
    }
    const xpathSelect = xpath.useNamespaces((firstChild as any)._nsMap);

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
    fs = fs ?? create(createStorage());
    // Read the view xml and template files and get content of the view xml file
    const xmlDocument = viewOrFragmentPath ? getUI5XmlDocument(basePath, viewOrFragmentPath, fs) : undefined;
    const { content: manifest, path: manifestPath } = await getManifest(basePath, fs, false);
    const fnGenerateId = buildingBlockData.generateId ?? (await createIdGenerator({ basePath, fsEditor: fs }));
    const content = getTemplateContent(
        { ...buildingBlockData, generateId: fnGenerateId },
        xmlDocument,
        manifest,
        fs,
        true
    );

    // For the full Page template, augment the snippet with all 7 aggregations
    let viewOrFragmentContent = content;
    const pageData = buildingBlockData as Page;
    const isFullPage =
        buildingBlockData.buildingBlockType === BuildingBlockType.Page &&
        pageData.templateType === PAGE_TEMPLATE_TYPE_FULL;
    if (isFullPage) {
        // Use the real view document for namespace resolution if available, otherwise create a minimal fallback
        const nsDoc =
            xmlDocument ??
            new DOMParser().parseFromString(
                '<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns:macros="sap.fe.macros" xmlns="sap.m"/>',
                'text/xml'
            );
        // Parse content directly so documentElement IS the <macros:Page> element,
        // matching what appendPageAggregations expects as templateDocument.documentElement.
        const snippetDoc = new DOMParser().parseFromString(
            `${content}`,
            'text/xml'
        );
        appendPageAggregations(fs, nsDoc, snippetDoc, fnGenerateId, pageData);
        const resultNode = snippetDoc.documentElement;
        viewOrFragmentContent = resultNode ? format(new XMLSerializer().serializeToString(resultNode)) : content;
    }
    const filePathProps = getFilePathProps(basePath, viewOrFragmentPath);
    // Snippet for fragment xml
    snippets['viewOrFragmentPath'] = {
        content: viewOrFragmentContent,
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
