import type { AliasInformation, Element, MetadataElement } from '@sap-ux/odata-annotation-core';
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
import { UI_LINE_ITEM } from '../../constants';

export interface AnnotationBasedNode<T extends string, Children = never> {
    type: T;
    annotation: IndexedAnnotation;
    /**
     * Path used by Fiori elements to reference this control
     */
    annotationPath: string;
    children: Children[];
}

export type TableSectionNode = AnnotationBasedNode<'table-section', AnnotationBasedNode<'table'>>;

export type AnnotationNode = TableSectionNode | AnnotationBasedNode<'table'>;
export type NodeLookup = {
    [K in AnnotationNode['type']]?: Extract<AnnotationNode, { type: K }>[];
};

/**
 *
 * @param feVersion
 * @param entityType
 * @param service
 */
export function collectTables(
    feVersion: 'v2' | 'v4',
    entityType: string,
    service: ParsedService
): AnnotationBasedNode<'table'>[] {
    const tables: AnnotationBasedNode<'table'>[] = [];
    const lineItemKey = buildAnnotationIndexKey(entityType, UI_LINE_ITEM);
    const lineItems = service.index.annotations[lineItemKey]?.['undefined'];

    if (lineItems) {
        const table: AnnotationBasedNode<'table'> = {
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
 *
 * @param feVersion
 * @param entityType
 * @param service
 */
export function collectSections(
    feVersion: 'v2' | 'v4',
    entityType: string,
    service: ParsedService
): TableSectionNode[] {
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
        if (section) {
            sections.push(section);
        }
        index++;
    }

    return sections;
}

/**
 * Process a single reference facet record and create a table section if applicable.
 */
function processReferenceFacetRecord(
    record: Element,
    aliasInfo: AliasInformation,
    entityType: string,
    service: ParsedService,
    facets: IndexedAnnotation,
    index: number
): TableSectionNode | undefined {
    const type = getRecordType(aliasInfo, record);
    if (type !== 'com.sap.vocabularies.UI.v1.ReferenceFacet') {
        return undefined;
    }

    const properties = getRecordPropertyValue(record);
    const id = properties['ID']?.value;
    const target = properties['Target'];

    if (!id || !target || target.kind !== Edm.AnnotationPath) {
        return undefined;
    }

    const annotationPath = target.value;
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

    if (term !== UI_LINE_ITEM) {
        return undefined;
    }

    return createTableSection(facets, index, referencedEntityType, qualifier, annotationPath, aliasInfo, service);
}

/**
 * Get the referenced entity type from an annotation path.
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

    const table: AnnotationBasedNode<'table'> = {
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
 *
 * @param aliasInfo
 * @param element
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

interface RecordProperty {
    name: string;
    value: string;
    kind: Edm.String | Edm.AnnotationPath;
}

/**
 *
 * @param record
 */
function getRecordPropertyValue(record: Element): Record<string, RecordProperty> {
    const properties: Record<string, RecordProperty> = {};
    for (const child of record.content) {
        if (child.type !== ELEMENT_TYPE) {
            continue;
        }
        if (child.name === Edm.PropertyValue) {
            const name = getElementAttributeValue(child, Edm.Property);
            const annotationPathAttribute = getElementAttribute(child, Edm.AnnotationPath);
            if (annotationPathAttribute) {
                properties[name] = {
                    name,
                    value: annotationPathAttribute.value,
                    kind: Edm.AnnotationPath
                };
                continue;
            }
            const stringAttribute = getElementAttribute(child, Edm.String);
            if (stringAttribute) {
                properties[name] = {
                    name,
                    value: stringAttribute.value,
                    kind: Edm.String
                };
            }
        }
    }
    return properties;
}

/**
 *
 * @param contextPath
 * @param service
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
 *
 * @param root
 * @param segments
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
