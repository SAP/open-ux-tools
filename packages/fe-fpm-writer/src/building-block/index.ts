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
    PAGE_BB_DEFAULT_AGGREGATIONS,
    PAGE_BB_HANDLERS,
    type PageAggregationName,
    type BuildingBlock,
    type BuildingBlockConfig,
    type BuildingBlockMetaPath,
    type Page,
    type XmlAggregationGroup,
    type GenerateBuildingBlockAggregationConfig,
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
 * Returns true if the building block data represents a Page building block with the full template type.
 *
 * @param data - the building block data
 * @returns true if full Page template
 */
function isFullPageTemplate(data: BuildingBlock): boolean {
    return data.buildingBlockType === BuildingBlockType.Page && (data as Page).templateType === PAGE_TEMPLATE_TYPE_FULL;
}

/**
 * Returns the aggregation names to append for a Page building block, or undefined if not a Page.
 * Full template appends all PAGE_AGGREGATIONS; basic template appends only 'items'.
 *
 * @param data - the building block data
 * @returns aggregation names array, or undefined if not a Page building block
 */
function getPageAggregationNames(data: BuildingBlock): readonly PageAggregationName[] | undefined {
    if (data.buildingBlockType !== BuildingBlockType.Page) {
        return undefined;
    }
    return (data as Page).templateType === PAGE_TEMPLATE_TYPE_FULL ? PAGE_AGGREGATIONS : ['items'];
}

/**
 * Throws if the manifest's minUI5Version does not meet the 1.145.0 requirement for the full Page template.
 *
 * @param manifest - the manifest content, or undefined if not available
 */
function validateFullPageTemplateVersion(manifest: Manifest | undefined): void {
    const minUI5VersionRaw = manifest ? getMinimumUI5Version(manifest) : undefined;
    const minUI5Version = minUI5VersionRaw ? coerce(minUI5VersionRaw) : undefined;
    if (!minUI5Version || lt(minUI5Version, '1.145.0')) {
        const t = translate(i18nNamespaces.buildingBlock, 'pageBuildingBlock.');
        throw new Error(
            `${t('fullTemplateMinUi5VersionRequirement', { minUI5Version: minUI5Version?.version ?? minUI5VersionRaw ?? 'unknown' })}`
        );
    }
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

    const fullPageTemplate = isFullPageTemplate(buildingBlockData);
    const pageAggregationNames = getPageAggregationNames(buildingBlockData);

    if (fullPageTemplate) {
        validateFullPageTemplateVersion(manifest);
    }

    if (pageAggregationNames) {
        const pageData = buildingBlockData as Page;
        appendPageAggregations(fs, xmlDocument, templateDocument, fnGenerateId, pageData, pageAggregationNames);
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

    if (fullPageTemplate) {
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
 * Resolves the sap.fe.macros namespace prefix from the view document.
 * If sap.fe.macros is the default namespace (no prefix), declares xmlns:macros on the document element
 * so that generated prefixed elements like <macros:items> remain valid.
 *
 * @param xmlDocument - the view XML document
 * @returns the resolved namespace prefix string (e.g. 'macros')
 */
function resolveMacrosPrefix(xmlDocument: Document): string {
    const prefix = getOrAddNamespace(xmlDocument, 'sap.fe.macros', 'macros');
    if (prefix === '') {
        xmlDocument.documentElement.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:macros', 'sap.fe.macros');
        return 'macros';
    }
    return prefix;
}

/**
 * Renders a Page aggregation EJS template and parses it as an XML fragment document.
 * Inherits all xmlns:* declarations from the view root so inner content can use any view-declared prefix.
 *
 * @param fs - the memfs editor instance
 * @param aggName - the aggregation name (e.g. 'footer', 'items')
 * @param aggContext - the EJS template context
 * @param aggContext.macrosPrefix - the namespace prefix string (e.g. 'macros:')
 * @param aggContext.mContent - optional inner XML content for the aggregation
 * @param aggContext.aggId - the generated unique ID for the aggregation element
 * @param fragMacrosNS - the namespace prefix resolved for sap.fe.macros
 * @param xmlDocument - the view XML document (used to inherit namespace declarations)
 * @returns parsed XML document whose documentElement contains the aggregation child nodes
 */
function buildPageAggregationFragment(
    fs: Editor,
    aggName: string,
    aggContext: { macrosPrefix: string; mContent: string; aggId: string },
    fragMacrosNS: string,
    xmlDocument: Document
): Document {
    const aggPath = getTemplatePath(`/building-block/page/${aggName}.xml`);
    const aggContent = render(fs.read(aggPath), aggContext, {}); // NOSONAR - template is a controlled file on disk, not user input
    const extraNamespaces = Array.from(xmlDocument.documentElement.attributes)
        .filter((a) => a.name.startsWith('xmlns:') && a.name !== `xmlns:${fragMacrosNS}` && a.name !== 'xmlns:m')
        .map((a) => `${a.name}="${a.value}"`)
        .join(' ');
    const wrapped = `<root xmlns:${fragMacrosNS}="sap.fe.macros" xmlns="sap.m" xmlns:m="sap.m" ${extraNamespaces}>${aggContent}</root>`;
    const errorHandler = (level: string, message: string): never => {
        throw new Error(`Unable to parse page aggregation fragment '${aggName}'. Details: [${level}] - ${message}`);
    };
    return new DOMParser({ errorHandler }).parseFromString(wrapped, 'text/xml');
}

/**
 * Appends Page building block aggregation fragments as child elements of the templateDocument root.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {Document} xmlDocument - the view XML document (used to resolve namespace prefixes)
 * @param {Document} templateDocument - the template document whose root element receives the children
 * @param {IdGeneratorFunction} generateId - function to generate unique IDs
 * @param {Page} pageData - the Page building block data containing optional aggregation mContent
 * @param {readonly PageAggregationName[]} [aggNames] - aggregation names to append; defaults to all PAGE_AGGREGATIONS
 */
function appendPageAggregations(
    fs: Editor,
    xmlDocument: Document,
    templateDocument: Document,
    generateId: IdGeneratorFunction,
    pageData: Page,
    aggNames: readonly PageAggregationName[] = PAGE_AGGREGATIONS
): void {
    const fragMacrosNS = resolveMacrosPrefix(xmlDocument);
    const macrosPrefix = `${fragMacrosNS}:`;
    const pageElement = templateDocument.documentElement;
    pageElement.appendChild(templateDocument.createComment(PAGE_TEMPLATE_COMMENT));
    for (const aggName of aggNames) {
        const mContent = pageData.aggregations?.[aggName] ?? PAGE_BB_DEFAULT_AGGREGATIONS[aggName] ?? '';
        const aggId = generateId(aggName);
        const aggContext = { macrosPrefix, mContent, aggId };
        const aggDoc = buildPageAggregationFragment(fs, aggName, aggContext, fragMacrosNS, xmlDocument);
        for (const node of Array.from(aggDoc.documentElement.childNodes)) {
            if (node.nodeType === 1 /* Element */) {
                (node as Element).setAttribute('id', aggId);
                pageElement.appendChild(templateDocument.importNode(node, true));
            }
        }
    }
}

/**
 * Returns the local name of an Element if it belongs to the sap.fe.macros namespace, otherwise an empty string.
 * This ensures only Page aggregation elements are sorted by position; non-macros elements fall back to the items slot.
 *
 * @param el - the DOM Element
 * @returns the local name string, or '' if not a sap.fe.macros element
 */
function getElementLocalName(el: Element): string {
    if (el.namespaceURI !== 'sap.fe.macros') {
        return '';
    }
    return typeof el.localName === 'string' ? el.localName : '';
}

/**
 * Builds a comparator for sorting XmlAggregationGroups by their position in aggNames.
 * Unknown elements fall back to the position of 'items'. Ties are broken by original index.
 *
 * @param aggNames - ordered list of aggregation names
 * @returns comparator function for Array.prototype.sort
 */
function buildAggregationComparator(
    aggNames: readonly string[]
): (a: XmlAggregationGroup, b: XmlAggregationGroup) => number {
    const itemsIdx = aggNames.indexOf('items');
    const fallbackIdx = itemsIdx === -1 ? aggNames.length : itemsIdx;
    return (a, b) => {
        const aIdx = aggNames.indexOf(getElementLocalName(a.element));
        const bIdx = aggNames.indexOf(getElementLocalName(b.element));
        const aOrder = aIdx === -1 ? fallbackIdx : aIdx;
        const bOrder = bIdx === -1 ? fallbackIdx : bIdx;
        return aOrder === bOrder ? a.originalIndex - b.originalIndex : aOrder - bOrder;
    };
}

/**
 * Reorders the child elements of a macros:Page node to match the canonical PAGE_AGGREGATIONS order.
 * Preserves relative order of siblings with the same local name. Pure whitespace text nodes are dropped
 * because the xml-formatter call that follows will regenerate proper indentation.
 *
 * @param pageElement - the macros:Page DOM node whose children should be sorted
 */
function sortPageAggregationChildren(pageElement: Node): void {
    const allChildren = Array.from(pageElement.childNodes);
    const aggNames = PAGE_AGGREGATIONS as readonly string[];

    // Build pairs of [preceding comments, element] to preserve user comments.
    // Comments that appear before the first element are treated as leading and will remain before all aggregation elements.
    const groups: XmlAggregationGroup[] = [];
    const leadingComments: Node[] = [];
    let pendingComments: Node[] = [];
    let firstElementSeen = false;

    for (const node of allChildren) {
        if (node.nodeType === 8 /* Comment */) {
            // Comments before the first element are leading; after, they are pending
            (firstElementSeen ? pendingComments : leadingComments).push(node);
        } else if (node.nodeType === 1 /* Element */) {
            firstElementSeen = true;
            groups.push({ comments: pendingComments, element: node as Element, originalIndex: groups.length });
            pendingComments = [];
        } else if (node.nodeType === 3 /* Text */ && (node as Text).data?.trim()) {
            // Preserve non-whitespace text nodes with their surrounding group
            pendingComments.push(node);
        }
        // Pure whitespace text nodes are intentionally dropped (xml-formatter regenerates indentation)
    }

    groups.sort(buildAggregationComparator(aggNames));

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

/** All Page BB handler definitions flattened — used when creating a full controller template. */
const PAGE_BB_ALL_HANDLERS = (
    Object.values(PAGE_BB_HANDLERS) as ReadonlyArray<{ name: string; doc: string; log: string }>[]
).flat();

/**
 * Appends a single Page building block aggregation template to an existing `<macros:Page>` element in a view XML file.
 *
 * @param {string} basePath - the base path of the application
 * @param {GenerateBuildingBlockAggregationConfig} config - the aggregation configuration containing aggregationName and mContent
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Editor} the updated memfs editor instance
 */
export async function generateBuildingBlockAggregation(
    basePath: string,
    config: GenerateBuildingBlockAggregationConfig,
    fs?: Editor
): Promise<Editor> {
    const { viewPath, buildingBlockType, aggregationName: aggName, mContent = '' } = config;
    fs ??= create(createStorage());
    if (buildingBlockType !== BuildingBlockType.Page) {
        throw new Error(
            `generateBuildingBlockAggregation: unsupported building block type '${buildingBlockType}'. Only 'Page' is currently supported.`
        );
    }
    const xmlDocument = getUI5XmlDocument(basePath, viewPath, fs);

    const generateId = await createIdGenerator({ basePath, fsEditor: fs });
    const aggId = generateId(aggName);

    const fragMacrosNS = resolveMacrosPrefix(xmlDocument);
    const macrosPrefix = `${fragMacrosNS}:`;
    const aggContext = { macrosPrefix, mContent, aggId };
    const aggDoc = buildPageAggregationFragment(fs, aggName, aggContext, fragMacrosNS, xmlDocument);

    const nsMap = (xmlDocument.documentElement as any)?._nsMap ?? {};
    // Prefix-agnostic XPath — works regardless of the alias used in the view for sap.fe.macros.
    const xpathSelect = xpath.useNamespaces(nsMap);
    const pageNodes = xpathSelect(`//*[local-name()='Page' and namespace-uri()='sap.fe.macros']`, xmlDocument);
    if (!pageNodes || !Array.isArray(pageNodes) || pageNodes.length === 0) {
        throw new Error(`Page element (sap.fe.macros) not found in view ${viewPath}.`);
    }

    const pageElement = pageNodes[0] as Node;
    if (aggName === 'footer' && pageElement.nodeType === 1 /* Element */) {
        (pageElement as Element).setAttribute('showFooter', 'true');
    }
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

    const aggHandlers = PAGE_BB_HANDLERS[aggName];
    if (aggHandlers?.length) {
        await applyHandlersToController(fs, basePath, viewPath, aggHandlers);
    }

    return fs;
}

/**
 * Resolves the TS and JS controller paths that sit alongside a view file.
 *
 * @param basePath
 * @param viewOrFragmentPath
 */
function resolveControllerPaths(basePath: string, viewOrFragmentPath: string): { tsPath: string; jsPath: string } {
    const { dir: viewDir, name: viewName } = parse(viewOrFragmentPath);
    const viewBaseName = viewName.replace(/\.view$/, '');
    return {
        tsPath: join(basePath, viewDir, `${viewBaseName}.controller.ts`),
        jsPath: join(basePath, viewDir, `${viewBaseName}.controller.js`)
    };
}

/**
 * Derives the UI5 controller namespace from the app ID and the relative view path.
 * Example: appId="my.app", viewPath="webapp/ext/main/Main.view.xml" → "my.app.ext.main.Main"
 *
 * @param appId
 * @param _basePath
 * @param viewOrFragmentPath
 */
function deriveControllerNamespace(appId: string, _basePath: string, viewOrFragmentPath: string): string {
    const { dir: viewDir, name: viewName } = parse(viewOrFragmentPath);
    const viewBaseName = viewName.replace(/\.view$/, '');
    // Strip leading "webapp/" segment and convert path separators to dots
    const webappSegment = 'webapp';
    const relDir = viewDir.startsWith(webappSegment)
        ? viewDir.slice(webappSegment.length).replace(/^[/\\]/, '')
        : viewDir;
    const dotPath = relDir ? `${relDir.replace(/[/\\]/g, '.')}.${viewBaseName}` : viewBaseName;
    return appId ? `${appId}.${dotPath}` : dotPath;
}

/**
 * Copies the Page controller template (JS or TS) into the view directory if no controller file exists yet.
 * If a controller already exists, appends any missing Page BB handler stubs to it.
 * Uses getAppProgrammingLanguage to decide whether to generate a JS or TS controller stub.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} basePath - the base path of the application
 * @param {string} viewOrFragmentPath - the relative path of the view/fragment file
 */
async function applyPageControllerTemplate(fs: Editor, basePath: string, viewOrFragmentPath: string): Promise<void> {
    if (!viewOrFragmentPath.endsWith('.view.xml')) {
        return;
    }
    const { tsPath, jsPath } = resolveControllerPaths(basePath, viewOrFragmentPath);

    if (fs.exists(tsPath) || fs.exists(jsPath)) {
        await applyHandlersToController(fs, basePath, viewOrFragmentPath, PAGE_BB_ALL_HANDLERS);
        return;
    }

    const detectedLanguage = await getAppProgrammingLanguage(basePath, fs);
    const isTypeScript = detectedLanguage === 'TypeScript';
    const controllerPath = isTypeScript ? tsPath : jsPath;

    const { content: manifest } = await getManifest(basePath, fs, false);
    const appId = manifest?.['sap.app']?.id ?? '';
    const namespace = deriveControllerNamespace(appId, basePath, viewOrFragmentPath);

    copyTpl(fs, getTemplatePath(`/building-block/page/Controller.${isTypeScript ? 'ts' : 'js'}`), controllerPath, {
        namespace,
        handlers: PAGE_BB_ALL_HANDLERS
    });
}

/**
 * Core helper: appends missing handler stubs to an existing controller,
 * or creates a new minimal controller with only the given stubs.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} basePath - the base path of the application
 * @param {string} viewOrFragmentPath - the relative path of the view/fragment file
 * @param {ReadonlyArray<{ name: string; doc: string; log: string }>} handlers - handlers to ensure are present
 */
async function applyHandlersToController(
    fs: Editor,
    basePath: string,
    viewOrFragmentPath: string,
    handlers: ReadonlyArray<{ name: string; doc: string; log: string }>
): Promise<void> {
    if (!viewOrFragmentPath.endsWith('.view.xml') || handlers.length === 0) {
        return;
    }
    const { tsPath, jsPath } = resolveControllerPaths(basePath, viewOrFragmentPath);

    const existingIsTs = fs.exists(tsPath);
    const existingIsJs = !existingIsTs && fs.exists(jsPath);

    const detectedLanguage = await getAppProgrammingLanguage(basePath, fs);
    const isTypeScript = existingIsTs || (!existingIsJs && detectedLanguage === 'TypeScript');
    const controllerPath = isTypeScript ? tsPath : jsPath;

    const existingContent = existingIsTs || existingIsJs ? fs.read(controllerPath) : undefined;
    const missingHandlers = existingContent ? handlers.filter((h) => !existingContent.includes(h.name)) : [...handlers];

    if (missingHandlers.length === 0) {
        return;
    }

    if (isTypeScript) {
        const needsImports = !existingContent?.includes('sap/fe/core/ExtensionAPI');
        const imports = needsImports
            ? `import ExtensionAPI from 'sap/fe/core/ExtensionAPI';\nimport Event from 'sap/ui/base/Event';\n\n`
            : '';
        const stubs =
            '\n' +
            imports +
            missingHandlers
                .map((h) => `export function ${h.name}(this: ExtensionAPI, _event: Event): void {}`)
                .join('\n\n') +
            '\n';
        fs.write(controllerPath, (existingContent ?? '') + stubs);
        return;
    }

    // JavaScript: inject methods inside the PageController.extend({...}) object block.
    const methodStubs = missingHandlers
        .map(
            ({ name, doc, log }) =>
                `\n            /**\n             * ${doc}\n             */\n` +
                `            ${name}: function() {\n                console.log('${log}');\n            }`
        )
        .join(',\n');

    if (existingContent) {
        // Find injection point: the `}` that closes the extend object (immediately before the last `});`).
        const extendCloseIdx = existingContent.lastIndexOf('});');
        if (extendCloseIdx === -1) {
            // Fallback: controller doesn't match expected shape — append as plain functions
            const fallback = '\n' + missingHandlers.map((h) => `function ${h.name}() {}`).join('\n\n') + '\n';
            fs.write(controllerPath, existingContent + fallback);
            return;
        }
        let insertPos = extendCloseIdx - 1;
        while (insertPos > 0 && /\s/.test(existingContent[insertPos])) {
            insertPos--;
        }
        const beforeClose = existingContent.slice(0, insertPos + 1);
        const afterClose = existingContent.slice(insertPos + 1);
        const lastChar = beforeClose.trimEnd().at(-1);
        const needsLeadingComma = lastChar !== '{' && lastChar !== ',';
        fs.write(
            controllerPath,
            beforeClose + (needsLeadingComma ? ',' : '') + methodStubs + '\n\n        ' + afterClose
        );
    } else {
        // No existing controller — use the template with only the requested handlers.
        const { content: manifest } = await getManifest(basePath, fs, false);
        const appId = manifest?.['sap.app']?.id ?? '';
        const namespace = deriveControllerNamespace(appId, basePath, viewOrFragmentPath);
        copyTpl(fs, getTemplatePath('/building-block/page/Controller.js'), controllerPath, {
            namespace,
            handlers: missingHandlers
        });
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
    const nsMap = (firstChild as any)?._nsMap ?? {};
    const xpathSelect = xpath.useNamespaces(nsMap);

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

    // For Page templates, augment the snippet with aggregations (all 7 for full, just items for basic)
    let viewOrFragmentContent = content;
    const pageAggNames = getPageAggregationNames(buildingBlockData);
    if (pageAggNames) {
        if (isFullPageTemplate(buildingBlockData)) {
            validateFullPageTemplateVersion(manifest);
        }
        const pageData = buildingBlockData as Page;
        // Use the real view document for namespace resolution if available, otherwise create a minimal fallback
        const nsDoc =
            xmlDocument ??
            new DOMParser().parseFromString(
                '<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns:macros="sap.fe.macros" xmlns="sap.m"/>',
                'text/xml'
            );
        // Parse content directly so documentElement IS the <macros:Page> element,
        // matching what appendPageAggregations expects as templateDocument.documentElement.
        const snippetErrorHandler = (level: string, message: string): never => {
            throw new Error(`Unable to parse Page building block snippet. Details: [${level}] - ${message}`);
        };
        const snippetMacrosNS = getOrAddNamespace(nsDoc, 'sap.fe.macros', 'macros') || 'macros';
        const snippetContent = `${content}`.replace(
            new RegExp(`^<(${snippetMacrosNS}:Page)`),
            `<$1 xmlns:${snippetMacrosNS}="sap.fe.macros"`
        );
        const snippetDoc = new DOMParser({ errorHandler: snippetErrorHandler }).parseFromString(
            snippetContent,
            'text/xml'
        );
        appendPageAggregations(fs, nsDoc, snippetDoc, fnGenerateId, pageData, pageAggNames);
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
