import type { TargetPath, Element, AnnotationFile, Reference, Range } from '@sap-ux/odata-annotation-core-types';
import { Edm, ELEMENT_TYPE, GHOST_FILENAME_PREFIX, TEXT_TYPE } from '@sap-ux/odata-annotation-core-types';
import type {
    AnnotationList,
    AnnotationRecord,
    ApplyExpression,
    Collection,
    CollectionExpression,
    Expression,
    PropertyValue,
    RawAnnotation
} from '@sap-ux/vocabularies-types';
import {
    toFullyQualifiedName,
    parseIdentifier,
    getSingleTextNode,
    getElementAttribute,
    getElementAttributeValue
} from '@sap-ux/odata-annotation-core';
import type { VocabularyService } from '@sap-ux/odata-vocabularies';

import type { NamespaceMap } from './utils';
import { resolveEnumMemberValue, resolvePath } from './utils';

/**
 * Types for adding more origin information to annotations
 * (all added properties are optional so these types can also be used when no origin information shall be added)
 */
export interface AnnotationListWithOrigins extends AnnotationList {
    /**
     *  Path identifying the targeted metadata element (e.g. \<namespace\>.\<EntityType\>/\<PropertyName\> )
     */
    target: TargetPath;
    /**
     * Generated type!! It is assumed that no introspection is required to interpret the content!
     */
    annotations: AnnotationWithOrigin[];
    /**
     * Origins for annotations (look for same index)
     */
    origins?: (Range | undefined)[];
}

export interface AnnotationWithOrigin extends RawAnnotation {
    /**
     * Range of annotation (for non embedded annotations this is also contained in TargetAnnotationsWithOrigins.origins)
     */
    origin?: Range;
    /**
     * Ranges of entries in Annotation.collection (if present)
     */
    collectionOrigins?: (Range | undefined)[];
    /**
     * Extend existing property with origin information
     */
    record?: RecordWithOrigins;
    /**
     * Extend existing property with origin information
     */
    annotations?: AnnotationWithOrigin[];
}
export interface CollectionExpressionWithOrigins extends CollectionExpression {
    /**
     * Ranges of collection entries when Collection is used as expression
     */
    collectionOrigins?: (Range | undefined)[];
}
export interface RecordWithOrigins extends AnnotationRecord {
    /**
     * Ranges of propertyValues
     */
    propertyValuesOrigins?: (Range | undefined)[];
    /**
     * Extend existing property with origin information
     */
    annotations?: AnnotationWithOrigin[];
}

/**
 * Converts internal representation annotation files to AVT format.
 *
 * @param file - Internal representation root.
 * @param serviceName - Service Name.
 * @param options - Conversion options.
 * @returns AVT annotations.
 */
export function convertAnnotationFile(
    file: AnnotationFile,
    serviceName: string,
    options?: ConversionOptions
): AnnotationListWithOrigins[] {
    if (!file.references) {
        return [];
    }
    const annotations: AnnotationListWithOrigins[] = [];
    const namespaceMap = getNamespaceMap(file.references);
    const namespace =
        file.uri.startsWith(GHOST_FILENAME_PREFIX) || !file.namespace ? serviceName : file.namespace?.name ?? '';
    const alias = file.namespace?.alias ?? '';
    Object.freeze(namespaceMap);

    for (let targetIndex = 0; targetIndex < file.targets.length; targetIndex++) {
        const target = file.targets[targetIndex];
        const cache = new Map<string, RawAnnotation>();
        const terms: RawAnnotation[] = [];
        const origins: (Range | undefined)[] = [];
        const targetNamespaceMap = { ...namespaceMap, [namespace]: namespace };
        if (alias) {
            targetNamespaceMap[alias] = namespace;
        }
        const targetName = resolvePath(targetNamespaceMap, namespace, target.name);
        for (let termIndex = 0; termIndex < target.terms.length; termIndex++) {
            const term = target.terms[termIndex];
            const annotation = convertAnnotation(targetNamespaceMap, target.name, term, options);
            const qualifier = annotation.qualifier ? '#' + annotation.qualifier : '';
            const id = `${targetName}@${annotation.term}${qualifier}`;
            const existingAnnotation = cache.get(id);
            if (options?.mergeSplitAnnotations && existingAnnotation) {
                mergeAnnotation(
                    options.mergeMap,
                    `${id}/0/0`,
                    `${id}/${targetIndex}/${termIndex}`,
                    existingAnnotation,
                    annotation
                );
            } else {
                cache.set(id, annotation);
                terms.push(annotation);
            }
            origins.push(term.range);
        }
        const annotationList: AnnotationListWithOrigins = {
            target: targetName,
            annotations: terms
        };
        if (options?.addOrigins) {
            annotationList.origins = origins;
        }
        annotations.push(annotationList);
    }
    return annotations;
}

// split values in generic format will have duplicated structures e.g
// annotations -> multiple elements with matching Target/Term/Qualifier combination, but partial values
// records -> multiple PropertyValue elements with the same name, but partial values
// all of these values are flattened
// There should not be duplicate values (last encountered will be used)

function mergeAnnotation(
    mergeMap: Record<string, string>,
    targetPath: string,
    sourcePath: string,
    target: AnnotationWithOrigin,
    source: AnnotationWithOrigin
): void {
    mergeAnnotationAnnotations(mergeMap, targetPath, sourcePath, target, source);
    if (source.record) {
        if (target.record) {
            mergeRecord(mergeMap, targetPath, sourcePath, target.record, source.record, true);
        } else {
            target.record = source.record;
            target.origin = source.origin;
        }
    } else if (source.value) {
        target.value = source.value;
        target.origin = source.origin;
    } else if (source.collection) {
        target.origin = source.origin;
        target.collection = source.collection;
        target.collectionOrigins = source.collectionOrigins;
    }
}

function mergeRecord(
    mergeMap: Record<string, string>,
    targetPath: string,
    sourcePath: string,
    target: RecordWithOrigins,
    source: RecordWithOrigins,
    directTermValue: boolean
): void {
    mergeRecordAnnotations(mergeMap, targetPath, sourcePath, target, source, directTermValue);
    const offset = target.propertyValues.length;
    const propertyName = directTermValue ? 'record' : 'Record';
    const mergedPaths: Record<string, string> = {};

    for (let i = 0; i < source.propertyValues.length; i++) {
        const property = source.propertyValues[i];
        const mergedPath = mergedPaths[property.name];
        if (mergedPath) {
            continue;
        }
        const existingIndex = target.propertyValues.findIndex((p) => p.name === property.name);
        if (existingIndex !== -1) {
            const mergedKey = `${targetPath}/${propertyName}/propertyValues/${existingIndex}`;
            mergedPaths[property.name] = mergedKey;
        } else if (property.value.type === 'Record') {
            const mergedKey = `${targetPath}/${propertyName}/propertyValues/${i + offset}`;
            mergedPaths[property.name] = mergedKey;
        }
    }

    mergeProperties(mergeMap, targetPath, sourcePath, target, source, mergedPaths, propertyName, offset);
    if (directTermValue) {
        return;
    }
}

function mergeProperties(
    mergeMap: Record<string, string>,
    targetPath: string,
    sourcePath: string,
    target: RecordWithOrigins,
    source: RecordWithOrigins,
    mergedPaths: Record<string, string>,
    propertyName: string,
    offset: number
): void {
    for (let i = 0; i < source.propertyValues.length; i++) {
        const property = source.propertyValues[i];

        const existingIndex = target.propertyValues.findIndex((p) => p.name === property.name);
        const mergedKey = mergedPaths[property.name] ?? `${targetPath}/${propertyName}/propertyValues/${i + offset}`;
        const key = `${sourcePath}/${propertyName}/propertyValues/${i}`;
        if (existingIndex !== -1) {
            const existing = target.propertyValues[existingIndex];
            if (existing.value.type === 'Record' && property.value.type === 'Record') {
                mergeRecord(
                    mergeMap,
                    `${mergedKey}/value`,
                    `${key}/value`,
                    existing.value.Record,
                    property.value.Record,
                    false
                );
            } else {
                existing.value = property.value;
            }
        } else {
            mergeMap[mergedKey] = key;
            target.propertyValues.push(property);
            if (target.propertyValuesOrigins && source.propertyValuesOrigins) {
                target.propertyValuesOrigins.push(source.propertyValuesOrigins[i]);
            }
        }
    }
}

function mergeAnnotationAnnotations(
    mergeMap: Record<string, string>,
    targetPath: string,
    sourcePath: string,
    target: RawAnnotation,
    source: RawAnnotation
): void {
    if (source.annotations) {
        if (!target.annotations) {
            target.annotations = [];
            for (let i = 0; i < source.annotations.length; i++) {
                const annotation = source.annotations[i];
                const mergedKey = `${targetPath}/annotations/${i}`;
                const key = `${sourcePath}/annotations/${i}`;
                mergeMap[mergedKey] = key;
                target.annotations.push(annotation);
            }
            return;
        }
        const offset = target.annotations.length;
        for (let i = 0; i < source.annotations.length; i++) {
            const annotation = source.annotations[i];
            const existing = target.annotations.find(
                (a) => a.term === annotation.term && a.qualifier === annotation.qualifier
            );

            const mergedKey = `${targetPath}/annotations/${i + offset}`;
            const key = `${sourcePath}/annotations/${i}`;
            if (existing) {
                mergeAnnotation(mergeMap, mergedKey, key, existing, annotation);
            } else {
                mergeMap[mergedKey] = key;
                target.annotations.push(annotation);
            }
        }
    }
}
function mergeRecordAnnotations(
    mergeMap: Record<string, string>,
    targetPath: string,
    sourcePath: string,
    target: RecordWithOrigins,
    source: RecordWithOrigins,
    directTermValue: boolean
): void {
    if (source.annotations) {
        const propertyName = directTermValue ? 'record' : 'Record';
        if (!target.annotations) {
            target.annotations = [];
            for (let i = 0; i < source.annotations.length; i++) {
                const annotation = source.annotations[i];
                const mergedKey = `${targetPath}/${propertyName}/annotations/${i}`;
                const key = `${sourcePath}/${propertyName}/annotations/${i}`;
                mergeMap[mergedKey] = key;
                target.annotations.push(annotation);
            }
            return;
        }
        const offset = target.annotations.length;
        for (let i = 0; i < source.annotations.length; i++) {
            const annotation = source.annotations[i];
            const existing = target.annotations.find(
                (a) => a.term === annotation.term && a.qualifier === annotation.qualifier
            );

            const mergedKey = `${targetPath}/${propertyName}/annotations/${i + offset}`;
            const key = `${sourcePath}/${propertyName}/annotations/${i}`;
            if (existing) {
                mergeAnnotation(mergeMap, mergedKey, key, existing, annotation);
            } else {
                mergeMap[mergedKey] = key;
                target.annotations.push(annotation);
            }
        }
    }
}

function getNamespaceMap(references: Reference[]): NamespaceMap {
    const namespaceMap: NamespaceMap = {};
    for (const reference of references) {
        namespaceMap[reference.name] = reference.name;
        if (reference.alias) {
            namespaceMap[reference.alias] = reference.name;
        }
    }
    namespaceMap['Edm'] = 'Edm';
    return namespaceMap;
}
type ConversionOptions = {
    addOrigins?: boolean;
    vocabularyService?: VocabularyService;
    mergeSplitAnnotations: boolean;
    mergeMap: Record<string, string>;
};
function convertAnnotation(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    annotationElement: Element,
    options?: ConversionOptions
): AnnotationWithOrigin {
    const termAttributeValue = getElementAttributeValue(annotationElement, 'Term');
    const term = parseIdentifier(termAttributeValue);

    let fqTerm = toFullyQualifiedName(namespaceMap, '', term);
    const qualifier = getElementAttributeValue(annotationElement, 'Qualifier');
    if (fqTerm?.startsWith('com.sap.vocabularies.CDS.v1.')) {
        const result = options?.vocabularyService?.cdsVocabulary.reverseNameMap.get(
            term.namespaceOrAlias + '.' + term.name
        );
        if (result) {
            fqTerm = result;
        }
    }

    const value = convertExpression(namespaceMap, currentNamespace, annotationElement, options);
    const annotation: AnnotationWithOrigin = {
        term: fqTerm ?? termAttributeValue
    };
    if (value) {
        annotation.value = value;
    }
    if (options?.addOrigins) {
        annotation.origin = annotationElement.range;
    }
    if (qualifier) {
        annotation.qualifier = qualifier;
    }
    if (annotation.value?.type === 'Record') {
        annotation.record = annotation.value.Record;
        delete annotation.value;
    } else if (annotation.value?.type === 'Collection') {
        annotation.collection = annotation.value.Collection;
        if (options?.addOrigins) {
            annotation.collectionOrigins = (annotation.value as CollectionExpressionWithOrigins).collectionOrigins;
        }
        delete annotation.value;
    } else if (annotation.value?.type === 'Unknown' && Object.keys(annotation.value).length === 1) {
        delete annotation.value; // did not appear in parseEdmx output
    }
    const embeddedAnnotations = convertEmbeddedAnnotations(namespaceMap, currentNamespace, annotationElement, options);
    if (embeddedAnnotations.length) {
        annotation.annotations = embeddedAnnotations;
    }
    return annotation;
}

function convertEmbeddedAnnotations(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    element: Element,
    options?: ConversionOptions
): RawAnnotation[] {
    return (element.content ?? [])
        .filter((child): child is Element => child.type === ELEMENT_TYPE && child.name === Edm.Annotation)
        .map((embeddedAnnotation) => convertAnnotation(namespaceMap, currentNamespace, embeddedAnnotation, options));
}
const EXPRESSION_TYPES = new Set<string>([
    Edm.String,
    Edm.Bool,
    Edm.Decimal,
    Edm.Date,
    Edm.Float,
    Edm.Int,
    Edm.Path,
    Edm.PropertyPath,
    Edm.AnnotationPath,
    Edm.NavigationPropertyPath,
    Edm.EnumMember,
    Edm.Collection,
    Edm.Record,
    Edm.Apply,
    Edm.Null
]);

function convertExpression(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    element: Element,
    options?: ConversionOptions
): Expression {
    const expressionValues: Expression[] = [];

    // check if element itself represents the value
    if (EXPRESSION_TYPES.has(element.name)) {
        expressionValues.push(convertExpressionValue(namespaceMap, currentNamespace, element, options));
    }

    // check if value is provided as attribute
    for (const attributeName of Object.keys(element.attributes)) {
        if (EXPRESSION_TYPES.has(attributeName)) {
            const attribute = getElementAttribute(element, attributeName);
            if (attribute) {
                expressionValues.push(
                    createExpression(namespaceMap, currentNamespace, attribute.name, attribute.value)
                );
            }
        }
    }

    // check if value is provided as sub node
    const children = (element.content ?? []).filter(
        (child): child is Element => child.type === ELEMENT_TYPE && EXPRESSION_TYPES.has(child.name)
    );

    for (const child of children) {
        expressionValues.push(convertExpressionValue(namespaceMap, currentNamespace, child, options));
    }

    return expressionValues[0];
}

function createExpression(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    name: string,
    value: string
): Expression {
    switch (name) {
        case 'String':
            return {
                type: 'String',
                String: value
            };
        case 'Bool':
            return {
                type: 'Bool',
                Bool: value === 'true'
            };
        case 'Decimal':
            return {
                type: 'Decimal',
                Decimal: parseFloat(value)
            };
        case 'Date':
            return {
                type: 'Date',
                Date: value
            };
        case 'Int':
            return {
                type: 'Int',
                Int: Number.parseInt(value, 10)
            };
        case 'Path':
            return {
                type: 'Path',
                Path: resolvePath(namespaceMap, currentNamespace, value)
            };
        case 'PropertyPath':
            return {
                type: 'PropertyPath',
                PropertyPath: resolvePath(namespaceMap, currentNamespace, value)
            };
        case 'AnnotationPath':
            return {
                type: 'AnnotationPath',
                AnnotationPath: resolvePath(namespaceMap, currentNamespace, value)
            };
        case 'NavigationPropertyPath':
            return {
                type: 'NavigationPropertyPath',
                NavigationPropertyPath: resolvePath(namespaceMap, currentNamespace, value)
            };
        case 'EnumMember':
            return {
                type: 'EnumMember',
                EnumMember: resolveEnumMemberValue(namespaceMap, currentNamespace, value)
            };
        case 'Null':
            return {
                type: 'Null'
            };
        default:
            return {
                type: 'Unknown'
            };
    }
}

/**
 * Convert expression value from internal:
 *  - value for an expression can be primitive or non primitive (AnnotationRecord, Collection, Apply).
 *  - all primitive values are returned in their stringified version.
 *
 * @param namespaceMap - Namespace and alias mapping.
 * @param currentNamespace - Current files namespace.
 * @param element - Is supposed to represent a value of an expression.
 * @param options - Conversion options.
 * @returns AVT expression.
 */
function convertExpressionValue(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    element: Element,
    options?: ConversionOptions
): Expression {
    switch (element.name) {
        case 'Collection': {
            const { collection, collectionOrigins } = convertCollection(
                namespaceMap,
                currentNamespace,
                element,
                options
            );
            const result = {
                type: 'Collection',
                Collection: collection
            };
            if (options?.addOrigins) {
                (result as CollectionExpressionWithOrigins).collectionOrigins = collectionOrigins;
            }
            return result as CollectionExpression;
        }
        case 'Record':
            return {
                type: 'Record',
                Record: convertRecord(namespaceMap, currentNamespace, element, options)
            };
        case 'Apply':
            return convertApply(namespaceMap, currentNamespace, element);
        default: {
            const singleTextNode = getSingleTextNode(element);
            const value = singleTextNode?.text ?? '';
            return createExpression(namespaceMap, currentNamespace, element.name, value);
        }
    }
}

function convertRecord(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    recordElement: Element,
    options?: ConversionOptions
): RecordWithOrigins {
    const origins: (Range | undefined)[] = [];
    const type = getElementAttributeValue(recordElement, 'Type');
    let resolvedRecordType: string | undefined;

    if (type) {
        const parsedIdentifier = parseIdentifier(type);
        resolvedRecordType = toFullyQualifiedName(namespaceMap, '', parsedIdentifier);
    }

    const propertyValues = (recordElement.content || [])
        .filter((child): child is Element => child.type === ELEMENT_TYPE && child.name === Edm.PropertyValue)
        .map((propValueChild: Element) => {
            if (options?.addOrigins) {
                origins.push(propValueChild.range);
            }
            const name = getElementAttributeValue(propValueChild, 'Property');
            const propertyValue: PropertyValue = {
                name,
                value: convertExpression(namespaceMap, currentNamespace, propValueChild, options) || { type: 'Unknown' } // when property value have default value
            };
            const annotations = convertEmbeddedAnnotations(namespaceMap, currentNamespace, propValueChild, options);
            if (annotations?.length) {
                propertyValue.annotations = annotations;
            }
            if (propertyValue?.value?.type === 'Unknown' && Object.keys(propertyValue?.value).length === 1) {
                propertyValue.value = { type: 'Bool', Bool: true }; // presumably boolean property with default value true
            }
            return propertyValue;
        });
    const record: RecordWithOrigins = { propertyValues };
    if (options?.addOrigins) {
        record.propertyValuesOrigins = origins;
    }

    if (resolvedRecordType) {
        record.type = resolvedRecordType;
    }
    const annotations = convertEmbeddedAnnotations(namespaceMap, currentNamespace, recordElement, options);
    if (annotations.length) {
        record.annotations = annotations;
    }

    return record;
}

function convertCollection(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    collectionElement: Element,
    options?: ConversionOptions
): { collection: Collection; collectionOrigins: Range[] } {
    const collection: Collection = [];
    const collectionOrigins: Range[] = [];
    (collectionElement.content || [])
        .filter((child): child is Element => child.type === ELEMENT_TYPE)
        .forEach((collectionEntryElement: Element) => {
            const value = convertExpression(namespaceMap, currentNamespace, collectionEntryElement, options);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let entry = value as any;
            if (value && value.type) {
                // record and string can be used directly as collection entries
                if (value.type === 'Record') {
                    entry = value.Record;
                } else if (value.type === 'String') {
                    entry = value.String;
                }
            }
            collection.push(entry);
            if (options?.addOrigins && collectionEntryElement.range) {
                collectionOrigins.push(collectionEntryElement.range);
            }
        });
    return { collection, collectionOrigins };
}

function convertApply(namespaceMap: NamespaceMap, currentNamespace: string, element: Element): ApplyExpression {
    // use internal representation (without alias) to represent Apply value
    const clone = structuredClone(element);
    replaceAliasInElement(namespaceMap, currentNamespace, clone);
    const functionName = getElementAttributeValue(element, Edm.Function);
    return {
        type: 'Apply',
        $Apply: clone,
        $Function: functionName
    };
}

function replaceAliasInElement(namespaceMap: NamespaceMap, currentNamespace: string, element: Element): Element {
    const result = element;
    // replace aliased in all attributes/sub nodes with full namespaces (reverse = true ? vice versa):
    // in attributes: term or type attributes, enumValue and any path values provided as attributes
    Object.keys(result.attributes || {}).forEach((attributeName) => {
        const attribute = result.attributes[attributeName];
        if (attributeName === Edm.Term || attributeName === 'Type') {
            const parsedIdentifier = parseIdentifier(attribute.value);
            const fullyQualifiedName = toFullyQualifiedName(namespaceMap, '', parsedIdentifier);
            if (fullyQualifiedName) {
                attribute.value = fullyQualifiedName;
            }
        } else if (attributeName === 'EnumMember') {
            attribute.value = resolveEnumMemberValue(namespaceMap, currentNamespace, attribute.value);
        } else if (attributeName.endsWith('Path')) {
            attribute.value = resolvePath(namespaceMap, currentNamespace, attribute.value);
        }
    });
    if ((result.content || []).some((entry) => entry.type === ELEMENT_TYPE)) {
        // sub elements present: filter out empty text nodes
        result.content = result.content.filter((entry) => !(entry.type === TEXT_TYPE && !(entry.text || '').trim()));
    }
    // in sub nodes
    replaceAliasInElementContent(namespaceMap, currentNamespace, result);

    return result;
}

function replaceAliasInElementContent(namespaceMap: NamespaceMap, currentNamespace: string, element: Element) {
    for (const subNode of element.content || []) {
        if (subNode.type === ELEMENT_TYPE) {
            replaceAliasInElement(namespaceMap, currentNamespace, subNode);
        } else if (subNode.type === TEXT_TYPE) {
            const text = subNode.text;
            if (element.name === 'EnumMember') {
                subNode.text = resolveEnumMemberValue(namespaceMap, currentNamespace, text);
            } else if (subNode.type === TEXT_TYPE && element.name.endsWith('Path')) {
                subNode.text = resolvePath(namespaceMap, currentNamespace, text);
            }
        }
    }
}
