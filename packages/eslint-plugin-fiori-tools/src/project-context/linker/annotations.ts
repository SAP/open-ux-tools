import {
    AliasInformation,
    Edm,
    elementsWithName,
    getElementAttributeValue,
    toFullyQualifiedName,
    Element,
    parseIdentifier,
    ELEMENT_TYPE,
    getElementAttribute,
    toFullyQualifiedPath,
    parsePath,
    MetadataElement
} from '@sap-ux/odata-annotation-core';
import {} from '../../../../xml-odata-annotation-converter/src/parser/element-getters';
import { buildAnnotationIndexKey, IndexedAnnotation, ParsedService } from '../parser';
import { LinkerContext } from './types';
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

export type TableSectionNode = AnnotationBasedNode<'table-section', TableNode>;
export type SectionNode = TableSectionNode;

export type TableNode = AnnotationBasedNode<'table'>;

export type AnnotationNode = SectionNode | TableNode;
export type NodeLookup = {
    [K in AnnotationNode['type']]?: Extract<AnnotationNode, { type: K }>[];
};

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
export function collectSections(feVersion: 'v2' | 'v4', entityType: string, service: ParsedService): SectionNode[] {
    const sections: SectionNode[] = [];
    const facetsKey = buildAnnotationIndexKey(entityType, 'com.sap.vocabularies.UI.v1.Facets');
    const facets = service.index.annotations[facetsKey]?.['undefined'];

    if (facets) {
        const [collection] = elementsWithName(Edm.Collection, facets.top.value);
        if (!collection) {
            return sections;
        }
        const records = elementsWithName(Edm.Record, collection);
        const aliasInfo = service.artifacts.aliasInfo[facets.top.uri];
        let index = 0;
        for (const record of records) {
            const type = getRecordType(aliasInfo, record);

            if (type === 'com.sap.vocabularies.UI.v1.ReferenceFacet') {
                const properties = getRecordPropertyValue(record);
                const id = properties['ID']?.value;
                const target = properties['Target'];
                if (id && target && target.kind === Edm.AnnotationPath) {
                    const annotationPath = target.value;
                    if (annotationPath.startsWith('/')) {
                        // absolute path is not supported
                        continue;
                    }
                    const fullyQualifiedPath = toFullyQualifiedPath(
                        aliasInfo.aliasMap,
                        '',
                        parsePath(`/${entityType}/${annotationPath}`)
                    );
                    let [contextPath, _annotationPath] = fullyQualifiedPath.split('@');
                    if (contextPath.endsWith('/')) {
                        contextPath = contextPath.slice(0, -1);
                    }
                    const referencedEntity = service.artifacts.metadataService.getMetadataElement(contextPath.slice(1));
                    const referencedEntityType = referencedEntity?.structuredType;
                    if (!referencedEntityType) {
                        continue;
                    }
                    const [term, qualifier] = _annotationPath.split('#');
                    if (term === UI_LINE_ITEM) {
                        const section: SectionNode = {
                            type: 'table-section',
                            annotationPath: `@com.sap.vocabularies.UI.v1.Facets/${index}`,
                            annotation: facets,
                            children: []
                        };
                        const lineItemKey = buildAnnotationIndexKey(referencedEntityType, UI_LINE_ITEM);
                        const tableAnnotations = service.index.annotations[lineItemKey];
                        if (tableAnnotations) {
                            const annotation = tableAnnotations[qualifier ?? 'undefined'];
                            if (annotation) {
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
                            }
                            sections.push(section);
                        }
                    }
                }
            }
            index++;
        }
    }
    return sections;
}

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

function getEntityForContextPath(contextPath: string, service: ParsedService): MetadataElement | undefined {
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
