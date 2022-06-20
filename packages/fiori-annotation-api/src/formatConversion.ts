import type {
    Attribute,
    Target,
    TargetPath,
    Element,
    Namespace,
    Alias,
    QualifiedName,
    FullyQualifiedTypeName,
    FullyQualifiedName,
    Name,
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
    CollectionExpression,
    Expression,
    PropertyValue,
    RawAnnotation
} from '@sap-ux/vocabularies-types';

/**
 * Represents annotation file content for a specific target
 */
export interface TargetAnnotations {
    target: TargetPath; // path identifying the targeted metadata element (e.g. <namespace>.<EntityType>/<PropertyName> )
    annotations: RawAnnotation[]; // generated type!! It is assumed that no introspection is required to interpret the content!
}

/**
 * Represents annotation file content for a specific target with origin information
 */
export interface TargetAnnotationsWithOrigins extends TargetAnnotations {
    origins: Range[]; // origins for annotations (look for same index)
}

/**
 * Types for adding more origin information to annotations
 * (all added properties are optional so these types can also be used when no origin information shall be added)
 */
export interface AnnotationWithOrigin extends RawAnnotation {
    origin?: Range; // new: range of annotation (for non embedded annotations this is also contained in TargetAnnotationsWithOrigins.origins)
    collectionOrigins?: Range[]; // new: ranges of entries in Annotation.collection (if present)
    record?: RecordWithOrigins; // extend existing property with origin information
    annotations?: AnnotationWithOrigin[]; // extend existing property with origin information
}

export interface CollectionExpressionWithOrigins extends CollectionExpression {
    collectionOrigins?: Range[]; // new: ranges of collection entries when Collection is used as expression
}
export interface RecordWithOrigins extends AnnotationRecord {
    propertyValuesOrigins?: Range[]; // new: ranges of propertyValues
    annotations?: AnnotationWithOrigin[]; // extend existing property with origin information
}

/**
 * Convert annotation files to AVT parser format.
 *
 * @param targets
 * @param aliasInfo
 */
export function convertAnnotationFile(file: AnnotationFile): AnnotationList[] {
    const annotations: AnnotationList[] = [];
    const aliasMap = getAliasMap(file.references);
    for (const target of file.targets) {
        const terms: RawAnnotation[] = [];
        for (const term of target.terms) {
            terms.push(convertAnnotationFromInternal(term, aliasMap));
        }
        annotations.push({
            target: resolvePath(target.name, aliasMap),
            annotations: terms
        });
    }
    return annotations;
}

function getAliasMap(references: Reference[]): AliasMap {
    const aliasMap: AliasMap = {};
    for (const reference of references) {
        aliasMap[reference.name] = reference.name;
        if (reference.alias) {
            aliasMap[reference.alias] = reference.name;
        }
    }

    return aliasMap;
}

function convertAnnotationFromInternal(annotationElement: Element, aliasMap: AliasMap): RawAnnotation {
    const resolvedTerm = resolveName(getAttributeValue('Term', annotationElement), aliasMap);
    const qualifier = getAttributeValue('Qualifier', annotationElement);

    const value = convertExpressionFromInternal(annotationElement, aliasMap);
    const annotation: RawAnnotation = {
        term: resolvedTerm.qName,
        value
    };
    if (qualifier) {
        annotation.qualifier = qualifier;
    }
    if (annotation.value?.type === 'Record') {
        annotation.record = annotation.value.Record as RecordWithOrigins;
        delete annotation.value;
    } else if (annotation.value?.type === 'Collection') {
        annotation.collection = annotation.value.Collection;
        delete annotation.value;
    } else if (annotation.value?.type === 'Unknown' && Object.keys(annotation.value).length === 1) {
        delete annotation.value; // did not appear in parseEdmx output
    }
    const embeddedAnnotations = getEmbeddedAnnotationsFromInternal(annotationElement, aliasMap);
    if (embeddedAnnotations && embeddedAnnotations.length) {
        annotation.annotations = embeddedAnnotations;
    }
    return annotation as RawAnnotation;
}

function getEmbeddedAnnotationsFromInternal(element: Element, aliasMap: AliasMap): RawAnnotation[] {
    return (element.content ?? [])
        .filter((child): child is Element => child.type === ELEMENT_TYPE && child.name === Edm.Annotation)
        .map((embeddedAnnotation) => {
            return convertAnnotationFromInternal(embeddedAnnotation, aliasMap);
        });
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

/**
 * convert element of generic annotation format to expression
 * @param element - is supposed to represent an expression
 * @param aliasInfo
 */
function convertExpressionFromInternal(element: Element, aliasMap: AliasMap): Expression {
    const expressionValues: Expression[] = [];

    // check if element itself represents the value
    if (EXPRESSION_TYPES.has(element.name)) {
        expressionValues.push(convertExpressionValueFromInternal(element, aliasMap));
    }

    // check if value is provided as attribute
    for (const attributeName of Object.keys(element.attributes)) {
        if (EXPRESSION_TYPES.has(attributeName)) {
            const attribute = getElementAttribute(attributeName, element);
            if (attribute) {
                expressionValues.push(convertExpression(attribute.name, attribute.value, aliasMap));
            }
        }
    }

    // check if value is provided as sub node
    const children = (element.content ?? []).filter(
        (child): child is Element => child.type === ELEMENT_TYPE && EXPRESSION_TYPES.has(child.name)
    );

    for (const child of children) {
        expressionValues.push(convertExpressionValueFromInternal(child, aliasMap));
    }
    if (expressionValues.length > 1) {
        // TODO: handle error
        //throw new Error(`Too many expressions defined on a single object ${JSON.stringify(expression)}`);
    }
    const expression = expressionValues[0];
    return expression;
}

function convertExpression(name: string, value: string, aliasMap: AliasMap): Expression {
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
                Path: resolvePath(value, aliasMap)
            };
        case 'PropertyPath':
            return {
                type: 'PropertyPath',
                PropertyPath: resolvePath(value, aliasMap)
            };
        case 'AnnotationPath':
            return {
                type: 'AnnotationPath',
                AnnotationPath: resolvePath(value, aliasMap)
            };
        case 'NavigationPropertyPath':
            return {
                type: 'NavigationPropertyPath',
                NavigationPropertyPath: resolvePath(value, aliasMap)
            };
        case 'EnumMember':
            return {
                type: 'EnumMember',
                EnumMember: resolveEnumMemberValue(value, aliasMap)
            };
        case 'Null':
            return {
                type: 'Null'
            };
        default:
            console.error('Unsupported inline expression type ' + name);
            return {
                type: 'Unknown'
            };
    }
}

/**
 * convert expression value from internal
 *  - value for an expression can be primitive or non primitive (AnnotationRecord, Collection, Apply)
 *  - all primitive values are returned in their stringified version
 * @param element - is supposed to represent a value of an expression
 * @param aliasMap
 * @returns
 */
function convertExpressionValueFromInternal(element: Element, aliasMap: AliasMap): Expression {
    switch (element.name) {
        case 'Collection':
            return {
                type: 'Collection',
                Collection: convertCollectionFromInternal(element, aliasMap)
            };
        case 'Record':
            return {
                type: 'Record',
                Record: convertRecordFromInternal(element, aliasMap)
            };
        case 'Apply':
            return {
                type: 'Apply',
                Apply: convertApplyFromInternal(element, aliasMap)
            };
        default:
            const singleTextNode = getSingleTextNode(element);
            const value = singleTextNode?.text ?? '';

            return convertExpression(element.name, value, aliasMap);
    }
}

function convertRecordFromInternal(recordElement: Element, aliasMap: AliasMap): AnnotationRecord {
    const type = getAttributeValue('Type', recordElement);
    let resolvedRecordType: string | undefined;

    if (type) {
        resolvedRecordType = resolveName(type, aliasMap).qName;
    }

    const propertyValues = (recordElement.content || [])
        .filter((child): child is Element => child.type === ELEMENT_TYPE && child.name === Edm.PropertyValue)
        .map((propValueChild: Element) => {
            const name = getAttributeValue('Property', propValueChild);
            const propertyValue: PropertyValue = {
                name,
                value: convertExpressionFromInternal(propValueChild, aliasMap)
            };
            const annotations = getEmbeddedAnnotationsFromInternal(propValueChild, aliasMap);
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
    const annotations = getEmbeddedAnnotationsFromInternal(recordElement, aliasMap);
    if (annotations && annotations.length) {
        record.annotations = annotations;
    }

    return record;
}

function convertCollectionFromInternal(collectionElement: Element, aliasMap: AliasMap): Collection {
    const collection: Collection = (collectionElement.content || [])
        .filter((child): child is Element => child.type === ELEMENT_TYPE)
        .map((collectionEntryElement: Element) => {
            const value = convertExpressionFromInternal(collectionEntryElement, aliasMap);
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

function convertApplyFromInternal(element: Element, aliasMap: AliasMap): Apply {
    // use internal representation (without alias) to represent Apply value
    const clone: Element = JSON.parse(JSON.stringify(element));
    return replaceAliasInElement(clone, aliasMap);
}

function replaceAliasInElement(element: Element, aliasMap: AliasMap): Element {
    const result = element;
    // replace aliased in all attributes/sub nodes with full namespaces (reverse = true ? vice versa):
    // in attributes: term or type attributes, enumValue and any path values provided as attributes
    Object.keys(result.attributes || {}).forEach((attributeName) => {
        const attribute = result.attributes[attributeName];
        if (attributeName === Edm.Term || attributeName === 'Type') {
            attribute.value = resolveName(attribute.value, aliasMap)?.qName;
        } else if (attributeName === 'EnumMember') {
            attribute.value = resolveEnumMemberValue(attribute.value, aliasMap);
        } else if (attributeName.endsWith('Path')) {
            attribute.value = resolvePath(attribute.value, aliasMap);
        }
    });
    if ((result.content || []).some((entry) => entry.type === ELEMENT_TYPE)) {
        // sub elements present: filter out empty text nodes
        result.content = result.content.filter((entry) => !(entry.type === TEXT_TYPE && !(entry.text || '').trim()));
    }
    // in sub nodes
    for (const subNode of result.content) {
        if (subNode.type === ELEMENT_TYPE) {
            replaceAliasInElement(subNode, aliasMap);
        } else if (subNode.type === TEXT_TYPE) {
            const text = subNode.text;
            if (result.name === 'EnumMember') {
                subNode.text = resolveEnumMemberValue(text, aliasMap);
            } else if (subNode.type === TEXT_TYPE && result.name.endsWith('Path')) {
                subNode.text = resolvePath(text, aliasMap);
            }
        }
    }
    return result;
}

function resolvePath(path: string, aliasMap: AliasMap): string {
    const segments = path.split('/');
    const segmentsNoAlias = segments.map((segment: string) => getSegmentWithoutAlias(aliasMap, segment));
    return segmentsNoAlias.join('/');
}

/**
 * get segment without alias
 * @param aliasInfo
 * @param segment
 */
function getSegmentWithoutAlias(aliasMap: AliasMap, segment: string): string {
    let segmentWithoutAlias = '';
    const indexAt = segment.indexOf('@');
    if (indexAt >= 0) {
        const term = resolveName(segment.substr(indexAt + 1), aliasMap).qName;
        segmentWithoutAlias = segment.substr(0, indexAt) + '@' + term;
    } else if (segment.indexOf('.') > -1) {
        segmentWithoutAlias = resolveName(segment, aliasMap).qName;
    } else {
        segmentWithoutAlias = segment;
    }

    return segmentWithoutAlias;
}

function resolveEnumMemberValue(enumMemberString: string, aliasMap: AliasMap): string {
    const enumMembers = enumMemberString.split(' ');
    const enumMembersNoAlias = enumMembers.map((enumMember) => resolvePath(enumMember, aliasMap));
    return enumMembersNoAlias.join(' ');
}

function getAliasQualifiedName(qualifiedName: QualifiedName, aliasInfo: AliasInformation): FullyQualifiedName {
    const resolvedName = resolveName(qualifiedName, aliasInfo.aliasMap);
    const alias = resolvedName.namespace ? aliasInfo.reverseAliasMap[resolvedName.namespace] : undefined;
    let aliasQualifiedName = alias ? `${alias}.${resolvedName.name}` : qualifiedName;
    const indexFirstBracket = aliasQualifiedName.indexOf('(');
    if (indexFirstBracket > -1) {
        // handle signature of overloads: <SchemaNamespaceOrAlias>.<SimpleIdentifierOrPath>(<FunctionOrActionSignature>)
        const beforeBracket = aliasQualifiedName.slice(0, indexFirstBracket);
        const bracketContent = aliasQualifiedName.slice(indexFirstBracket + 1, aliasQualifiedName.lastIndexOf(')'));
        let bracketEntries = bracketContent.split(',');
        bracketEntries = bracketEntries.map((qName: string) => getAliasQualifiedName(qName, aliasInfo));
        aliasQualifiedName = beforeBracket + '(' + bracketEntries.join(',') + ')';
    }
    return aliasQualifiedName;
}

function getAliasedEnumMember(result: string, aliasInfo: AliasInformation): string {
    return result
        .split(' ')
        .map((enumMember) => getAliasQualifiedName(enumMember, aliasInfo))
        .join(' ');
}

/**
 * get aliased path
 * - replaces all namespaces (having aliases) in path and replaces them with alias
 *
 * @param path
 * @param aliasInfo
 */
export function getAliasedPath(path: string, aliasInfo: AliasInformation): string {
    function getAliasedSegment(aliasInfo: AliasInformation, segment: string): string {
        let segmentWitAlias = '';
        const indexAt = segment.indexOf('@');
        if (indexAt >= 0) {
            const term = getAliasQualifiedName(segment.substr(indexAt + 1), aliasInfo);
            segmentWitAlias = segment.substr(0, indexAt) + '@' + term;
        } else if (segment.indexOf('.') > -1) {
            segmentWitAlias = getAliasQualifiedName(segment, aliasInfo);
        } else {
            segmentWitAlias = segment;
        }
        return segmentWitAlias;
    }
    return path
        .split('/')
        .map((segment) => getAliasedSegment(aliasInfo, segment))
        .join('/');
}

export function getElementAttribute(name: string, element: Element): Attribute | undefined {
    return element.attributes && element.attributes[name];
}

export function getAttributeValue(name: string, element: Element): string {
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

/**
 * generic context used in value handling (check/completion of annotation values)
 */
export interface AliasMap {
    // also add entries for namespaces to facilitate alias to namespace conversion
    [aliasOrNamespace: string]: Namespace;
}

export interface AliasInformation {
    currentFileNamespace: Namespace;
    currentFileAlias?: Alias;
    aliasMap: AliasMap;
    reverseAliasMap: { [namespace: string]: Alias | Namespace }; // if no alias available: use namespace
    aliasMapMetadata: AliasMap;
    aliasMapVocabulary: AliasMap;
}

interface ResolvedName {
    namespace?: Namespace;
    alias?: Alias;
    name: Name;
    qName: FullyQualifiedName;
}

// TODO: remove duplicate implementation
function resolveName(qualifiedName: QualifiedName, aliasMap?: AliasMap): ResolvedName {
    // qualifiedName has the form "<SchemaNamespaceOrAlias>.<SimpleIdentifierOrPath>[(<FunctionOrActionSignature>)])"
    // SchemaNamespace and FunctionOrActionSignature can contain ".", SimpleIdentifierOrPath should not contain dots
    const resolvedName: ResolvedName = { name: qualifiedName, qName: qualifiedName };
    if (qualifiedName && typeof qualifiedName === 'string' && qualifiedName.indexOf('.')) {
        const indexFirstBracket = qualifiedName.indexOf('(');
        const nameBeforeBracket = indexFirstBracket > -1 ? qualifiedName.slice(0, indexFirstBracket) : qualifiedName;
        const parts = nameBeforeBracket.trim().split('.');
        const name = parts.pop() || '';
        const namespace = parts.join('.');
        if (aliasMap) {
            if (aliasMap[namespace]) {
                // valid namespace
                if (aliasMap[namespace] && aliasMap[namespace] !== namespace) {
                    resolvedName.alias = namespace;
                    resolvedName.namespace = aliasMap[namespace];
                } else {
                    resolvedName.namespace = namespace;
                }
                resolvedName.name = name;
                resolvedName.qName = resolvedName.namespace + '.' + name;
            }
        } else {
            resolvedName.name = name;
            resolvedName.namespace = namespace;
        }
        if (indexFirstBracket > -1) {
            const bracketContent = qualifiedName.slice(indexFirstBracket + 1, qualifiedName.lastIndexOf(')'));
            resolvedName.name += '(' + bracketContent + ')';
            if (aliasMap && aliasMap[namespace]) {
                const bracketEntries = bracketContent.split(',');
                const bracketEntriesResolved = bracketEntries.map((qualifiedTypeName) => {
                    const valueType = convertValueTypeFromString(qualifiedTypeName);
                    valueType.name = resolveName(valueType.name, aliasMap).qName;
                    return convertValueTypeToString(valueType);
                });
                resolvedName.qName += '(' + bracketEntriesResolved.join(',') + ')';
            }
        }
    }

    return resolvedName;
}

interface AllowedValues {
    value: any;
    description: string;
    longDescription: string;
}

function convertValueTypeFromString(type: FullyQualifiedTypeName): ValueType {
    type = type || '';
    const valueType: ValueType = { name: type.trim() };
    valueType.asCollection = type.startsWith('Collection(');
    if (valueType.asCollection) {
        valueType.name = valueType.name.slice(11, -1);
    }
    return valueType;
}

function convertValueTypeToString(valueType: ValueType): FullyQualifiedTypeName {
    return valueType && valueType.asCollection ? 'Collection(' + valueType.name + ')' : valueType.name || '';
}

interface Facets {
    isNullable?: boolean; // source: $Nullable; whether the property can have the value null
    // $MaxLength; maximum length of a binary, stream or string value; no usage in supported vocabularies
    precision?: number; // source: $Precision, for a decimal value: the maximum number of significant decimal digits..
    // ..for a temporal value (e.g. time of dat): the number of decimal places allowed in the seconds
    // $Scale; maximum number of digits allowed to the right.. ; no usage in supported vocabularies
    // $SRID: no usage in supported vocabularies
    // $Unicode; applicable to string values; no usage in supported vocabularies
}

interface ValueType {
    name: FullyQualifiedName; // fully qualified name of type
    asCollection?: boolean;
    facets?: Facets;
    constraints?: Constraints;
}

interface Constraints {
    // ------ validation vocabulary--------
    // pattern: string; // regular expression applied to string value (Property or Term) - only in Core.LocalDateTime
    // minimum: number; // minimum value (Property or Term) - only used in DataModificationExceptionType.responseCode
    // maximum: number; // maximum value (Property or Term) - only used in DataModificationExceptionType.responseCode
    allowedValues?: AllowedValues[]; // valid values (Property or Term)
    openPropertyTypeConstraints?: FullyQualifiedTypeName[]; // used in UI vocabulary
    allowedTerms?: FullyQualifiedTypeName[]; // restrict terms allowed for annotation path (Property or Term)
    // ApplicableTerms?  Names of specific terms that are applicable and may be applied in the current context
    // MaxItems, MinItems: no usage in supported vocabularies
    derivedTypeConstraints?: FullyQualifiedTypeName[]; // listed sub types (and their subtypes) (Property only!)
    // ------ core vocabulary--------
    // isURL? Can we check this ?
    isLanguageDependent?: boolean; // string value is language dependent (Property or Term)
    // term can only be applied to elements of this type/subType (Term)
    // applies to says it's only used for terms, but properties use it too, e.g. RecursiveHierarchyType.IsLeafProperty
    requiresType?: FullyQualifiedName;
    // ------common vocabulary------------
    // IsUpperCase: no usage in supported vocabularies
    // MinOccurs: no usage in supported vocabularies
    // MaxOccurs: no usage in supported vocabularies
    // ------ communication vocabulary----
    // isEmailAddress: boolean;  no usage in supported vocabularies
    // isPhoneNumber: boolean;  no usage in supported vocabularies
}
