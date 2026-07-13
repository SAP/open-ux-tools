import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import { join } from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import format from 'xml-formatter';
import * as xpath from 'xpath';
import { lt } from 'semver';
import type { Editor } from 'mem-fs-editor';

import { getMinimumUI5Version } from '@sap-ux/project-access';
import {
    BuildingBlockType,
    PAGE_AGGREGATIONS,
    PAGE_FULL_TEMPLATE_MIN_UI5_VERSION,
    PAGE_TEMPLATE_COMMENT,
    PAGE_TEMPLATE_TYPE_FULL,
    type BuildingBlock,
    type PageAggregationName,
    type Page,
    type XmlAggregationGroup,
    type GenerateBuildingBlockAggregationConfig
} from './types.js';
import type { Manifest } from '../common/types.js';
import { getTemplatePath } from '../templates.js';
import { type IdGeneratorFunction, createIdGenerator } from '../common/file.js';
import { getErrorMessage } from '../common/validate.js';
import { i18nNamespaces, translate } from '../i18n.js';
import { getOrAddNamespace } from './prompts/utils/xml.js';
import { resolveAggregationPath } from './processor.js';

/**
 * Returns the UI5 xml file document (view/fragment).
 *
 * @param {string} basePath - the base path
 * @param {string} viewPath - the path of the xml view relative to the base path
 * @param {Editor} fs - the memfs editor instance
 * @returns {Document} the view xml file document
 */
export function getUI5XmlDocument(basePath: string, viewPath: string, fs: Editor): Document {
    let viewContent: string;
    try {
        viewContent = fs.read(join(basePath, viewPath));
    } catch (error) {
        throw new Error(`Unable to read xml view file. Details: ${getErrorMessage(error)}`);
    }

    const errorHandler = (level: string, message: string): never => {
        throw new Error(`Unable to parse xml view file. Details: [${level}] - ${message}`);
    };

    let viewDocument: Document;
    try {
        viewDocument = new DOMParser({ errorHandler }).parseFromString(viewContent, 'text/xml');
    } catch (error) {
        throw new Error(`Unable to parse xml view file. Details: ${getErrorMessage(error)}`);
    }

    return viewDocument;
}

/**
 * Returns the aggregation names to append for a Page building block, or undefined if not a Page.
 * Full template appends all PAGE_AGGREGATIONS; basic template appends nothing.
 *
 * @param data - the building block data
 * @returns aggregation names array, or undefined if not a Page building block
 */
export function getPageAggregationNames(data: BuildingBlock): readonly PageAggregationName[] | undefined {
    if (data.buildingBlockType !== BuildingBlockType.Page) {
        return undefined;
    }
    return (data as Page).templateType === PAGE_TEMPLATE_TYPE_FULL ? PAGE_AGGREGATIONS : undefined;
}

/**
 * Throws if the manifest's minUI5Version does not meet the 1.145.0 requirement for the full Page template.
 *
 * @param manifest - the manifest content, or undefined if not available
 */
export function validateFullPageTemplateVersion(manifest: Manifest | undefined): void {
    const minUI5Version = manifest ? getMinimumUI5Version(manifest) : undefined;
    if (!minUI5Version || lt(minUI5Version, PAGE_FULL_TEMPLATE_MIN_UI5_VERSION)) {
        const t = translate(i18nNamespaces.buildingBlock, 'pageBuildingBlock.');
        throw new Error(`${t('fullTemplateMinUi5VersionRequirement', { minUI5Version: minUI5Version ?? 'unknown' })}`);
    }
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

/** IDs needed per aggregation template, keyed by the variable name used in the EJS template. */
const AGGREGATION_ID_KEYS: Partial<Record<PageAggregationName, string[]>> = {
    breadcrumbs: ['Breadcrumbs', 'Link', 'Link1', 'Link2'],
    navigationActions: ['Button'],
    titleContent: ['GenericTag'],
    actions: ['Button', 'Button1'],
    headerContent: ['VBox', 'Title'],
    footer: ['OverflowToolbar', 'ToolbarSpacer', 'Button', 'Button1']
};

/**
 * Generates a map of unique IDs for all controls in a given Page aggregation template.
 * Keys match the `ids.*` variable names referenced in the EJS templates.
 *
 * @param aggName - the aggregation name
 * @param generateId - the project-aware ID generator
 * @returns an object mapping each template variable name to a unique ID string
 */
function buildAggregationIds(aggName: PageAggregationName, generateId: IdGeneratorFunction): Record<string, string> {
    const keys = AGGREGATION_ID_KEYS[aggName] ?? [];
    const validatedIds: string[] = [];
    const ids: Record<string, string> = {};
    for (const key of keys) {
        const baseId = key.replace(/\d+$/, ''); // strip trailing number to get the base (e.g. 'Button1' → 'Button')
        const id = generateId(baseId, validatedIds);
        ids[key] = id;
        validatedIds.push(id);
    }
    return ids;
}

/**
 * Renders a Page aggregation EJS template and parses it as an XML fragment document.
 * Inherits all xmlns:* declarations from the view root so inner content can use any view-declared prefix.
 *
 * @param fs - the memfs editor instance
 * @param aggName - the aggregation name (e.g. 'footer', 'items')
 * @param aggContext - the EJS template context
 * @param aggContext.macrosPrefix - the namespace prefix string (e.g. 'macros:')
 * @param aggContext.aggId - the generated unique ID for the aggregation element
 * @param aggContext.showDefaultContent - when true, the items template renders the default IconTabBar
 * @param aggContext.ids - map of unique IDs for named controls in the template (e.g. ids.Button, ids.Link)
 * @param fragMacrosNS - the namespace prefix resolved for sap.fe.macros
 * @param xmlDocument - the view XML document (used to inherit namespace declarations)
 * @returns parsed XML document whose documentElement contains the aggregation child nodes
 */
function buildPageAggregationFragment(
    fs: Editor,
    aggName: string,
    aggContext: {
        macrosPrefix: string;
        aggId: string;
        showDefaultContent: boolean;
        ids: Record<string, string>;
    },
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
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {Document} xmlDocument - the view XML document (used to resolve namespace prefixes)
 * @param {Document} templateDocument - the template document whose root element receives the children
 * @param {IdGeneratorFunction} generateId - function to generate unique IDs
 * @param {readonly PageAggregationName[]} [aggNames] - aggregation names to append; defaults to all PAGE_AGGREGATIONS
 * @param useDefaults - when true, the items aggregation renders its default IconTabBar content
 */
export function appendPageAggregations(
    fs: Editor,
    xmlDocument: Document,
    templateDocument: Document,
    generateId: IdGeneratorFunction,
    aggNames: readonly PageAggregationName[] = PAGE_AGGREGATIONS,
    useDefaults = true
): void {
    const fragMacrosNS = resolveMacrosPrefix(xmlDocument);
    const macrosPrefix = `${fragMacrosNS}:`;
    const pageElement = templateDocument.documentElement;
    pageElement.appendChild(templateDocument.createComment(PAGE_TEMPLATE_COMMENT));
    for (const aggName of aggNames) {
        const aggId = generateId(aggName);
        const showDefaultContent = aggName === 'items' && useDefaults;
        const ids = buildAggregationIds(aggName, generateId);
        const aggContext = { macrosPrefix, aggId, showDefaultContent, ids };
        const aggDoc = buildPageAggregationFragment(fs, aggName, aggContext, fragMacrosNS, xmlDocument);
        for (const node of Array.from(aggDoc.documentElement.childNodes)) {
            if (node.nodeType === 1 /* Element */) {
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
export function sortPageAggregationChildren(pageElement: Node): void {
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

/**
 * Ensures a namespaced aggregation element exists in the XML document at the given aggregation path.
 * If the final segment (e.g. 'macros:items') is missing from the DOM, the parent node is located
 * via the path prefix and the element is inserted in place. This allows generateBuildingBlock to
 * handle missing aggregation containers in a single write pass, avoiding a separate commit.
 *
 * @param {Document} xmlDocument - The XML document to mutate
 * @param {string} aggregationPath - Full XPath to the target aggregation (e.g. '/mvc:View/macros:Page/macros:items')
 */
export function ensureMissingAggregation(xmlDocument: Document, aggregationPath: string): void {
    const nsMap: Record<string, string> = (xmlDocument.documentElement as any)?._nsMap ?? {};
    const xpathSelect = xpath.useNamespaces(nsMap);

    if ((xpathSelect(resolveAggregationPath(aggregationPath), xmlDocument) as Element[]).length > 0) {
        return;
    }
    const lastSlash = aggregationPath.lastIndexOf('/');
    if (lastSlash <= 0) {
        return;
    }
    const lastSegment = aggregationPath.slice(lastSlash + 1);
    const colonIdx = lastSegment.indexOf(':');
    if (colonIdx === -1) {
        return;
    }
    const prefix = lastSegment.slice(0, colonIdx);
    const localName = lastSegment.slice(colonIdx + 1);
    // getOrAddNamespace resolves the URI from the document and declares it if missing.
    // Fall back to 'sap.fe.macros' for the 'macros' prefix in case it's declared as a default
    // namespace (xmlns="sap.fe.macros") and therefore absent from the prefix→URI nsMap.
    let namespaceUri = nsMap[prefix];
    if (!namespaceUri && prefix === 'macros') {
        namespaceUri = 'sap.fe.macros';
    }
    if (!namespaceUri) {
        return;
    }
    getOrAddNamespace(xmlDocument, namespaceUri, prefix);

    // Rebuild xpathSelect with the prefix explicitly mapped so XPath resolves prefixed steps
    // correctly even when the document uses sap.fe.macros as its default namespace.
    const xpathSelectWithPrefix = xpath.useNamespaces({ ...nsMap, [prefix]: namespaceUri });
    const parentNodes = xpathSelectWithPrefix(
        resolveAggregationPath(aggregationPath.slice(0, lastSlash)),
        xmlDocument
    ) as Element[];
    if (parentNodes.length === 0) {
        return;
    }
    parentNodes[0].appendChild(xmlDocument.createElementNS(namespaceUri, `${prefix}:${localName}`));
}

/**
 * Wraps any direct sap.fe.macros children of pageElement that are not named Page aggregations
 * (i.e. loose building blocks like macros:Form, macros:Table) inside a <macros:items> element.
 * Called before inserting a new named aggregation so the DOM stays well-formed.
 *
 * @param pageElement - the macros:Page DOM element
 * @param xmlDocument - the owner document
 * @param macrosNS - the sap.fe.macros namespace URI
 * @param macrosPrefix - the resolved prefix string (e.g. 'macros')
 */
function wrapLooseBuildingBlocksInItems(
    pageElement: Element,
    xmlDocument: Document,
    macrosNS: string,
    macrosPrefix: string
): void {
    const aggregationSet = new Set<string>(PAGE_AGGREGATIONS);
    const looseChildren = Array.from(pageElement.childNodes).filter(
        (n) =>
            n.nodeType === 1 /* Element */ &&
            (n as Element).namespaceURI === macrosNS &&
            !aggregationSet.has((n as Element).localName)
    ) as Element[];

    if (looseChildren.length === 0) {
        return;
    }

    const itemsName = `${macrosPrefix}:items`;
    let itemsEl = Array.from(pageElement.childNodes).find(
        (n) => n.nodeType === 1 && (n as Element).namespaceURI === macrosNS && (n as Element).localName === 'items'
    ) as Element | undefined;

    if (!itemsEl) {
        itemsEl = xmlDocument.createElementNS(macrosNS, itemsName) as Element;
        pageElement.insertBefore(itemsEl, looseChildren[0]);
    }

    for (const child of looseChildren) {
        itemsEl.appendChild(child);
    }
}

/**
 * Appends a single Page building block aggregation template to an existing `<macros:Page>` element in a view XML file.
 *
 * @param {string} basePath - the base path of the application
 * @param {GenerateBuildingBlockAggregationConfig} config - the aggregation configuration containing aggregationName
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Editor} the updated memfs editor instance
 */
export async function generateBuildingBlockAggregation(
    basePath: string,
    config: GenerateBuildingBlockAggregationConfig,
    fs?: Editor
): Promise<Editor> {
    const { viewPath, buildingBlockType, aggregationName: aggName } = config;
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
    const ids = buildAggregationIds(aggName, generateId);
    const aggContext = { macrosPrefix, aggId, showDefaultContent: false, ids };
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
            (node as Element).namespaceURI === (nsMap[fragMacrosNS] ?? 'sap.fe.macros')
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

    // Move any loose macros building blocks (e.g. macros:Form, macros:Table) into macros:items
    // before inserting the new named aggregation so the Page DOM stays well-formed.
    const macrosNsUri = nsMap[fragMacrosNS] ?? 'sap.fe.macros';
    wrapLooseBuildingBlocksInItems(pageElement as Element, xmlDocument, macrosNsUri, fragMacrosNS);
    if (!hasExistingElementChildren && !hasTemplateComment) {
        pageElement.appendChild(xmlDocument.createComment(PAGE_TEMPLATE_COMMENT));
    }
    for (const node of Array.from(aggDoc.documentElement.childNodes)) {
        if (node.nodeType === 1 /* Element */) {
            pageElement.appendChild(xmlDocument.importNode(node, true));
        }
    }
    sortPageAggregationChildren(pageElement);

    const newXmlContent = new XMLSerializer().serializeToString(xmlDocument);
    fs.write(join(basePath, viewPath), format(newXmlContent));

    return fs;
}
