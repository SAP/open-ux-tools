import type { XMLDocument, XMLElement } from '@xml-tools/ast';

import type { MetadataElementProperties, MetadataElement } from '@sap-ux/odata-metadata';
import type {
    FullyQualifiedTypeName,
    FullyQualifiedName,
    Namespace,
    Range,
    Alias,
    Name,
    QualifiedName
} from '@sap-ux/odata-annotation-core-types';
import { Edm, Location } from '@sap-ux/odata-annotation-core-types';

import { getAttributeValue, getElementAttributeByName } from './attribute-getters';
import { transformElementRange } from './range';
import { getElementsWithName } from './element-getters';

// METADATA

export const ELEMENT_TYPE = 'element';
export const METADATA_ELEMENT_NAME = 'MetadataElement';
export interface MetadataElementNode {
    type: typeof ELEMENT_TYPE; // not needed
    nameRange: null;
    range?: Range;
    name: typeof METADATA_ELEMENT_NAME; // not needed
    properties: MetadataElementProperties;
    content?: MetadataElementNode[];
}

// END Metadata

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
    aliasMap: AliasMap;
    typeMap: TypeMap;
    associationMap: AssociationMap;
    namespace: string;
    parentPath: string;
    uri: string;
}
export function convertMetadataDocument(uri: string, document: XMLDocument): MetadataElement[] {
    // const nodes =
    const root = document.rootElement;
    if (!root) {
        return [];
    }
    const aliasMap = getAliasMap(root);
    const dataServices = getElementsWithName('DataServices', root);
    const schemas = dataServices.length ? getElementsWithName('Schema', dataServices[0]) : [];
    const metadataElements: MetadataElement[] = [];
    for (const schema of schemas) {
        const namespace = getElementAttributeByName('Namespace', schema)?.value;
        if (namespace) {
            const typeMap: TypeMap = {};
            // loop over all direct schema children and collect type information
            const currentNamespace = getAttributeValue('Namespace', schema);

            schema.subElements.forEach((element: XMLElement) => {
                const name = getAttributeValue('Name', element);
                let type = '';
                switch (element.name) {
                    case Edm.TypeDefinition:
                    case Edm.EnumType:
                        type = getAttributeValue('UnderlyingType', element) || 'Edm.Int32';
                        break;
                    case Edm.EntityType:
                        type = 'Edm.EntityType';
                        break;
                    case Edm.ComplexType:
                        type = 'Edm.ComplexType';
                        break;
                    default:
                        type = '';
                }
                if (name && type) {
                    typeMap[currentNamespace + '.' + name] = type;
                }
            });

            const associationMap: AssociationMap = {};
            const associations = getElementsWithName('Association', schema);
            (associations || []).forEach((element) => {
                const name = getAttributeValue('Name', element);
                if (name) {
                    associationMap[name] = createAssociation(getElementsWithName('End', element), aliasMap);
                }
            });
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
        } else {
            // TODO: report warning
        }
    }
    return metadataElements;
}

function convertMetadataElement(context: Context, element: XMLElement): MetadataElement | undefined {
    if (!element.name || !EDMX_METADATA_ELEMENT_NAMES.has(element.name)) {
        return;
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
                { ...context, parentPath: `${context.parentPath}/${metadataElement.name}` },
                child
            );
            if (childElement) {
                metadataElement.content?.push(childElement);
            }
        }
    }
    return metadataElement;
}

function createMetadataNode(context: Context, element: XMLElement): MetadataElement | undefined {
    let typeAttrName: string;
    switch (element.name) {
        case Edm.EntitySet:
        case Edm.Singleton:
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
    let type = getAttributeValue(typeAttrName, element);
    const resolvedName = resolveName(type, context.aliasMap);
    type = resolvedName.qName ? resolvedName.qName : type;
    if (!type) {
        if (element.name === Edm.FunctionImport) {
            // OData V2: FunctionImport
            type = getAttributeValue('ReturnType', element);
        } else if (element.name === Edm.NavigationProperty) {
            // OData V2: use association information to determine Type
            let relationship = getAttributeValue('Relationship', element);
            const resolvedName = resolveName(relationship, context.aliasMap);
            relationship = resolvedName.qName ? resolvedName.qName : relationship;
            if (relationship) {
                const associationName = relationship.split('.').pop();
                if (associationName) {
                    const association = context.associationMap[associationName];
                    if (association) {
                        let toRole = getAttributeValue('ToRole', element);
                        const resolvedName = resolveName(toRole, context.aliasMap);
                        toRole = resolvedName.qName ? resolvedName.qName : toRole;
                        const role = association[toRole];
                        if (role && role.type) {
                            type = role.multiplicity === '*' ? `Collection(${role.type})` : role.type;
                        }
                    }
                }
            }
        }
    }
    const forAction = element.name === Edm.Action || element.name === Edm.Function;
    return createMetadataElementNodeForType(context, element, type, forAction);
}

function createMetadataElementNodeForType(
    context: Context,
    element: XMLElement,
    type: string,
    forAction?: boolean
): MetadataElement | undefined {
    function getTypeName(fqTypeName: FullyQualifiedTypeName): FullyQualifiedName {
        // links always go to entityTypes/complexTypes/functions or actions, which are defined as direct container children
        // --> use fully qualified name as path with single segment (strip Collection())
        return fqTypeName.startsWith('Collection(') ? fqTypeName.slice(11, -1) : fqTypeName;
    }
    if (element.name === null) {
        return undefined;
    }
    // determine metadata element name
    let metadataElementName = getAttributeValue('Name', element);
    if (forAction) {
        if (element.name === Edm.Action && getAttributeValue('IsBound', element) !== 'true') {
            metadataElementName += '()'; // unbound actions do not support overloading
        } else {
            metadataElementName = getOverloadName(context, element);
        }
    }
    if (METADATA_ROOT_TYPE_NAMES.has(element.name) && context.namespace) {
        metadataElementName = context.namespace + '.' + metadataElementName;
    } else if (element.name === Edm.ReturnType) {
        metadataElementName = '$ReturnType';
    }
    // build metadata element
    const metadataElementProperties: MetadataElementProperties = {
        isAnnotatable: true,
        kind: element.name,
        name: metadataElementName,
        isCollectionValued: (type && type.startsWith('Collection(')) || element.name === Edm.EntitySet,
        isComplexType: element.name === Edm.ComplexType,
        isEntityType: ENTITY_TYPE_NAMES.has(element.name ?? '')
    };

    if (element.name === Edm.EntityType) {
        const keys = getKeys(element);
        if (keys && keys.length) {
            metadataElementProperties.keys = keys;
        }
    }

    // adjust metadata element based on type information
    const functionImportV2Nodes: MetadataElement[] = [];
    if (type) {
        const typeName = getTypeName(type);
        const baseTypeName = context.typeMap[typeName] || typeName;
        // primitive type name
        let edmPrimitiveType = '';
        if (typeName.startsWith('Edm.')) {
            edmPrimitiveType = typeName; // original types namespace is Edm
        } else if (
            baseTypeName !== 'Edm.ComplexType' &&
            baseTypeName !== 'Edm.EntityType' &&
            element.name !== Edm.FunctionImport &&
            element.name !== Edm.ActionImport
        ) {
            // original type is defined in metadata but based on a primitive type
            edmPrimitiveType = baseTypeName;
        }
        if (edmPrimitiveType && element.name !== Edm.FunctionImport) {
            metadataElementProperties.edmPrimitiveType = edmPrimitiveType;
        }
        // structured type name
        if (
            STRUCTURED_TYPE_NAMES.has(element.name ?? '') &&
            !getAttributeValue('ReturnType', element) // exclude V2 FunctionImports
        ) {
            // type name contains reference to entityType, function or action
            metadataElementProperties.structuredType = typeName;
        } else if (PARAMETER_TYPE_NAMES.has(element.name ?? '')) {
            // handle property, parameter or returnType based on entity or complex type
            if (baseTypeName === 'Edm.ComplexType') {
                metadataElementProperties.isComplexType = true;
                metadataElementProperties.structuredType = typeName;
            } else if (baseTypeName === 'Edm.EntityType') {
                metadataElementProperties.isEntityType = true;
                metadataElementProperties.structuredType = typeName;
            }
        } else if (Edm.FunctionImport === element.name && getAttributeValue('ReturnType', element)) {
            // FunctionImport in Data V2: type contains ReturnType attribute - build sub node for it
            const returnTypeProperties: MetadataElementProperties = {
                isAnnotatable: true,
                kind: Edm.ReturnType,
                name: '$ReturnType',
                isCollectionValued: type.startsWith('Collection('),
                isComplexType: baseTypeName === 'Edm.ComplexType',
                isEntityType: baseTypeName === 'Edm.EntityType'
            };

            if (edmPrimitiveType) {
                returnTypeProperties.edmPrimitiveType = edmPrimitiveType;
            }
            if (['Edm.EntityType', 'Edm.ComplexType'].includes(baseTypeName)) {
                returnTypeProperties.structuredType = typeName;
            }
            const attributePosition = getElementAttributeByName('ReturnType', element)?.position;
            const range = transformElementRange(attributePosition ?? element.position, element);
            functionImportV2Nodes.push({
                path: `${context.parentPath}/${metadataElementProperties.name}/${returnTypeProperties.name}`,
                location: range ? Location.create(context.uri, range) : undefined,
                content: [],
                ...returnTypeProperties
            });
        }
    }
    let v2ActionFor = getAttributeValue('sap:action-for', element);
    const resolvedName = resolveName(v2ActionFor, context.aliasMap);
    v2ActionFor = resolvedName.qName ? resolvedName.qName : v2ActionFor;
    if (Edm.FunctionImport === element.name && v2ActionFor) {
        // generate binding parameter sub node with name '_it'
        const bindingParameterProperties: MetadataElementProperties = {
            isAnnotatable: false, // should be used in path expressions only, not as annotation target
            kind: Edm.Parameter,
            name: '_it',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: true,
            structuredType: v2ActionFor
        };

        const attributePosition = getElementAttributeByName('sap:action-for', element)?.position;
        const range = transformElementRange(attributePosition ?? element.position, element);
        functionImportV2Nodes.push({
            path: `${context.parentPath}/${metadataElementProperties.name}/${bindingParameterProperties.name}`,
            location: range ? Location.create(context.uri, range) : undefined,
            content: [],
            ...bindingParameterProperties
        });
    }
    const range = transformElementRange(element.position, element);
    return {
        path: `${context.parentPath}/${metadataElementProperties.name}`,
        location: range ? Location.create(context.uri, range) : undefined,
        content: functionImportV2Nodes,
        ...metadataElementProperties
    };
}

function getOverloadName(context: Context, element: XMLElement): string {
    // generate overload name MyFunction(MySchema.MyBindingParamType,First.NonBinding.ParamType)
    const name = getAttributeValue('Name', element);
    let parameterSubElements = element.subElements.filter(
        (subElement: XMLElement) => subElement.name === Edm.Parameter
    );
    if (element.name === Edm.Action) {
        parameterSubElements = parameterSubElements.slice(0, 1);
    }
    const parameterTypes = parameterSubElements.map((parameterElement: XMLElement) => {
        let type = getAttributeValue('Type', parameterElement);
        const resolvedName = resolveName(type, context.aliasMap);
        type = resolvedName.qName ? resolvedName.qName : type;
        return type;
    });
    return name + '(' + parameterTypes.join(',') + ')';
}

function getKeys(element: XMLElement): string[] {
    // find all PropertyRef sub elements of Key sub element and collect their Name attribute
    // (there should be at most a single 'Key' sub element)
    let keys: string[] = [];
    const keyElements = (element.subElements || []).filter((subElement: XMLElement) => subElement.name === 'Key');
    if (keyElements && keyElements.length) {
        keys = keyElements[0].subElements
            .filter((subElement: XMLElement) => subElement.name === 'PropertyRef')
            .map((propRefElement: XMLElement) => getAttributeValue('Name', propRefElement));
    }
    return keys;
}

interface TypeMap {
    [typeName: string]: string;
}

// TODO: figure out where to put these

interface ResolvedName {
    namespace?: Namespace;
    alias?: Alias;
    name: Name;
    qName: FullyQualifiedName;
}

interface AliasMap {
    // also add entries for namespaces to facilitate alias to namespace conversion
    [aliasOrNamespace: string]: Namespace;
}

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

// ALIAS

function getAliasMap(element: XMLElement): AliasMap {
    const references = getElementsWithName('Reference', element);
    const dataServices = getElementsWithName('DataServices', element);
    const schemas = dataServices.length ? getElementsWithName('Schema', dataServices[0]) : [];
    const aliasMap: AliasMap = {};
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

function createAssociation(ends: XMLElement[], aliasMap: AliasMap): AssociationData {
    const association: AssociationData = {};
    for (const end of ends) {
        const role = getAttributeValue('Role', end);
        let type = getAttributeValue('Type', end);
        const resolvedName = resolveName(type, aliasMap);
        type = resolvedName.qName ? resolvedName.qName : type;
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
