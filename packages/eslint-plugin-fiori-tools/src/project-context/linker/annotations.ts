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
import type { IndexedAnnotation, ParsedService } from '../parser';
import { buildAnnotationIndexKey } from '../parser';
import { UI_FIELD_GROUP, UI_LINE_ITEM } from '../../constants';

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

export type AnnotationNode = TableSectionNode | TableNode | HeaderSectionNode | FieldGroupNode;
export type NodeLookup = {
    [K in AnnotationNode['type']]?: Extract<AnnotationNode, { type: K }>[];
};

/**
 * Collects table nodes from UI.LineItem annotations for an entity type.
 *
 * @param feVersion - The Fiori Elements version ('v2' or 'v4')
 * @param entityType - The entity type name
 * @param service - The parsed OData service
 */
export function collectTables(feVersion: 'v2' | 'v4', entityType: string, service: ParsedService): TableNode[] {
    const tables: TableNode[] = [];
    const lineItemKey = buildAnnotationIndexKey(entityType, UI_LINE_ITEM);
    const lineItems = service.index.annotations[lineItemKey]?.['undefined'];

    if (lineItems) {
        const table: TableNode = {
            type: 'table',
            annotation: lineItems,
            annotationPath: `@com.sap.vocabularies.UI.v1.LineItem`,
            children: []
        };
        tables.push(table);
    }
    return tables;
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
    const sections: (TableSectionNode | HeaderSectionNode)[] = [];
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
        if (section) {
            sections.push(section);
        }
        index++;
    }

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
    index = 0;
    for (const record of headerFacetRecords) {
        const headerFacet = processReferenceFacetRecord(
            record,
            headerFacetAliasInfo,
            entityType,
            service,
            headerFacets,
            index
        );
        if (headerFacet) {
            sections.push(headerFacet);
        }
        index++;
    }

    return sections;
}

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

    if (term === UI_LINE_ITEM) {
        return createTableSection(facets, index, referencedEntityType, qualifier, annotationPath, aliasInfo, service);
    }

    if (term === UI_FIELD_GROUP) {
        return addHeaderSection(facets, index, referencedEntityType, qualifier, annotationPath, aliasInfo, service);
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
    return referencedEntity?.kind === 'EntityType' ? referencedEntity.name : referencedEntity?.structuredType;
}

/**
 * Create a table section node with its child table node.
 *
 * @param facets
 * @param index
 * @param referencedEntityType
 * @param qualifier
 * @param annotationPath
 * @param aliasInfo
 * @param service
 */
function createTableSection(
    facets: IndexedAnnotation,
    index: number,
    referencedEntityType: string,
    qualifier: string | undefined,
    annotationPath: string,
    aliasInfo: AliasInformation,
    service: ParsedService
): TableSectionNode | undefined {
    const section: TableSectionNode = {
        type: 'table-section',
        annotationPath: `@com.sap.vocabularies.UI.v1.Facets/${index}`,
        annotation: facets,
        children: []
    };

    const lineItemKey = buildAnnotationIndexKey(referencedEntityType, UI_LINE_ITEM);
    const tableAnnotations = service.index.annotations[lineItemKey];
    if (!tableAnnotations) {
        return undefined;
    }

    const annotation = tableAnnotations[qualifier ?? 'undefined'];
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
 * @param index - Index of annotation
 * @param referencedEntityType - Entity type
 * @param qualifier - FieldGroup annotation qualifier
 * @param annotationPath - Header facet annotation path
 * @param aliasInfo - Alias information for resolving namespaces
 * @param service - The parsed OData service
 * @returns Header section annotation node
 */
function addHeaderSection(
    headerFacets: IndexedAnnotation,
    index: number,
    referencedEntityType: string,
    qualifier: string | undefined,
    annotationPath: string,
    aliasInfo: AliasInformation,
    service: ParsedService
): HeaderSectionNode | undefined {
    const section: HeaderSectionNode = {
        type: 'header-section',
        annotationPath: `@com.sap.vocabularies.UI.v1.HeaderFacet/${index}`,
        annotation: headerFacets,
        children: []
    };

    const fieldGroupKey = buildAnnotationIndexKey(referencedEntityType, UI_FIELD_GROUP);
    const fieldGroupAnnotations = service.index.annotations[fieldGroupKey];
    if (!fieldGroupAnnotations) {
        return undefined;
    }

    const annotation = fieldGroupAnnotations[qualifier ?? 'undefined'];
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

const findContentByName = (content: ElementChild[], name: string): ElementChild | undefined =>
    content.find((c) => (c as Element).name === name);

const getElementText = (element: ElementChild): string | undefined =>
    (element as Element).content.find((c) => c.type === 'text')?.text;

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
 * Links an object page header section with its field group annotation.
 * Used by both FE v2 and v4 linkers.
 *
 * @param section - Header section node to link
 * @param page - The object page being linked
 */
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
