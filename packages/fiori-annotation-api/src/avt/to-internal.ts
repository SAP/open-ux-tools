import type {
    AnnotationRecord,
    Collection,
    Expression,
    PropertyValue,
    RawAnnotation
} from '@sap-ux/vocabularies-types';
import { resolveName, toAliasQualifiedName } from '@sap-ux/odata-annotation-core';
import type { AliasInformation, Element, ElementChild, PathValue, Target } from '@sap-ux/odata-annotation-core-types';
import {
    Edm,
    createElementNode,
    createAttributeNode,
    createTextNode,
    ELEMENT_TYPE,
    TEXT_TYPE
} from '@sap-ux/odata-annotation-core-types';
import { expressionNames, isExpression } from './expressions';
import { getAliasedEnumMember, resolveEnumMemberValue, resolvePath } from './utils';
import type { AnnotationListWithOrigins } from './annotations';

/**
 * Convert target annotations to internal format.
 *
 * @param targetAnnotations - AVT annotation list
 * @param aliasInfo - Alias Information.
 * @returns Internal representation of the Target.
 */
export function convertTargetAnnotationsToInternal(
    targetAnnotations: AnnotationListWithOrigins,
    aliasInfo: AliasInformation
): Target {
    const target = buildEmptyTarget(getAliasedPath(aliasInfo, targetAnnotations.target));
    target.terms = targetAnnotations.annotations.map((annotation) =>
        convertAnnotationToInternal(annotation, aliasInfo)
    );
    return target;
}

/**
 * Build empty target (generic annotation file format).
 *
 * @param path - Target name.
 * @returns Internal representation of the target.
 */
export function buildEmptyTarget(path: string): Target {
    return { type: 'target', name: path, terms: [], range: undefined, nameRange: undefined, termsRange: undefined };
}

/**
 * Convert annotation to internal format.
 *
 * @param annotation - Annotation.
 * @param aliasInfo - Alias Information.
 * @returns Internal representation of the annotation.
 */
export function convertAnnotationToInternal(annotation: RawAnnotation, aliasInfo: AliasInformation): Element {
    const annotationElement = createElementNode({ name: Edm.Annotation });
    annotationElement.attributes[Edm.Term] = createAttributeNode(
        Edm.Term,
        toAliasQualifiedName(annotation.term, aliasInfo)
    );
    if (annotation.qualifier) {
        annotationElement.attributes[Edm.Qualifier] = createAttributeNode(Edm.Qualifier, annotation.qualifier);
    }
    if (annotation.collection) {
        annotationElement.content = annotationElement.content || [];
        annotationElement.content.push(convertCollectionToInternal(aliasInfo, annotation.collection));
    } else if (annotation.record) {
        annotationElement.content = annotationElement.content || [];
        annotationElement.content.push(convertRecordToInternal(aliasInfo, annotation.record));
    } else if (annotation.value) {
        convertExpressionToInternal(aliasInfo, annotation.value, annotationElement);
    }
    if (annotation.annotations?.length) {
        // add embedded annotations
        annotation.annotations.forEach((annotation) => {
            annotationElement.content = annotationElement.content || [];
            annotationElement.content.push(convertAnnotationToInternal(annotation, aliasInfo));
        });
    }
    return annotationElement;
}

/**
 * Convert collection to internal format.
 *
 * @param aliasInfo - Alias Information.
 * @param collection - Collection.
 * @returns Internal representation of the collection.
 */
export function convertCollectionToInternal(aliasInfo: AliasInformation, collection: Collection): Element {
    const collectionElement: Element = createElementNode({ name: Edm.Collection });
    for (const entry of collection) {
        const entryNode = convertCollectionElement(aliasInfo, entry);
        if (entryNode) {
            collectionElement.content.push(entryNode);
        }
    }
    return collectionElement;
}

/**
 *
 * @param aliasInfo - Alias Information.
 * @param entry - Collection entry.
 * @returns Internal representation of the collection entry.
 */
export function convertCollectionElement(
    aliasInfo: AliasInformation,
    entry: Collection[number]
): ElementChild | undefined {
    if (typeof entry === 'object') {
        if (isExpression(entry)) {
            // entry is expression
            return convertExpressionToInternal(aliasInfo, entry);
        } else {
            // entry must be record
            return convertRecordToInternal(aliasInfo, entry as AnnotationRecord);
        }
    } else if (typeof entry === 'boolean') {
        // obvious extension of annotation.record definition
        return createElementNode({ name: Edm.Bool, content: [createTextNode(entry ? 'true' : 'false')] });
    }
    return undefined;
}

/**
 * Convert record to internal format.
 *
 * @param aliasInfo - Alias Information.
 * @param record - Record.
 * @returns Internal representation of the record.
 */
export function convertRecordToInternal(aliasInfo: AliasInformation, record: AnnotationRecord): Element {
    const recordElement: Element = createElementNode({ name: Edm.Record });
    if (record.type) {
        recordElement.attributes[Edm.Type] = createAttributeNode(
            Edm.Type,
            toAliasQualifiedName(record.type, aliasInfo)
        );
    }
    record.propertyValues.forEach((propertyValue) => {
        const propValueElement = convertPropertyValueToInternal(aliasInfo, propertyValue);
        recordElement.content.push(propValueElement);
    });
    if (record.annotations?.length) {
        // add embedded annotations
        recordElement.content = recordElement.content || [];
        record.annotations.forEach((annotation: RawAnnotation) => {
            recordElement.content.push(convertAnnotationToInternal(annotation, aliasInfo));
        });
    }
    return recordElement;
}

/**
 *
 * @param aliasInfo - Alias Information.
 * @param propertyValue - Property value.
 * @returns Internal representation of the property value.
 */
export function convertPropertyValueToInternal(aliasInfo: AliasInformation, propertyValue: PropertyValue): Element {
    const propValueElement: Element = createElementNode({ name: Edm.PropertyValue });
    propValueElement.attributes[Edm.Property] = createAttributeNode(Edm.Property, propertyValue.name);
    convertExpressionToInternal(aliasInfo, propertyValue.value, propValueElement);
    if (propertyValue.annotations?.length) {
        // add embedded annotations
        propValueElement.content = propValueElement.content || [];
        propertyValue.annotations.forEach((annotation: RawAnnotation) => {
            propValueElement.content.push(convertAnnotationToInternal(annotation, aliasInfo));
        });
    }
    return propValueElement;
}

/**
 * Convert expression to internal representation.
 *
 * @param aliasInfo - Alias Information.
 * @param value - Expression value.
 * @param hostElement add value to this element as host (e.g. add for elements Annotation and PropertyValue)
 * @returns Internal representation of the expression.
 */
export function convertExpressionToInternal(
    aliasInfo: AliasInformation,
    value: Expression,
    hostElement?: Element
): Element | undefined {
    const elementName = expressionNames[value.type] ? value.type : '';
    const element = hostElement ?? (elementName ? createElementNode({ name: elementName }) : undefined);
    if (!element) {
        return undefined;
    }
    switch (value.type) {
        case 'Collection': {
            const collectionElement = convertCollectionToInternal(aliasInfo, value.Collection);
            return consumeElement(element, collectionElement, hostElement);
        }
        case 'Record': {
            const recordElement = convertRecordToInternal(aliasInfo, value.Record);
            return consumeElement(element, recordElement, hostElement);
        }
        case 'Apply': {
            const applyElement = convertDynamicExpressionToInternal(aliasInfo, value.$Apply);
            return consumeElement(element, applyElement, hostElement);
        }
        case 'If':
        case 'And':
        case 'Or':
        case 'Le':
        case 'Lt':
        case 'Ge':
        case 'Gt':
        case 'Eq':
        case 'Ne':
        case 'Not':
            // Dynamic expressions are not supported.
            return consumeElement(element, createElementNode({ name: value.type }), hostElement);
        case 'Null': {
            const nullElement = createElementNode({ name: elementName });
            return consumeElement(element, nullElement, hostElement);
        }
        case 'Unknown':
            return undefined;
        default: {
            // value type is EDMX primitive expression
            const rawPrimitiveValue = (value as any)[value.type]; // There is always a property with on the object as type name, Typescript does not infer this case as expected
            const primitiveValue = convertPrimitiveValueToInternal(value.type, rawPrimitiveValue, aliasInfo);
            if (hostElement) {
                // add value to host element as attribute
                element.attributes = element.attributes || {};
                element.attributes[value.type] = createAttributeNode(value.type, primitiveValue);
            } else {
                // add value as single text sub node
                element.content.push(createTextNode(primitiveValue));
            }
            break;
        }
    }
    return element;
}

/**
 *
 * @param aliasInfo - Alias Information.
 * @param expression - Apply expression.
 * @returns Internal representation of apply.
 */
export function convertDynamicExpressionToInternal(aliasInfo: AliasInformation, expression: Element): Element {
    // Apply value is regular internal representation (without alias)
    const clone: Element = JSON.parse(JSON.stringify(expression));
    return replaceAliasInElement(clone, aliasInfo, true);
}

/**
 *
 * @param type - Type of primitive value.
 * @param value - Primitive value.
 * @param aliasInfo - Alias Information.
 * @returns Internal representation of primitive value
 */
export function convertPrimitiveValueToInternal(
    type: string,
    value: string | number | boolean | undefined,
    aliasInfo: AliasInformation
): string {
    const text = value === undefined ? '' : value.toString();
    if (!text) {
        return text;
    } else if (type === Edm.EnumMember) {
        return getAliasedEnumMember(aliasInfo, text);
    } else if (type.indexOf('Path') >= 0) {
        return getAliasedPath(aliasInfo, text);
    } else if (type === Edm.Type || type === Edm.Term) {
        return toAliasQualifiedName(text, aliasInfo);
    } else {
        return text;
    }
}

function consumeElement(element: Element, collectionElement: Element, hostElement?: Element): Element {
    if (hostElement) {
        element.content = element.content || [];
        element.content.push(collectionElement); // add whole collection as sub element
    } else {
        element = collectionElement;
    }
    return element;
}

function replaceAliasInElement(element: Element, aliasInfo: AliasInformation, reverse?: boolean): Element {
    // replace aliases in all attributes/sub nodes with full namespaces (reverse = true ? vice versa):
    const result = element;
    removeEmptyTextNodes(result);
    replaceAliasInAttributes(result, aliasInfo, reverse);
    replaceAliasInSubNodes(result, aliasInfo, reverse);
    return result;
}

function replaceAliasInAttributes(result: Element, aliasInfo: AliasInformation, reverse?: boolean): void {
    // in attributes: term or type attributes, enumValue and any path values provided as attributes
    Object.keys(result.attributes || {}).forEach((attributeName) => {
        const attribute = result.attributes[attributeName];
        switch (attributeName) {
            case Edm.Term:
            case Edm.Type:
                attribute.value = reverse
                    ? toAliasQualifiedName(attribute.value, aliasInfo)
                    : resolveName(attribute.value, aliasInfo.aliasMap)?.qName;
                break;
            case Edm.EnumMember:
                attribute.value = reverse
                    ? getAliasedEnumMember(aliasInfo, attribute.value)
                    : resolveEnumMemberValue(aliasInfo.aliasMap, aliasInfo.currentFileNamespace, attribute.value);
                break;
            default:
                if (attributeName.endsWith('Path')) {
                    attribute.value = reverse
                        ? getAliasedPath(aliasInfo, attribute.value)
                        : resolvePath(aliasInfo.aliasMap, aliasInfo.currentFileNamespace, attribute.value);
                }
                break;
        }
    });
}

function replaceAliasInSubNodes(result: Element, aliasInfo: AliasInformation, reverse?: boolean): void {
    for (const subNode of result.content ?? []) {
        if (subNode.type === ELEMENT_TYPE) {
            replaceAliasInElement(subNode, aliasInfo, reverse);
        } else if (subNode.type === TEXT_TYPE && result.name === Edm.EnumMember) {
            subNode.text = reverse
                ? getAliasedEnumMember(aliasInfo, subNode.text)
                : resolveEnumMemberValue(aliasInfo.aliasMap, aliasInfo.currentFileNamespace, subNode.text);
        } else if (subNode.type === TEXT_TYPE && result.name.endsWith('Path')) {
            subNode.text = reverse
                ? getAliasedPath(aliasInfo, subNode.text)
                : resolvePath(aliasInfo.aliasMap, aliasInfo.currentFileNamespace, subNode.text);
        }
    }
}

function removeEmptyTextNodes(result: Element): void {
    if ((result.content ?? []).some((entry) => entry.type === ELEMENT_TYPE)) {
        // sub elements present: filter out empty text nodes
        result.content = result.content.filter((entry) => !(entry.type === TEXT_TYPE && !(entry.text ?? '').trim()));
    }
}

function getAliasedSegment(aliasInfo: AliasInformation, segment: string): string {
    const [path, term] = segment.split('@');
    if (term) {
        return `${path}@${toAliasQualifiedName(term, aliasInfo)}`;
    } else if (segment.indexOf('.') > -1) {
        return toAliasQualifiedName(segment, aliasInfo);
    } else {
        return segment;
    }
}

function getAliasedPath(aliasInfo: AliasInformation, path: PathValue): PathValue {
    return path
        .split('/')
        .map((segment) => getAliasedSegment(aliasInfo, segment))
        .join('/');
}
