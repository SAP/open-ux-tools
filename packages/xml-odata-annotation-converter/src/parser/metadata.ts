import type { XMLDocument, XMLElement } from '@xml-tools/ast';

import type {
    MetadataElementProperties,
    MetadataElement,
    TargetKind,
    ReferentialConstraint,
    Facets
} from '@sap-ux/odata-annotation-core-types';
import type { FullyQualifiedTypeName, FullyQualifiedName } from '@sap-ux/odata-annotation-core';
import { toFullyQualifiedName, parseIdentifier, Edm, Location, Edmx } from '@sap-ux/odata-annotation-core';

import { getAttributeValue, getElementAttributeByName } from './attribute-getters';
import { transformElementRange } from './range';
import { getElementsWithName } from './element-getters';

const EDMX_METADATA_ELEMENT_NAMES = new Set<string>([
    Edm.Schema,
    Edm.EntityType,
    Edm.ComplexType,
    Edm.Property,
    Edm.NavigationProperty,
    Edm.EntityContainer,
    Edm.EntitySet,
    Edm.Singleton,
    Edm.Function,
    Edm.Action,
    Edm.FunctionImport,
    Edm.ActionImport,
    Edm.Parameter,
    Edm.ReturnType
]);

const ENTITY_TYPE_NAMES = new Set<string>([Edm.EntityType, Edm.Singleton, Edm.EntitySet, Edm.NavigationProperty]);
const STRUCTURED_TYPE_NAMES = new Set<string>([
    Edm.Singleton,
    Edm.EntitySet,
    Edm.NavigationProperty,
    Edm.ActionImport,
    Edm.FunctionImport
]);
const METADATA_ROOT_TYPE_NAMES = new Set<string>([
    Edm.EntityType,
    Edm.ComplexType,
    Edm.Function,
    Edm.Action,
    Edm.EntityContainer
]);

const PARAMETER_TYPE_NAMES = new Set<string>([Edm.Property, Edm.ReturnType, Edm.Parameter]);

const EDM_ENTITY_TYPE = 'Edm.EntityType';
const EDM_COMPLEX_TYPE = 'EDM_COMPLEX_TYPE';

interface AssociationMap {
    [key: string]: AssociationData;
}
interface AssociationRole {
    type: FullyQualifiedName;
    multiplicity: string;
}
interface AssociationData {
    [role: string]: AssociationRole;
}

interface Context {
    aliasMap: NamespaceMap;
    typeMap: TypeMap;
    associationMap: AssociationMap;
    namespace: string;
    parentPath: string;
    parent?: MetadataElement;
    uri: string;
}

/**
 * Traverses the XML document and collects metadata element definitions.
 *
 * @param uri Uri of the document.
 * @param document XML document containing metadata.
 * @returns an array of MetadataElements extracted from the XML document.
 */
export function convertMetadataDocument(uri: string, document: XMLDocument): MetadataElement[] {
    const root = document.rootElement;
    if (!root) {
        return [];
    }
    const aliasMap = getNamespaceMap(root);
    const dataServices = getElementsWithName(Edmx.DataServices, root);
    const schemas = dataServices.length ? getElementsWithName(Edm.Schema, dataServices[0]) : [];
    const metadataElements: MetadataElement[] = [];
    for (const schema of schemas) {
        convertSchema(schema, aliasMap, uri, metadataElements);
    }
    return metadataElements;
}

/**
 * Collects metadata element definitions from given schema.
 *
 * @param schema schema element
 * @param aliasMap alias map
 * @param uri Uri of the document
 * @param metadataElements metadata element collector array
 */
function convertSchema(
    schema: XMLElement,
    aliasMap: NamespaceMap,
    uri: string,
    metadataElements: MetadataElement[]
): void {
    const namespace = getElementAttributeByName('Namespace', schema)?.value;
    if (!namespace) {
        return;
    }
    const typeMap: TypeMap = {};
    // loop over all direct schema children and collect type information
    const currentNamespace = getAttributeValue('Namespace', schema);

    for (const element of schema.subElements) {
        const name = getAttributeValue('Name', element);
        let type = '';
        switch (element.name) {
            case Edm.TypeDefinition:
            case Edm.EnumType:
                type = getAttributeValue('UnderlyingType', element) || 'Edm.Int32';
                break;
            case Edm.EntityType:
                type = EDM_ENTITY_TYPE;
                break;
            case Edm.ComplexType:
                type = EDM_COMPLEX_TYPE;
                break;
            default:
        }
        if (name && type) {
            typeMap[currentNamespace + '.' + name] = type;
        }
    }

    const associationMap: AssociationMap = {};
    const associations = getElementsWithName('Association', schema) ?? [];
    for (const association of associations) {
        const name = getAttributeValue('Name', association);

        if (name) {
            associationMap[name] = createAssociation(getElementsWithName('End', association), aliasMap, namespace);
        }
    }

    const context: Context = {
        namespace,
        typeMap,
        aliasMap,
        associationMap,
        parentPath: '',
        uri: uri
    };
    for (const child of schema.subElements) {
        const element = convertMetadataElement(context, child);
        if (element) {
            metadataElements.push(element);
        }
    }
}

/**
 *
 * @param context Conversion context
 * @param element Source XML element
 * @returns matching MetadataElement if it exists for the given XML element
 */
function convertMetadataElement(context: Context, element: XMLElement): MetadataElement | undefined {
    if (!element.name || !EDMX_METADATA_ELEMENT_NAMES.has(element.name)) {
        return undefined;
    }

    const metadataElement = createMetadataNode(context, element);
    if (metadataElement) {
        const sortedContentNodes = [...element.subElements].sort(
            (a, b) => a.position.startOffset - b.position.endOffset
        );
        if (!metadataElement.content) {
            metadataElement.content = [];
        }
        for (const child of sortedContentNodes) {
            const childElement = convertMetadataElement(
                {
                    ...context,
                    parent: metadataElement,
                    parentPath:
                        context.parentPath !== ''
                            ? `${context.parentPath}/${metadataElement.name}`
                            : metadataElement.name
                },
                child
            );
            if (childElement) {
                metadataElement.content?.push(childElement);
            }
        }
    }
    return metadataElement;
}

/**
 *
 * @param context Conversion context
 * @param element Source XML element
 * @returns matching MetadataElement if it exists for the given XML element
 */
function createMetadataNode(context: Context, element: XMLElement): MetadataElement | undefined {
    let typeAttrName: string;
    switch (element.name) {
        case Edm.EntitySet:
            typeAttrName = 'EntityType';
            break;
        case Edm.FunctionImport:
            typeAttrName = 'Function'; // to make FunctionImport reference the Function
            break;
        case Edm.ActionImport:
            typeAttrName = 'Action'; // to make ActionImport reference the Action
            break;
        default:
            typeAttrName = 'Type';
    }
    let type = attributeValueToFullyQualifiedName(typeAttrName, context.aliasMap, context.namespace, element);
    if (!type) {
        if (element.name === Edm.FunctionImport) {
            // OData V2: FunctionImport
            type = getAttributeValue('ReturnType', element);
        } else if (element.name === Edm.NavigationProperty) {
            // OData V2: use association information to determine Type
            type = getTypeForNavigationProperty(context, element);
        }
    }
    const forAction = element.name === Edm.Action || element.name === Edm.Function;
    return createMetadataElementNodeForType(context, element, type, forAction);
}

/**
 * Calculates type for navigation property based on association information.
 *
 * @param context context
 * @param element nav property XML element
 * @returns type or undefined
 */
function getTypeForNavigationProperty(context: Context, element: XMLElement): string | undefined {
    const relationship = attributeValueToFullyQualifiedName(
        'Relationship',
        context.aliasMap,
        context.namespace,
        element
    );
    if (!relationship) {
        return undefined;
    }
    const associationName = relationship.split('.').pop();
    if (!associationName) {
        return undefined;
    }
    const association = context.associationMap[associationName];
    if (!association) {
        return undefined;
    }
    const toRole = attributeValueToFullyQualifiedName('ToRole', context.aliasMap, context.namespace, element);
    if (!toRole) {
        return undefined;
    }
    const role = association[toRole];
    if (role?.type) {
        return role.multiplicity === '*' ? `Collection(${role.type})` : role.type;
    }
    return undefined;
}

/**
 * Get OData target kinds for a metadata kind.
 *
 * @param elementKind - element kind
 * @param isCollectionValued - collection value flag
 * @returns OData target kinds.
 */
function getEdmTargetKinds(elementKind: string, isCollectionValued = false): TargetKind[] {
    if (!elementKind) {
        return [];
    }
    const targetKinds: TargetKind[] = [];
    targetKinds.push(elementKind);
    if (elementKind === Edm.FunctionImport) {
        // vocabulary and annotation files are defined based on OData v4, but are used to annotate both OData v2 and OData v4 metadata.
        // OData v2 does not have 'Action' but only 'FunctionImport'. Map to 'Action' to support annotating 'FunctionImport' with terms targeting actions.
        targetKinds.push(Edm.Action);
    }
    if (targetKinds.includes(Edm.EntitySet) || isCollectionValued) {
        targetKinds.push(Edm.Collection);
    }
    return targetKinds;
}

/**
 * @param context Conversion context
 * @param element Source XML element
 * @param type Fully qualified type name
 * @param forAction Indicates if overloads should be checked
 * @returns matching MetadataElement if it exists for the given XML element
 */
function createMetadataElementNodeForType(
    context: Context,
    element: XMLElement,
    type: string | undefined,
    forAction = false
): MetadataElement | undefined {
    if (element.name === null) {
        return undefined;
    }

    // build metadata element
    const metadataElementProperties: MetadataElementProperties = {
        isAnnotatable: true,
        kind: element.name,
        name: getMetadataElementName(context, element, forAction),
        isCollectionValued: !!type?.startsWith('Collection(') || element.name === Edm.EntitySet,
        isComplexType: element.name === Edm.ComplexType,
        isEntityType: ENTITY_TYPE_NAMES.has(element.name ?? ''),
        targetKinds: []
    };
    const facets = getMetadataElementFacets(element);
    if (facets) {
        metadataElementProperties.facets = facets;
    }

    if (element.name === Edm.NavigationProperty) {
        const referentialConstraints = getElementsWithName(Edm.ReferentialConstraint, element) ?? [];
        metadataElementProperties.referentialConstraints = referentialConstraints.map(
            (constraint): ReferentialConstraint => {
                const property = getAttributeValue(Edm.Property, constraint);
                const referencedProperty = getAttributeValue(Edm.ReferencedProperty, constraint);
                return {
                    sourceProperty: property,
                    sourceTypeName: context.parent?.name ?? '',
                    targetProperty: referencedProperty,
                    targetTypeName: type ?? ''
                };
            }
        );
    }

    if (element.name === Edm.EntityType) {
        const keys = getKeys(element);
        if (keys?.length) {
            metadataElementProperties.keys = keys;
        }
    }
    const targetKinds = getEdmTargetKinds(metadataElementProperties.kind, metadataElementProperties.isCollectionValued);
    metadataElementProperties.targetKinds.push(...targetKinds);

    // adjust metadata element based on type information
    const functionImportV2Nodes: MetadataElement[] =
        adjustMetadataElement(context, element, type, metadataElementProperties) ?? [];

    const v2ActionFor = attributeValueToFullyQualifiedName(
        'sap:action-for',
        context.aliasMap,
        context.namespace,
        element
    );

    if (Edm.FunctionImport === element.name && v2ActionFor) {
        // generate binding parameter sub node with name '_it'
        const bindingParameterProperties: MetadataElementProperties = {
            isAnnotatable: false, // should be used in path expressions only, not as annotation target
            kind: Edm.Parameter,
            name: '_it',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: true,
            structuredType: v2ActionFor,
            targetKinds: getEdmTargetKinds(Edm.Parameter)
        };
        const attributePosition = getElementAttributeByName('sap:action-for', element)?.position;
        const bindingParameterRange = transformElementRange(attributePosition ?? element.position, element);
        functionImportV2Nodes.push({
            path: `${context.parentPath}/${metadataElementProperties.name}/${bindingParameterProperties.name}`,
            location: bindingParameterRange ? Location.create(context.uri, bindingParameterRange) : undefined,
            content: [],
            ...bindingParameterProperties
        });
    }
    const range = transformElementRange(element.position, element);
    return {
        path: context.parentPath
            ? `${context.parentPath}/${metadataElementProperties.name}`
            : metadataElementProperties.name,
        location: range ? Location.create(context.uri, range) : undefined,
        content: functionImportV2Nodes,
        ...metadataElementProperties
    };
}

/**
 * Converts string value to number.
 *
 * @param value Input
 * @returns Parsed number or undefined otherwise
 */
function stringToBoolean(value: string | undefined): boolean | undefined {
    if (value === 'true') {
        return true;
    } else if (value === 'false') {
        return false;
    }
    return undefined;
}

/**
 * Converts string value to number.
 *
 * @param value Input
 * @returns Parsed number or undefined otherwise
 */
function stringToNumber(value: string | undefined): number | undefined {
    if (value) {
        const num = Number(value);
        if (Number.isNaN(num)) {
            return undefined;
        }
        return num;
    }
    return undefined;
}
const VARIABLE_KEY_WORD = 'variable';
const FLOATING_KEY_WORD = 'floating';

/**
 * Converts string value to number or allowed key words.
 *
 * @param value Input
 * @param allowedKeyWords Allowed key words
 * @returns Parsed number, key word or undefined otherwise
 */
function stringToNumberWithKeywords(value: string | undefined, allowedKeyWords: string[]): number | string | undefined {
    if (value) {
        if (allowedKeyWords.includes(value)) {
            return value;
        }
        const num = Number(value);
        if (Number.isNaN(num)) {
            return undefined;
        }
        return num;
    }
    return undefined;
}

/**
 * Collects constraints for metadata element.
 *
 * @param element XML element
 * @returns Facets if any constraints are found, otherwise undefined
 */
function getMetadataElementFacets(element: XMLElement): Facets | undefined {
    const facets: Facets = {};

    const isNullable = stringToBoolean(getAttributeValue(Edm.Nullable, element));
    if (isNullable !== undefined) {
        facets.isNullable = isNullable;
    }

    const maxLength = stringToNumber(getAttributeValue(Edm.MaxLength, element));
    if (maxLength !== undefined) {
        facets.maxLength = maxLength;
    }

    const precision = stringToNumber(getAttributeValue(Edm.Precision, element));
    if (precision !== undefined) {
        facets.precision = precision;
    }

    const scale = stringToNumberWithKeywords(getAttributeValue(Edm.Scale, element), [
        VARIABLE_KEY_WORD,
        FLOATING_KEY_WORD
    ]);
    if (scale !== undefined) {
        facets.scale = scale;
    }
    const supportsUnicode = stringToBoolean(getAttributeValue(Edm.Unicode, element));
    if (supportsUnicode !== undefined) {
        facets.supportsUnicode = supportsUnicode;
    }

    const srid = stringToNumberWithKeywords(getAttributeValue(Edm.SRID, element), [VARIABLE_KEY_WORD]);
    if (srid !== undefined) {
        facets.srid = srid;
    }

    const defaultValue = getAttributeValue(Edm.DefaultValue, element);
    if (defaultValue) {
        facets.defaultValue = defaultValue;
    }

    if (Object.keys(facets).length === 0) {
        return undefined;
    }

    return facets;
}

/**
 * Creates metadata element name.
 *
 * @param context context
 * @param element XML element
 * @param forAction boolen flag indicating processing of action element
 * @returns metadata element name
 */
function getMetadataElementName(context: Context, element: XMLElement, forAction: boolean): string {
    // determine metadata element name
    let metadataElementName = getAttributeValue('Name', element);
    if (forAction) {
        if (element.name === Edm.Action && getAttributeValue('IsBound', element) !== 'true') {
            metadataElementName += '()'; // unbound actions do not support overloading
        } else {
            metadataElementName = getOverloadName(context, element);
        }
    }
    if (METADATA_ROOT_TYPE_NAMES.has(element.name ?? '') && context.namespace) {
        metadataElementName = context.namespace + '.' + metadataElementName;
    } else if (element.name === Edm.ReturnType) {
        metadataElementName = '$ReturnType';
    }
    return metadataElementName;
}

/**
 * Returns primitive type name based on current type and element name.
 *
 * @param typeName type name
 * @param baseTypeName base type name
 * @param elementName element name
 * @returns primitive type name
 */
function getPrimitiveTypeName(typeName: string, baseTypeName: string, elementName: string | null): string {
    let edmPrimitiveType = '';
    if (typeName.startsWith('Edm.')) {
        edmPrimitiveType = typeName; // original types namespace is Edm
    } else if (
        baseTypeName !== EDM_COMPLEX_TYPE &&
        baseTypeName !== EDM_ENTITY_TYPE &&
        elementName !== Edm.FunctionImport &&
        elementName !== Edm.ActionImport
    ) {
        // original type is defined in metadata but based on a primitive type
        edmPrimitiveType = baseTypeName;
    }
    return edmPrimitiveType;
}

/**
 * Adjusts medatata element properties and returns V2 function import md nodes (in case of FunctionImport element) or empty array.
 *
 * @param context context
 * @param element element
 * @param type type
 * @param metadataElementProperties md element properties
 * @returns V2 function import md nodes
 */
function adjustMetadataElement(
    context: Context,
    element: XMLElement,
    type: string | undefined,
    metadataElementProperties: MetadataElementProperties
): MetadataElement[] | undefined {
    /**
     *  Converts to singular type name.
     *
     * @param fqTypeName Fully qualified name for a type.
     * @returns singular type name.
     */
    function getTypeName(fqTypeName: FullyQualifiedTypeName): FullyQualifiedName {
        // links always go to entityTypes/complexTypes/functions or actions, which are defined as direct container children
        // --> use fully qualified name as path with single segment (strip Collection())
        return fqTypeName.startsWith('Collection(') ? fqTypeName.slice(11, -1) : fqTypeName;
    }

    if (!type) {
        return undefined;
    }
    const typeName = getTypeName(type);
    const baseTypeName = context.typeMap[typeName] || typeName;

    // primitive type name
    const edmPrimitiveType = getPrimitiveTypeName(typeName, baseTypeName, element.name);
    if (edmPrimitiveType && element.name !== Edm.FunctionImport) {
        metadataElementProperties.edmPrimitiveType = edmPrimitiveType;
    }

    // structured type name
    handleStructuredTypeElement(element, typeName, baseTypeName, metadataElementProperties);

    // function import
    if (Edm.FunctionImport === element.name && getAttributeValue('ReturnType', element)) {
        const functionImportV2Nodes: MetadataElement[] = [];
        const returnTypeProperties = getReturnTypeProperties(baseTypeName, type, typeName, edmPrimitiveType);
        const attributePosition = getElementAttributeByName('ReturnType', element)?.position;
        const returnRange = transformElementRange(attributePosition ?? element.position, element);
        functionImportV2Nodes.push({
            path: `${context.parentPath}/${metadataElementProperties.name}/${returnTypeProperties.name}`,
            location: returnRange ? Location.create(context.uri, returnRange) : undefined,
            content: [],
            ...returnTypeProperties
        });
        return functionImportV2Nodes;
    }
    return undefined;
}

/**
 *
 * @param element
 * @param typeName
 * @param baseTypeName
 * @param metadataElementProperties
 */
function handleStructuredTypeElement(
    element: XMLElement,
    typeName: string,
    baseTypeName: string,
    metadataElementProperties: MetadataElementProperties
) {
    if (
        STRUCTURED_TYPE_NAMES.has(element.name ?? '') &&
        !getAttributeValue('ReturnType', element) // exclude V2 FunctionImports
    ) {
        // type name contains reference to entityType, function or action
        metadataElementProperties.structuredType = typeName;
    } else if (PARAMETER_TYPE_NAMES.has(element.name ?? '')) {
        // handle property, parameter or returnType based on entity or complex type
        if (baseTypeName === EDM_COMPLEX_TYPE) {
            metadataElementProperties.isComplexType = true;
            metadataElementProperties.structuredType = typeName;
        } else if (baseTypeName === EDM_ENTITY_TYPE) {
            metadataElementProperties.isEntityType = true;
            metadataElementProperties.structuredType = typeName;
        }
    }
}

/**
 *
 * @param baseTypeName
 * @param type
 * @param typeName
 * @param edmPrimitiveType
 * @returns
 */
function getReturnTypeProperties(
    baseTypeName: string,
    type: string,
    typeName: string,
    edmPrimitiveType: string
): MetadataElementProperties {
    // FunctionImport in Data V2: type contains ReturnType attribute - build sub node for it
    const isCollectionValued = type.startsWith('Collection(');
    const returnTypeProperties: MetadataElementProperties = {
        isAnnotatable: true,
        kind: Edm.ReturnType,
        name: '$ReturnType',
        isCollectionValued,
        isComplexType: baseTypeName === EDM_COMPLEX_TYPE,
        isEntityType: baseTypeName === EDM_ENTITY_TYPE,
        targetKinds: getEdmTargetKinds(Edm.ReturnType, isCollectionValued)
    };

    if (edmPrimitiveType) {
        returnTypeProperties.edmPrimitiveType = edmPrimitiveType;
    }
    if ([EDM_ENTITY_TYPE, EDM_COMPLEX_TYPE].includes(baseTypeName)) {
        returnTypeProperties.structuredType = typeName;
    }
    return returnTypeProperties;
}

/**
 * Returns overload name.
 *
 * @param context Conversion context
 * @param element Source XML element
 * @returns matching MetadataElement if it exists for the given XML element
 */
function getOverloadName(context: Context, element: XMLElement): string {
    // generate overload name MyFunction(MySchema.MyBindingParamType,First.NonBinding.ParamType)
    const name = getAttributeValue('Name', element);
    let parameterSubElements = element.subElements.filter(
        (subElement: XMLElement) => subElement.name === Edm.Parameter
    );
    if (element.name === Edm.Action) {
        parameterSubElements = parameterSubElements.slice(0, 1);
    }
    const parameterTypes = parameterSubElements.map((parameterElement: XMLElement) =>
        attributeValueToFullyQualifiedName('Type', context.aliasMap, context.namespace, parameterElement)
    );
    return name + '(' + parameterTypes.join(',') + ')';
}

/**
 * Return names of child key elements.
 *
 * @param element Source XML element
 * @returns an array of PropertyRef names
 */
function getKeys(element: XMLElement): string[] {
    // find all PropertyRef sub elements of Key sub element and collect their Name attribute
    // (there should be at most a single 'Key' sub element)
    let keys: string[] = [];
    const keyElements = (element.subElements || []).filter((subElement: XMLElement) => subElement.name === 'Key');
    if (keyElements?.length) {
        keys = keyElements[0].subElements
            .filter((subElement: XMLElement) => subElement.name === 'PropertyRef')
            .map((propRefElement: XMLElement) => getAttributeValue('Name', propRefElement));
    }
    return keys;
}

interface TypeMap {
    [typeName: string]: string;
}

interface NamespaceMap {
    // also add entries for namespaces to facilitate alias to namespace conversion
    [aliasOrNamespace: string]: string;
}

/**
 * Parses and converts attribute value to fully qualified name.
 *
 * @param attributeName
 * @param namespaceMap
 * @param currentNamespace
 * @param element
 * @returns fully qualified name or undefined
 */
function attributeValueToFullyQualifiedName(
    attributeName: string,
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    element: XMLElement
): string | undefined {
    const attributeValue = getAttributeValue(attributeName, element);
    if (attributeValue === '') {
        return undefined;
    }
    const parsedIdentifier = parseIdentifier(attributeValue);
    const fullyQualifiedName = toFullyQualifiedName(namespaceMap, currentNamespace, parsedIdentifier);
    return fullyQualifiedName ?? attributeValue;
}

/**
 * Creates namespace map from given container XML element.
 *
 * @param element container XML element
 * @returns namespace map
 */
function getNamespaceMap(element: XMLElement): NamespaceMap {
    const references = getElementsWithName('Reference', element);
    const dataServices = getElementsWithName('DataServices', element);
    const schemas = dataServices.length ? getElementsWithName('Schema', dataServices[0]) : [];
    const aliasMap: NamespaceMap = {};
    const includes = references.reduce<XMLElement[]>(
        (acc, reference) => [...acc, ...getElementsWithName('Include', reference)],
        []
    );

    for (const namespaceElement of [...includes, ...schemas]) {
        const namespace = getElementAttributeByName('Namespace', namespaceElement)?.value;
        const alias = getElementAttributeByName('Alias', namespaceElement)?.value;
        if (namespace) {
            aliasMap[namespace] = namespace;
            if (alias) {
                aliasMap[alias] = namespace;
            }
        }
    }

    return aliasMap;
}

/**
 * Creates association data object from given association ends XML elements.
 *
 * @param ends XML elements representing association ends
 * @param aliasMap alias map
 * @param currentNamespace namespace
 * @returns association data object
 */
function createAssociation(ends: XMLElement[], aliasMap: NamespaceMap, currentNamespace: string): AssociationData {
    const association: AssociationData = {};
    for (const end of ends) {
        const role = attributeValueToFullyQualifiedName('Role', aliasMap, currentNamespace, end);
        const type = attributeValueToFullyQualifiedName('Type', aliasMap, currentNamespace, end);
        const multiplicity = getAttributeValue('Multiplicity', end);
        if (role && type && multiplicity) {
            association[role] = {
                type,
                multiplicity
            };
        }
    }
    return association;
}
