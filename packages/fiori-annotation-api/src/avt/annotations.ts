import type {
    Attribute,
    TargetPath,
    Element,
    Namespace,
    AnnotationFile,
    Reference,
    TextNode
} from '@sap-ux/odata-annotation-core-types';
import { Edm, ELEMENT_TYPE, TEXT_TYPE } from '@sap-ux/odata-annotation-core-types';
import type {
    AnnotationList,
    AnnotationRecord,
    Apply,
    Collection,
    Expression,
    PropertyValue,
    RawAnnotation
} from '@sap-ux/vocabularies-types';
import { parsePath, toFullyQualifiedPath, toFullyQualifiedName, parseIdentifier } from '@sap-ux/odata-annotation-core';

/**
 * Represents annotation file content for a specific target
 */
export interface TargetAnnotations {
    /**
     * Path identifying the targeted metadata element (e.g. <namespace>.<EntityType>/<PropertyName> )
     */
    target: TargetPath;
    annotations: RawAnnotation[]; // generated type!! It is assumed that no introspection is required to interpret the content!
}

export interface NamespaceMap {
    // also add entries for namespaces to facilitate alias to namespace conversion
    [aliasOrNamespace: string]: Namespace;
}

/**
 * Convert annotation files to AVT parser format.
 *
 * @param file Annotation file
 * @returns A list of annotations defined in the annotation file.
 */
export function convertAnnotationFile(file: AnnotationFile): AnnotationList[] {
    const annotations: AnnotationList[] = [];
    const namespaceMap = getNamespaceMap(file.references);
    Object.freeze(namespaceMap);
    for (const target of file.targets) {
        const terms: RawAnnotation[] = [];
        const targetNamespaceMap = { ...namespaceMap, [target.namespace]: target.namespace };
        if (target.alias) {
            targetNamespaceMap[target.alias] = target.namespace;
        }
        for (const term of target.terms) {
            terms.push(convertAnnotation(targetNamespaceMap, target.name, term));
        }
        annotations.push({
            target: resolvePath(targetNamespaceMap, target.namespace, target.name),
            annotations: terms
        });
    }
    return annotations;
}

function getNamespaceMap(references: Reference[]): NamespaceMap {
    const namespaceMap: NamespaceMap = {};
    for (const reference of references) {
        namespaceMap[reference.name] = reference.name;
        if (reference.alias) {
            namespaceMap[reference.alias] = reference.name;
        }
    }

    return namespaceMap;
}

function convertAnnotation(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    annotationElement: Element
): RawAnnotation {
    const termAttributeValue = getAttributeValue('Term', annotationElement);
    const term = parseIdentifier(termAttributeValue);

    const qualifier = getAttributeValue('Qualifier', annotationElement);

    const value = convertExpression(namespaceMap, currentNamespace, annotationElement);
    const annotation: RawAnnotation = {
        term: toFullyQualifiedName(namespaceMap, '', term) ?? termAttributeValue,
        value
    };
    if (qualifier) {
        annotation.qualifier = qualifier;
    }
    if (annotation.value?.type === 'Record') {
        annotation.record = annotation.value.Record;
        delete annotation.value;
    } else if (annotation.value?.type === 'Collection') {
        annotation.collection = annotation.value.Collection;
        delete annotation.value;
    } else if (annotation.value?.type === 'Unknown' && Object.keys(annotation.value).length === 1) {
        delete annotation.value; // did not appear in parseEdmx output
    }
    const embeddedAnnotations = getEmbeddedAnnotationsFromInternal(namespaceMap, currentNamespace, annotationElement);
    if (embeddedAnnotations && embeddedAnnotations.length) {
        annotation.annotations = embeddedAnnotations;
    }
    return annotation as RawAnnotation;
}

function getEmbeddedAnnotationsFromInternal(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    element: Element
): RawAnnotation[] {
    return (element.content ?? [])
        .filter((child): child is Element => child.type === ELEMENT_TYPE && child.name === Edm.Annotation)
        .map((embeddedAnnotation) => convertAnnotation(namespaceMap, currentNamespace, embeddedAnnotation));
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

function convertExpression(namespaceMap: NamespaceMap, currentNamespace: string, element: Element): Expression {
    const expressionValues: Expression[] = [];

    // check if element itself represents the value
    if (EXPRESSION_TYPES.has(element.name)) {
        expressionValues.push(convertExpressionValue(namespaceMap, currentNamespace, element));
    }

    // check if value is provided as attribute
    for (const attributeName of Object.keys(element.attributes)) {
        if (EXPRESSION_TYPES.has(attributeName)) {
            const attribute = getElementAttribute(attributeName, element);
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
        expressionValues.push(convertExpressionValue(namespaceMap, currentNamespace, child));
    }

    const expression = expressionValues[0];
    return expression;
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
                Int: parseInt(value, 10)
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
 * @param element - is supposed to represent a value of an expression
 * @param namespaceMap
 * @returns
 */
function convertExpressionValue(namespaceMap: NamespaceMap, currentNamespace: string, element: Element): Expression {
    switch (element.name) {
        case 'Collection':
            return {
                type: 'Collection',
                Collection: convertCollection(namespaceMap, currentNamespace, element)
            };
        case 'Record':
            return {
                type: 'Record',
                Record: convertRecord(namespaceMap, currentNamespace, element)
            };
        case 'Apply':
            return {
                type: 'Apply',
                Apply: convertApplyFromInternal(namespaceMap, currentNamespace, element)
            };
        default:
            const singleTextNode = getSingleTextNode(element);
            const value = singleTextNode?.text ?? '';

            return createExpression(namespaceMap, currentNamespace, element.name, value);
    }
}

function convertRecord(namespaceMap: NamespaceMap, currentNamespace: string, recordElement: Element): AnnotationRecord {
    const type = getAttributeValue('Type', recordElement);
    let resolvedRecordType: string | undefined;

    if (type) {
        const parsedIdentifier = parseIdentifier(type);
        resolvedRecordType = toFullyQualifiedName(namespaceMap, '', parsedIdentifier);
    }

    const propertyValues = (recordElement.content || [])
        .filter((child): child is Element => child.type === ELEMENT_TYPE && child.name === Edm.PropertyValue)
        .map((propValueChild: Element) => {
            const name = getAttributeValue('Property', propValueChild);
            const propertyValue: PropertyValue = {
                name,
                value: convertExpression(namespaceMap, currentNamespace, propValueChild)
            };
            const annotations = getEmbeddedAnnotationsFromInternal(namespaceMap, currentNamespace, propValueChild);
            if (annotations && annotations.length) {
                propertyValue.annotations = annotations;
            }
            if (propertyValue.value.type === 'Unknown' && Object.keys(propertyValue.value).length === 1) {
                propertyValue.value = { type: 'Bool', Bool: true }; // presumably boolean property with default value true
            }
            return propertyValue;
        });
    const record: AnnotationRecord = { propertyValues };

    if (resolvedRecordType) {
        record.type = resolvedRecordType;
    }
    const annotations = getEmbeddedAnnotationsFromInternal(namespaceMap, currentNamespace, recordElement);
    if (annotations && annotations.length) {
        record.annotations = annotations;
    }

    return record;
}

function convertCollection(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    collectionElement: Element
): Collection {
    const collection: Collection = (collectionElement.content || [])
        .filter((child): child is Element => child.type === ELEMENT_TYPE)
        .map((collectionEntryElement: Element) => {
            const value = convertExpression(namespaceMap, currentNamespace, collectionEntryElement);
            let entry = value as any;
            if (value && value.type) {
                // record and string can be used directly as collection entries
                if (value.type === 'Record') {
                    entry = value.Record;
                } else if (value.type === 'String') {
                    entry = value.String;
                }
            }
            return entry;
        });
    return collection;
}

function convertApplyFromInternal(namespaceMap: NamespaceMap, currentNamespace: string, element: Element): Apply {
    // use internal representation (without alias) to represent Apply value
    const clone: Element = JSON.parse(JSON.stringify(element));
    return replaceAliasInElement(namespaceMap, currentNamespace, clone);
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
    for (const subNode of result.content) {
        if (subNode.type === ELEMENT_TYPE) {
            replaceAliasInElement(namespaceMap, currentNamespace, subNode);
        } else if (subNode.type === TEXT_TYPE) {
            const text = subNode.text;
            if (result.name === 'EnumMember') {
                subNode.text = resolveEnumMemberValue(namespaceMap, currentNamespace, text);
            } else if (subNode.type === TEXT_TYPE && result.name.endsWith('Path')) {
                subNode.text = resolvePath(namespaceMap, currentNamespace, text);
            }
        }
    }
    return result;
}

function resolvePath(namespaceMap: NamespaceMap, currentNamespace: string, path: string): string {
    const parsedPath = parsePath(path);
    return toFullyQualifiedPath(namespaceMap, currentNamespace, parsedPath);
}

function resolveEnumMemberValue(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    enumMemberString: string
): string {
    return enumMemberString
        .split(' ')
        .map((enumMember) => resolvePath(namespaceMap, currentNamespace, enumMember))
        .join(' ');
}

function getElementAttribute(name: string, element: Element): Attribute | undefined {
    return element.attributes && element.attributes[name];
}

function getAttributeValue(name: string, element: Element): string {
    return getElementAttribute(name, element)?.value ?? '';
}
/**
 * Get text node content of an element.
 * Elements content is supposed to only contain 'Annotation' tags or single text node.
 *
 * @param element
 * @returns TextNode
 */
function getSingleTextNode(element: Element): TextNode | undefined {
    let isInvalid = false;
    let firstTextNode: TextNode | undefined;
    for (const node of element.content ?? []) {
        if (!isInvalid) {
            if (node.type === ELEMENT_TYPE && node.name !== Edm.Annotation) {
                isInvalid = true; // child element which is not 'Annotation'
            } else if (node.type === TEXT_TYPE && !isEmptyText(node.text)) {
                if (firstTextNode) {
                    isInvalid = true; // second text node
                } else {
                    firstTextNode = node;
                }
            }
        }
    }
    return isInvalid ? undefined : firstTextNode;
}

function isEmptyText(text: string | undefined): boolean {
    return (text ?? '').replace(/[\n\t\s]/g, '').length === 0;
}
