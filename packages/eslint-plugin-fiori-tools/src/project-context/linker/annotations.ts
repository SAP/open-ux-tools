import type { AliasInformation, Element, ElementChild, MetadataElement } from '@sap-ux/odata-annotation-core';
import {
    Edm,
    elementsWithName,
    getElementAttributeValue,
    toFullyQualifiedName,
    parseIdentifier,
    ELEMENT_TYPE,
    getElementAttribute,
    toFullyQualifiedPath,
    parsePath
} from '@sap-ux/odata-annotation-core';
import type { IndexedAnnotation, ParsedService } from '../parser/index.js';
import { buildAnnotationIndexKey } from '../parser/index.js';
import { UI_FIELD_GROUP, UI_LINE_ITEM, UI_CHART, UI_DATA_FIELD_FOR_ANNOTATION } from '../../constants.js';

/**
 * index - Index of annotation
 * referencedEntityType - Entity type
 * qualifier - FieldGroup annotation qualifier
 * sectionLabel - Object page section label
 */
type SectionConfig = {
    index: number;
    referencedEntityType: string;
    id: string;
    qualifier?: string;
    sectionLabel?: string;
};

/**
 * Creates a configuration key from an annotation path
 *
 * @param annotationPath
 */
export function getConfigurationKey(annotationPath: string): string {
    return annotationPath
        .split('/')
        .map((segment) => segment.replace('@', ''))
        .join('::');
}
export interface AnnotationBasedNode<T extends string, Children = never> {
    type: T;
    annotation: IndexedAnnotation;
    label?: string;
    id?: string;
    /**
     * Path used by Fiori elements to reference this control
     */
    annotationPath: string;
    children: Children[];
}

export type TableSectionNode = AnnotationBasedNode<'table-section', TableNode>;
export type HeaderSectionNode = AnnotationBasedNode<'header-section', FieldGroupNode>;

// NOSONAR - TableNode provides semantic meaning for code readability
export type TableNode = AnnotationBasedNode<'table'>;
export type FieldGroupNode = AnnotationBasedNode<'field-group'>;

// NOSONAR - ChartNode provides semantic meaning for code readability
export type ChartNode = AnnotationBasedNode<'chart'>;

export type AnnotationNode = TableSectionNode | TableNode | HeaderSectionNode | FieldGroupNode | ChartNode;
export type NodeLookup = {
    [K in AnnotationNode['type']]?: Extract<AnnotationNode, { type: K }>[];
};

/**
 * Collects table nodes from UI.LineItem annotations for an entity type.
 *
 * @param feVersion - The Fiori Elements version ('v2' or 'v4')
 * @param entityType - The entity type name
 * @param service - The parsed OData service
 * @returns Entity table node array
 */
export function collectTables(feVersion: 'v2' | 'v4', entityType: string, service: ParsedService): TableNode[] {
    const lineItemKey = buildAnnotationIndexKey(entityType, UI_LINE_ITEM);
    const lineItemMap = service.index.annotations[lineItemKey];
    if (!lineItemMap) {
        return [];
    }
    return Object.values(lineItemMap).map((lineItem) => {
        const qualifierString = lineItem.qualifier ? `#${lineItem.qualifier}` : '';
        return {
            type: 'table',
            annotation: lineItem,
            annotationPath: `@${UI_LINE_ITEM}${qualifierString}`,
            children: []
        };
    });
}

/**
 * Collects object page table sections.
 *
 * @param entityType - Entity type name
 * @param service - Parsed OData service
 * @returns Object page table sections
 */
function getOPTableSections(entityType: string, service: ParsedService): TableSectionNode[] {
    const sections: TableSectionNode[] = [];
    const facetsKey = buildAnnotationIndexKey(entityType, 'com.sap.vocabularies.UI.v1.Facets');
    const facets = service.index.annotations[facetsKey]?.['undefined'];
    if (!facets) {
        return sections;
    }
    const [collection] = elementsWithName(Edm.Collection, facets.top.value);
    if (!collection) {
        return sections;
    }
    const records = elementsWithName(Edm.Record, collection);
    const aliasInfo = service.artifacts.aliasInfo[facets.top.uri];
    let index = 0;
    for (const record of records) {
        const section = processReferenceFacetRecord(record, aliasInfo, entityType, service, facets, index);
        if (section?.type === 'table-section') {
            sections.push(section);
        }
        index++;
    }
    return sections;
}

/**
 * Collects object page header sections.
 *
 * @param entityType - Entity type name
 * @param service - Parsed OData service
 * @returns Object page header sections
 */
function getOPHeaderSections(entityType: string, service: ParsedService): HeaderSectionNode[] {
    const sections: HeaderSectionNode[] = [];
    const headerFacetsKey = buildAnnotationIndexKey(entityType, 'com.sap.vocabularies.UI.v1.HeaderFacets');
    const headerFacets = service.index.annotations[headerFacetsKey]?.['undefined'];
    if (!headerFacets) {
        return sections;
    }
    const [headerFacetCollection] = elementsWithName(Edm.Collection, headerFacets.top.value);
    if (!headerFacetCollection) {
        return sections;
    }
    const headerFacetRecords = elementsWithName(Edm.Record, headerFacetCollection);
    const headerFacetAliasInfo = service.artifacts.aliasInfo[headerFacets.top.uri];
    let index = 0;
    for (const record of headerFacetRecords) {
        const headerFacet = processReferenceFacetRecord(
            record,
            headerFacetAliasInfo,
            entityType,
            service,
            headerFacets,
            index
        );
        if (headerFacet?.type === 'header-section') {
            sections.push(headerFacet);
        }
        index++;
    }
    return sections;
}

/**
 * Collects section nodes from UI.Facets an UI.HeaderFacet annotations for an entity type.
 *
 * @param feVersion - The Fiori Elements version ('v2' or 'v4')
 * @param entityType - The entity type name
 * @param service - The parsed OData service
 */
export function collectSections(
    feVersion: 'v2' | 'v4',
    entityType: string,
    service: ParsedService
): (TableSectionNode | HeaderSectionNode)[] {
    const sections: (TableSectionNode | HeaderSectionNode)[] = [
        ...getOPTableSections(entityType, service),
        ...getOPHeaderSections(entityType, service)
    ];
    return sections;
}

/**
 * Resolves an annotation path string to a `ChartNode` if it points to a `UI.Chart` annotation.
 *
 * @param entityType - The entity type from which the path is relative.
 * @param annotationPath - The raw annotation path (e.g. `to_History/@UI.Chart#MicroChart`).
 * @param aliasInfo - Alias information for resolving namespace prefixes.
 * @param service - The parsed OData service.
 * @returns A `ChartNode` if the path resolves to a `UI.Chart`, or `undefined` otherwise.
 */
function resolveChartAnnotation(
    entityType: string,
    annotationPath: string,
    aliasInfo: AliasInformation,
    service: ParsedService
): ChartNode | undefined {
    const fullyQualifiedPath = toFullyQualifiedPath(
        aliasInfo.aliasMap,
        '',
        parsePath(`/${entityType}/${annotationPath}`)
    );
    const atIdx = fullyQualifiedPath.indexOf('@');
    if (atIdx === -1) {
        return undefined;
    }
    const [term, qualifier] = fullyQualifiedPath.substring(atIdx + 1).split('#');
    if (term !== UI_CHART) {
        return undefined;
    }
    const referencedEntityType = getReferencedEntityType(aliasInfo, entityType, annotationPath, service);
    if (!referencedEntityType) {
        return undefined;
    }
    const indexKey = buildAnnotationIndexKey(referencedEntityType, UI_CHART);
    const indexedAnnotation = service.index.annotations[indexKey]?.[qualifier ?? 'undefined'];
    if (!indexedAnnotation) {
        return undefined;
    }
    return {
        type: 'chart',
        annotation: indexedAnnotation,
        annotationPath: toFullyQualifiedPath(
            aliasInfo.aliasMap,
            aliasInfo.currentFileNamespace,
            parsePath(annotationPath)
        ),
        children: []
    };
}

/**
 * Inspects a single record from a `UI.LineItem` collection and, if it is a
 * `DataFieldForAnnotation` whose `Target` resolves to `UI.Chart`, pushes a
 * `ChartNode` onto `charts` (deduped by annotation identity).
 *
 * @param record - The `Edm.Record` element to inspect.
 * @param entityType - The entity type from which the annotation path is relative.
 * @param aliasInfo - Alias information for namespace resolution.
 * @param service - The parsed OData service.
 * @param charts - Accumulator for collected chart nodes.
 */
function collectChartFromLineItemRecord(
    record: Element,
    entityType: string,
    aliasInfo: AliasInformation,
    service: ParsedService,
    charts: ChartNode[]
): void {
    if (getRecordType(aliasInfo, record) !== UI_DATA_FIELD_FOR_ANNOTATION) {
        return;
    }
    const path = getTargetAnnotationPath(record);
    if (!path) {
        return;
    }
    const chartNode = resolveChartAnnotation(entityType, path, aliasInfo, service);
    if (chartNode && !charts.some((c) => c.annotation === chartNode.annotation)) {
        charts.push(chartNode);
    }
}

/**
 * Collects chart nodes referenced from a `UI.LineItem` table annotation via
 * `DataFieldForAnnotation.Target` → `UI.Chart`.
 *
 * @param tableNode - The table annotation node (from `page.lookup['table']`).
 * @param service - The parsed OData service.
 * @returns Array of chart nodes referenced from the table.
 */
export function collectChartsFromTableNode(tableNode: TableNode, service: ParsedService): ChartNode[] {
    const charts: ChartNode[] = [];
    const entityType = tableNode.annotation.target;
    const [collection] = elementsWithName(Edm.Collection, tableNode.annotation.top.value);
    if (!collection) {
        return charts;
    }
    const aliasInfo = service.artifacts.aliasInfo[tableNode.annotation.top.uri];
    for (const record of elementsWithName(Edm.Record, collection)) {
        collectChartFromLineItemRecord(record, entityType, aliasInfo, service, charts);
    }
    return charts;
}

/**
 * Collects chart nodes referenced from a `UI.FieldGroup` annotation via the `Data` collection's
 * `DataFieldForAnnotation.Target` → `UI.Chart`.
 *
 * @param fieldGroupNode - The field group annotation node (from `page.lookup['field-group']`).
 * @param service - The parsed OData service.
 * @returns Array of chart nodes referenced from the field group.
 */
export function collectChartsFromFieldGroupNode(fieldGroupNode: FieldGroupNode, service: ParsedService): ChartNode[] {
    const charts: ChartNode[] = [];
    const entityType = fieldGroupNode.annotation.target;
    const [record] = elementsWithName(Edm.Record, fieldGroupNode.annotation.top.value);
    if (!record) {
        return charts;
    }
    const dataPropertyValue = elementsWithName(Edm.PropertyValue, record).find(
        (pv) => getElementAttributeValue(pv, Edm.Property) === 'Data'
    );
    if (!dataPropertyValue) {
        return charts;
    }
    const [collection] = elementsWithName(Edm.Collection, dataPropertyValue);
    if (!collection) {
        return charts;
    }
    const aliasInfo = service.artifacts.aliasInfo[fieldGroupNode.annotation.top.uri];
    for (const dataRecord of elementsWithName(Edm.Record, collection)) {
        collectChartFromLineItemRecord(dataRecord, entityType, aliasInfo, service, charts);
    }
    return charts;
}

const findContentByName = (content: ElementChild[], name: string): ElementChild | undefined =>
    content.find((c) => (c as Element).name === name);

const getElementText = (element: ElementChild): string | undefined =>
    (element as Element).content?.find((c) => c.type === 'text')?.text;

/**
 * Process a single reference facet record and create a table or header section if applicable.
 *
 * @param record
 * @param aliasInfo
 * @param entityType
 * @param service
 * @param facets
 * @param index
 */
function processReferenceFacetRecord(
    record: Element,
    aliasInfo: AliasInformation,
    entityType: string,
    service: ParsedService,
    facets: IndexedAnnotation,
    index: number
): TableSectionNode | HeaderSectionNode | undefined {
    const type = getRecordType(aliasInfo, record);
    if (type !== 'com.sap.vocabularies.UI.v1.ReferenceFacet') {
        return undefined;
    }

    const id = getId(record);
    const annotationPath = getTargetAnnotationPath(record);

    if (!id || !annotationPath) {
        return undefined;
    }

    if (annotationPath.startsWith('/')) {
        // absolute path is not supported
        return undefined;
    }

    const referencedEntityType = getReferencedEntityType(aliasInfo, entityType, annotationPath, service);
    if (!referencedEntityType) {
        return undefined;
    }

    const fullyQualifiedPath = toFullyQualifiedPath(
        aliasInfo.aliasMap,
        '',
        parsePath(`/${entityType}/${annotationPath}`)
    );
    const [, _annotationPath] = fullyQualifiedPath.split('@');
    const [term, qualifier] = _annotationPath.split('#');

    const propValues = elementsWithName(Edm.PropertyValue, record);
    const propValue = propValues.find((p) => p.attributes.Property?.value === 'Label');
    let sectionLabel = propValue ? getElementAttribute(propValue, Edm.String)?.value : undefined;
    if (!sectionLabel) {
        const textContent = findContentByName(propValue?.content ?? [], Edm.String);
        sectionLabel = textContent ? getElementText(textContent) : undefined;
    }
    if (term === UI_LINE_ITEM) {
        return createTableSection(
            facets,
            { index, referencedEntityType, qualifier, sectionLabel, id },
            annotationPath,
            aliasInfo,
            service
        );
    }

    if (term === UI_FIELD_GROUP) {
        return addHeaderSection(
            facets,
            { index, referencedEntityType, qualifier, sectionLabel, id },
            annotationPath,
            aliasInfo,
            service
        );
    }

    return undefined;
}

/**
 * Get the referenced entity type from an annotation path.
 *
 * @param aliasInfo
 * @param entityType
 * @param annotationPath
 * @param service
 */
function getReferencedEntityType(
    aliasInfo: AliasInformation,
    entityType: string,
    annotationPath: string,
    service: ParsedService
): string | undefined {
    const fullyQualifiedPath = toFullyQualifiedPath(
        aliasInfo.aliasMap,
        '',
        parsePath(`/${entityType}/${annotationPath}`)
    );
    let [contextPath] = fullyQualifiedPath.split('@');
    if (contextPath.endsWith('/')) {
        contextPath = contextPath.slice(0, -1);
    }
    const referencedEntity = service.artifacts.metadataService.getMetadataElement(contextPath.slice(1));
    return referencedEntity?.kind === 'EntityType' || referencedEntity?.kind === 'entity'
        ? referencedEntity.name
        : referencedEntity?.structuredType;
}

/**
 * Create a table section node with its child table node.
 *
 * @param facets
 * @param config
 * @param annotationPath
 * @param aliasInfo
 * @param service
 * @returns
 */
function createTableSection(
    facets: IndexedAnnotation,
    config: SectionConfig,
    annotationPath: string,
    aliasInfo: AliasInformation,
    service: ParsedService
): TableSectionNode | undefined {
    const section: TableSectionNode = {
        type: 'table-section',
        annotationPath: `@com.sap.vocabularies.UI.v1.Facets/${config.index}`,
        label: config.sectionLabel,
        id: config.id,
        annotation: facets,
        children: []
    };

    const lineItemKey = buildAnnotationIndexKey(config.referencedEntityType, UI_LINE_ITEM);
    const tableAnnotations = service.index.annotations[lineItemKey];
    if (!tableAnnotations) {
        return undefined;
    }

    const annotation = tableAnnotations[config.qualifier ?? 'undefined'];
    if (!annotation) {
        return undefined;
    }

    const table: TableNode = {
        type: 'table',
        annotationPath: toFullyQualifiedPath(
            aliasInfo.aliasMap,
            aliasInfo.currentFileNamespace,
            parsePath(annotationPath)
        ),
        annotation,
        children: []
    };
    section.children.push(table);
    return section;
}

/**
 * Creates a header facet section node with field group child annotation.
 *
 * @param headerFacets - Header facet annotation
 * @param config - Section configuration
 * @param annotationPath - Header facet annotation path
 * @param aliasInfo - Alias information for resolving namespaces
 * @param service - The parsed OData service
 * @returns Header section annotation node
 */
function addHeaderSection(
    headerFacets: IndexedAnnotation,
    config: SectionConfig,
    annotationPath: string,
    aliasInfo: AliasInformation,
    service: ParsedService
): HeaderSectionNode | undefined {
    const section: HeaderSectionNode = {
        type: 'header-section',
        annotationPath: `@com.sap.vocabularies.UI.v1.HeaderFacet/${config.index}`,
        annotation: headerFacets,
        label: config.sectionLabel,
        id: config.id,
        children: []
    };

    const fieldGroupKey = buildAnnotationIndexKey(config.referencedEntityType, UI_FIELD_GROUP);
    const fieldGroupAnnotations = service.index.annotations[fieldGroupKey];
    if (!fieldGroupAnnotations) {
        return undefined;
    }

    const annotation = fieldGroupAnnotations[config.qualifier ?? 'undefined'];
    if (!annotation) {
        return undefined;
    }

    const fieldGroup: FieldGroupNode = {
        type: 'field-group',
        annotationPath: toFullyQualifiedPath(
            aliasInfo.aliasMap,
            aliasInfo.currentFileNamespace,
            parsePath(annotationPath)
        ),
        annotation,
        children: []
    };
    section.children.push(fieldGroup);
    return section;
}

/**
 * Extracts the record type from an element with alias resolution.
 *
 * @param aliasInfo - Alias information for resolving namespaces
 * @param element - The XML element to extract the type from
 */
export function getRecordType(aliasInfo: AliasInformation, element: Element): string | undefined {
    const recordType = getElementAttributeValue(element, Edm.Type);

    if (recordType.includes('/')) {
        // do not support paths as types
        return undefined;
    }

    if (recordType) {
        return toFullyQualifiedName(aliasInfo.aliasMap, aliasInfo.currentFileNamespace, parseIdentifier(recordType));
    }
}

/**
 * Returns AnnotationPath property value.
 *
 * @param record -The record element
 * @returns - Annotation path string
 */
function getTargetAnnotationPath(record: Element): string | undefined {
    const target = record.content.find((child) => {
        if (child.type === ELEMENT_TYPE && child.name === Edm.PropertyValue) {
            const name = getElementAttributeValue(child, Edm.Property);
            return name === 'Target';
        }
        return false;
    });
    if (target?.type === ELEMENT_TYPE) {
        const stringAttribute = getElementAttribute(target, Edm.AnnotationPath);
        if (stringAttribute) {
            return stringAttribute.value;
        } else {
            const annotationPathContent = findContentByName(target.content, Edm.AnnotationPath);
            if (annotationPathContent) {
                return getElementText(annotationPathContent);
            }
        }
    }
    return undefined;
}

/**
 * Returns ID property value.
 *
 * @param record - The record element
 * @returns - String ID value
 */
function getId(record: Element): string | undefined {
    const id = record.content.find((child) => {
        if (child.type === ELEMENT_TYPE && child.name === Edm.PropertyValue) {
            const name = getElementAttributeValue(child, Edm.Property);
            return name === 'ID';
        }
        return false;
    });
    if (id?.type === ELEMENT_TYPE) {
        const stringAttribute = getElementAttribute(id, Edm.String);
        if (stringAttribute) {
            return stringAttribute.value;
        } else {
            const idContent = findContentByName(id.content, Edm.String);
            if (idContent) {
                return getElementText(idContent);
            }
        }
    }
    return undefined;
}

/**
 * Resolves a metadata element from a context path string.
 *
 * @param contextPath - The context path (e.g., '/EntitySet/NavigationProperty')
 * @param service - The parsed OData service
 */
export function getEntityForContextPath(contextPath: string, service: ParsedService): MetadataElement | undefined {
    if (!contextPath.startsWith('/')) {
        return;
    }
    const path = contextPath.substring(1);
    const [entityName, ...segments] = path.split('/');
    if (!entityName) {
        return;
    }
    const entity = service.index.entitySets[entityName];
    if (!entity) {
        return undefined;
    }

    return resolveNavigationProperties(entity, segments);
}

/**
 * Resolves navigation properties along a path to find the target entity.
 *
 * @param root - The starting metadata element
 * @param segments - Array of navigation property names to traverse
 */
function resolveNavigationProperties(root: MetadataElement, segments: string[]): MetadataElement | undefined {
    if (segments.length === 0) {
        return root;
    }
    let current = root;
    for (const segment of segments) {
        let found = false;
        for (const child of current.content) {
            if (child.name === segment) {
                current = child;
                found = true;
                break;
            }
        }
        if (!found) {
            return undefined;
        }
    }
    return current;
}

export interface ObjectPageLike {
    sections: Array<{ type: string }>;
    lookup: { [key: string]: any[] | undefined };
}

/**
 * Collects chart nodes from a page's linked table and field-group lookup entries and adds them
 * to `page.lookup['chart']`. Must be called after the table and field-group linker steps so
 * that only charts actually displayed on the page are collected.
 *
 * @param page - Object with a `lookup` map; satisfied by both LR and OP page types.
 * @param page.lookup - Object holding page elements.
 * @param service - The parsed OData service.
 */
export function collectPageCharts(
    page: { lookup: { [key: string]: any[] | undefined } },
    service: ParsedService
): void {
    for (const tableEntry of (page.lookup['table'] ?? []) as Array<{ annotation?: TableNode }>) {
        if (tableEntry.annotation) {
            for (const chartNode of collectChartsFromTableNode(tableEntry.annotation, service)) {
                page.lookup['chart'] ??= [];
                page.lookup['chart']!.push({ type: 'chart', annotation: chartNode, configuration: {}, children: [] });
            }
        }
    }
    for (const fieldGroupEntry of (page.lookup['field-group'] ?? []) as Array<{ annotation?: FieldGroupNode }>) {
        if (fieldGroupEntry.annotation) {
            for (const chartNode of collectChartsFromFieldGroupNode(fieldGroupEntry.annotation, service)) {
                page.lookup['chart'] ??= [];
                page.lookup['chart']!.push({ type: 'chart', annotation: chartNode, configuration: {}, children: [] });
            }
        }
    }
}

export function collectHeaderSections(section: HeaderSectionNode, page: ObjectPageLike): void {
    if (section.type !== 'header-section') {
        return;
    }
    const fieldGroup = section.children[0];
    if (fieldGroup.type !== 'field-group') {
        return;
    }
    const linkedSection = {
        type: section.type,
        annotation: section,
        configuration: {},
        children: [] as (typeof linkedFieldGroup)[]
    };
    const linkedFieldGroup = {
        type: fieldGroup.type,
        annotation: fieldGroup,
        configuration: {},
        children: [] as never[]
    };
    linkedSection.children.push(linkedFieldGroup);
    for (const control of [linkedSection, linkedFieldGroup] as const) {
        if (control.type === 'header-section') {
            page.sections.push(control);
        }
        page.lookup[control.type] ??= [];
        page.lookup[control.type]!.push(control);
    }
}
