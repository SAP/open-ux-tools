import type { VocabularyAlias, VocabularyNamespace } from './resources';
import VOCABULARIES, { ALIAS_TO_NAMESPACE, NAMESPACE_TO_ALIAS } from './resources';
import type { Edmx } from './types/edmx';
import { Edm } from './types/edm';
import type {
    Constraints,
    BaseVocabularyObject,
    ComplexType,
    EnumType,
    EnumValue,
    Facets,
    PrimitiveType,
    Term,
    TypeDefinition,
    VocabularyObject,
    TargetKindValue,
    ComplexTypeProperty,
    Vocabulary,
    AllowedValues,
    VocabulariesInformation
} from './types/vocabularyService';
import {
    ENUM_VALUE_KIND,
    PROPERTY_KIND,
    CDS_VOCABULARY_ALIAS,
    CDS_VOCABULARY_NAMESPACE
} from './types/vocabularyService';
import type { EdmNameType } from './types/names';

const PROPERTY_PATTERN = /^([A-Za-z0-9_]){1,128}$/;

const SUPPORTED_VOCABULARY_NAMESPACES: Set<VocabularyNamespace> = new Set([
    'Org.OData.Aggregation.V1',
    'Org.OData.Authorization.V1',
    'Org.OData.Capabilities.V1',
    'Org.OData.Core.V1',
    'Org.OData.Measures.V1',
    'Org.OData.Repeatability.V1',
    'Org.OData.Temporal.V1',
    'Org.OData.Validation.V1',
    'Org.OData.JSON.V1',
    'com.sap.vocabularies.Analytics.v1',
    'com.sap.vocabularies.CDS.v1',
    'com.sap.vocabularies.CodeList.v1',
    'com.sap.vocabularies.Common.v1',
    'com.sap.vocabularies.Communication.v1',
    'com.sap.vocabularies.DataIntegration.v1',
    'com.sap.vocabularies.DirectEdit.v1',
    'com.sap.vocabularies.Graph.v1',
    'com.sap.vocabularies.ODM.v1',
    'com.sap.vocabularies.PDF.v1',
    'com.sap.vocabularies.PersonalData.v1',
    'com.sap.vocabularies.Hierarchy.v1',
    'com.sap.vocabularies.Session.v1',
    'com.sap.vocabularies.UI.v1',
    'com.sap.vocabularies.HTML5.v1'
]);

let vocabulariesInformationStatic: VocabulariesInformation = null;
let vocabulariesInformationStaticCds: VocabulariesInformation = null;

/**
 *
 * @param termName
 * @param prefix
 * @returns {string} - term with namespace
 */
function getDefinitionAnnotationKey(termName: EdmNameType.QualifiedName, prefix = ''): string {
    const [alias, term] = termName.split('.');
    const namespace = ALIAS_TO_NAMESPACE.get(alias as VocabularyAlias);
    return prefix + '@' + namespace + '.' + term;
}

/**
 *
 * @param base
 * @param raw
 */
function fillBaseProperties(base: BaseVocabularyObject, raw: unknown): void {
    let propName: any;
    propName = getDefinitionAnnotationKey('Core.Description');
    if (raw[propName] !== undefined) {
        base.description = raw[propName];
    }
    propName = getDefinitionAnnotationKey('Core.LongDescription');
    if (raw[propName] !== undefined) {
        base.longDescription = raw[propName];
    }
    propName = getDefinitionAnnotationKey('Common.Experimental');
    if (raw[propName] !== undefined) {
        base.experimental = raw[propName];
    }
    // deprecated status
    const revs = raw[getDefinitionAnnotationKey('Core.Revisions')] || [];
    const deprecatedRevisions = revs.find((rev: unknown) => rev['Kind'] === 'Deprecated');
    if (deprecatedRevisions) {
        base.deprecated = true;
        base.deprecatedDescription = deprecatedRevisions['Description'];
    }
}

/**
 *
 * @param primitiveType
 * @param raw
 */
function fillPrimitiveTypeProperties(primitiveType: PrimitiveType, raw: unknown): void {
    fillBaseProperties(primitiveType, raw);
    if (raw['$UnderlyingType'] !== undefined) {
        primitiveType.underlyingType = raw['$UnderlyingType'];
    }
}

/**
 *
 * @param raw
 * @returns { Facets | null}
 */
function getFacets(raw: unknown): Facets | null {
    const facets: Facets = {};
    if (raw['$Nullable'] !== undefined) {
        facets.isNullable = !!raw['$Nullable'];
    }
    if (raw['$Precision'] !== undefined && Number.isInteger(raw['$Precision'])) {
        facets.precision = raw['$Precision'];
    }
    return Object.keys(facets).length ? facets : null;
}

/**
 *
 * @param raw
 * @returns {AllowedValues[]}
 */
function parseAllowedValues(raw: unknown): AllowedValues[] {
    const rawAllowedValue = raw[getDefinitionAnnotationKey('Validation.AllowedValues')];
    const allowedValues: AllowedValues[] = [];
    if (rawAllowedValue && rawAllowedValue.length) {
        rawAllowedValue.forEach((rawValue) => {
            allowedValues.push({
                value: rawValue.Value,
                description: rawValue['@Org.OData.Core.V1.Description'],
                longDescription: rawValue['@Org.OData.Core.V1.LongDescription'] || ''
            });
        });
    }
    return allowedValues;
}

/**
 *
 * @param raw
 * @returns {Constraints}
 */
function getConstraints(raw: unknown): Constraints {
    const constraints: Constraints = {};
    const allowedValues: AllowedValues[] = parseAllowedValues(raw);
    if (allowedValues && allowedValues.length) {
        constraints.allowedValues = allowedValues;
    }
    const allowedTerms = raw[getDefinitionAnnotationKey('Validation.AllowedTerms')];
    if (allowedTerms && allowedTerms.length) {
        constraints.allowedTerms = allowedTerms.map((allowedTerm) => getFullyQualifiedAllowedTermName(allowedTerm));
    }
    const propName = getDefinitionAnnotationKey('Core.IsLanguageDependent');
    if (raw[propName] !== undefined) {
        constraints.isLanguageDependent = !!raw[propName];
    }
    const requiresType = raw[getDefinitionAnnotationKey('Core.RequiresType')];
    if (requiresType) {
        constraints.requiresType = requiresType;
    }
    const openPropertyTypeConstraints = raw[getDefinitionAnnotationKey('Validation.OpenPropertyTypeConstraint')];
    if (openPropertyTypeConstraints) {
        constraints.openPropertyTypeConstraints = openPropertyTypeConstraints;
    }
    return constraints;
}

/**
 *
 * @param name
 * @param raw
 * @returns {TypeDefinition}
 */
function parseTypeDefinition(name: string, raw: unknown): TypeDefinition {
    const typeDef: TypeDefinition = { kind: Edm.TYPE_DEFINITION_KIND, name: name };
    fillPrimitiveTypeProperties(typeDef, raw);
    const facets = getFacets(raw);
    if (facets) {
        typeDef.facets = facets;
    }
    // constraints
    const constraints = getConstraints(raw);
    if (Object.keys(constraints).length) {
        typeDef.constraints = constraints;
    }
    return typeDef;
}

/**
 *
 * @param name
 * @param raw
 * @returns {EnumType}
 */
export function parseEnumTypeDefinition(name: string, raw: unknown): EnumType {
    const enumType: EnumType = {
        kind: Edm.ENUM_TYPE_KIND,
        name: name,
        isFlags: false,
        values: [],
        deprecated: false
    };
    try {
        fillPrimitiveTypeProperties(enumType, raw);
        enumType.isFlags = raw['$IsFlags'] === true;

        // scan for enum values
        enumType.values = Object.keys(raw)
            .filter((key) => !key.match(/(^\$\w+)|(\w*(@\w+)+)/g))
            .map((key) => {
                const prop: unknown = raw[key];
                const enumValue: EnumValue = {
                    kind: ENUM_VALUE_KIND,
                    name: key,
                    value: prop as number,
                    description: raw[getDefinitionAnnotationKey('Core.Description', key)],
                    longDescription: raw[getDefinitionAnnotationKey('Core.LongDescription', key)],
                    experimental: raw[getDefinitionAnnotationKey('Common.Experimental', key)]
                };
                return enumValue;
            });
    } catch (e) {
        return enumType;
    }
    return enumType;
}

/**
 *
 * @param name
 * @param raw
 * @returns {ComplexType}
 */
function parseComplexType(name: string, raw: unknown): ComplexType {
    const complexType: ComplexType = { kind: Edm.COMPLEX_TYPE_KIND, name: name, properties: new Map() };
    fillPrimitiveTypeProperties(complexType, raw);
    if (raw['$BaseType'] !== undefined) {
        complexType.baseType = raw['$BaseType'];
    }
    if (raw['$Abstract'] !== undefined) {
        complexType.isAbstract = !!raw['$Abstract'];
    }
    if (raw['$OpenType'] !== undefined) {
        complexType.isOpenType = !!raw['$OpenType'];
    }

    // collect properties
    Object.keys(raw)
        .filter((key) => !key.match(/(^\$\w+)|(\w*(@\w+)+)/g))
        .forEach((key) => {
            const propRaw = raw[key];
            const property: ComplexTypeProperty = {
                kind: PROPERTY_KIND,
                name: key,
                type: propRaw['$Type'] || 'Edm.String',
                isCollection: !!propRaw['$Collection']
            };
            fillBaseProperties(property, propRaw);
            if (propRaw['$DefaultValue'] !== undefined) {
                property.defaultValue = propRaw['$DefaultValue'];
            }
            // facets
            const facets = getFacets(propRaw);
            if (facets) {
                property.facets = facets;
            }
            // constraints
            const constraints = getConstraints(propRaw);
            const derivedTypeConstraints = propRaw[getDefinitionAnnotationKey('Validation.DerivedTypeConstraint')];
            if (derivedTypeConstraints && derivedTypeConstraints.length) {
                constraints.derivedTypeConstraints = derivedTypeConstraints;
            }
            if (Object.keys(constraints).length) {
                property.constraints = constraints;
            }
            complexType.properties.set(property.name, property);
        });
    return complexType;
}

/**
 *
 * @param name
 * @param raw
 * @returns {Term}
 */
function parseTerm(name: string, raw: unknown): Term {
    const term: Term = {
        kind: Edm.TERM_KIND,
        name: name,
        type: raw['$Type'] || 'Edm.String',
        isCollection: !!raw['$Collection']
    };
    fillBaseProperties(term, raw);
    if (raw['$DefaultValue'] !== undefined) {
        term.defaultValue = raw['$DefaultValue'];
    }
    if (raw['$AppliesTo'] !== undefined) {
        term.appliesTo = raw['$AppliesTo'];
    }
    if (raw['$BaseTerm'] !== undefined) {
        term.baseTerm = raw['$BaseTerm'];
    }
    if (raw['$CdsName'] !== undefined) {
        term.cdsName = raw['$CdsName'];
    }

    // facets
    const facets = getFacets(raw);
    if (facets) {
        term.facets = facets;
    }
    // constraints
    const constraints = getConstraints(raw);
    if (Object.keys(constraints).length) {
        term.constraints = constraints;
    }
    return term;
}

/**
 *
 * @param identifier
 * @param element
 * @returns {VocabularyObject}
 */
function parseSchemaElements(identifier: string, element): VocabularyObject {
    let vocabularyObject: VocabularyObject = null;
    if (element.$Kind !== undefined) {
        switch (element.$Kind) {
            case 'EnumType':
                vocabularyObject = parseEnumTypeDefinition(identifier, element);
                break;
            case 'TypeDefinition':
                vocabularyObject = parseTypeDefinition(identifier, element);
                break;
            case 'ComplexType':
                vocabularyObject = parseComplexType(identifier, element);
                break;
            case 'Term':
                vocabularyObject = parseTerm(identifier, element);
                break;
        }
    }
    return vocabularyObject;
}

/**
 *
 * @param includeCds
 * @returns {VocabulariesInformation}
 */
export const loadVocabulariesInformation = (includeCds?: boolean): VocabulariesInformation => {
    // try to use cache
    if (includeCds && vocabulariesInformationStaticCds) {
        return vocabulariesInformationStaticCds;
    } else if (!includeCds && vocabulariesInformationStatic) {
        return vocabulariesInformationStatic;
    }

    const dictionary: Map<EdmNameType.FullyQualifiedName, VocabularyObject> = new Map();
    const byTarget: Map<TargetKindValue | '', Set<EdmNameType.FullyQualifiedName>> = new Map();
    const supportedVocabularies: Map<VocabularyNamespace, Vocabulary> = new Map();
    const namespaceByDefaultAlias: Map<EdmNameType.SimpleIdentifier, VocabularyNamespace> = new Map();
    const derivedTypesPerType: Map<
        EdmNameType.FullyQualifiedName,
        Map<EdmNameType.FullyQualifiedName, boolean>
    > = new Map();
    const upperCaseNameMap: Map<string, string | Map<string, string>> = new Map();
    /**
     *
     * @param name
     * @param propertyName
     */
    function addToUpperCaseNameMap(name: string, propertyName?: string): void {
        const upperCaseName = name.toUpperCase();
        const currentEntry = upperCaseNameMap.get(upperCaseName);
        if (!propertyName) {
            if (!currentEntry || typeof currentEntry === 'string') {
                upperCaseNameMap.set(upperCaseName, name);
            } else if (typeof currentEntry === 'object') {
                upperCaseNameMap.set(upperCaseName, Object.assign(currentEntry, { $Self: name }));
            }
        } else {
            const upperCasePropName = propertyName.toUpperCase();
            if (!currentEntry) {
                upperCaseNameMap.set(upperCaseName, new Map([['$Self', name]]));
            } else if (typeof currentEntry === 'string') {
                upperCaseNameMap.set(upperCaseName, new Map([['$Self', currentEntry]]));
            }
            (upperCaseNameMap.get(upperCaseName) as Map<string, string>).set(upperCasePropName, propertyName);
        }
    }

    /**
     *
     * @param vocabulary
     * @returns {string} - url
     */
    function getVocabularyUri(vocabulary: any): string {
        let url = '';
        const links = (vocabulary && vocabulary['@Org.OData.Core.V1.Links']) || [];
        const linkMap: Map<string, string> = new Map();
        links.forEach((link) => linkMap.set(link.rel || '', link.href || ''));
        // get url pointing to latest version xml - if not available use alternative
        if (linkMap.has('latest-version') && linkMap.get('latest-version').endsWith('.xml')) {
            url = linkMap.get('latest-version');
        } else if (linkMap.has('alternate') && linkMap.get('alternate').endsWith('.xml')) {
            url = linkMap.get('alternate');
        } else if (linkMap.has('latest-version')) {
            url = linkMap.get('latest-version');
        } else if (linkMap.has('alternate')) {
            url = linkMap.get('alternate');
        }
        return url;
    }

    NAMESPACE_TO_ALIAS.forEach((alias, namespace) => {
        if (!includeCds && alias === CDS_VOCABULARY_ALIAS) {
            return;
        }
        addToUpperCaseNameMap(alias);
        addToUpperCaseNameMap(namespace);
        namespaceByDefaultAlias.set(alias, namespace);
    });

    for (const namespace of SUPPORTED_VOCABULARY_NAMESPACES) {
        if (!includeCds && namespace === CDS_VOCABULARY_NAMESPACE) {
            continue;
        }
        const alias = NAMESPACE_TO_ALIAS.get(namespace);
        if (alias) {
            const document = VOCABULARIES[alias] as Edmx.Json.Document;
            if (document) {
                const vocabulary = document[namespace];
                supportedVocabularies.set(namespace, {
                    namespace: namespace,
                    defaultAlias: alias,
                    defaultUri: getVocabularyUri(vocabulary)
                });
                const properties = Object.keys(vocabulary);
                for (const identifier of properties.filter((property) => PROPERTY_PATTERN.test(property))) {
                    const fqName = namespace + '.' + identifier;
                    const element = vocabulary[identifier];
                    const vocabularyObject = parseSchemaElements(fqName, element);
                    if (vocabularyObject) {
                        dictionary.set(fqName, vocabularyObject);
                        addToUpperCaseNameMap(fqName);
                        if (vocabularyObject.kind === Edm.TERM_KIND) {
                            (vocabularyObject.appliesTo || ['']).forEach((targetKind) => {
                                byTarget.set(targetKind, byTarget.get(targetKind) || new Set());
                                byTarget.get(targetKind).add(fqName);
                            });
                        } else if (vocabularyObject.kind === Edm.COMPLEX_TYPE_KIND) {
                            vocabularyObject.properties.forEach((property) => {
                                addToUpperCaseNameMap(fqName, property.name);
                            });
                            const baseType = vocabularyObject.baseType;
                            if (baseType) {
                                const baseName = baseType.split('.').pop();
                                const baseElement = vocabulary[baseName];
                                if (baseElement) {
                                    const vocabularyBaseObject = parseSchemaElements(baseType, baseElement);
                                    // add property of baseType to fqName
                                    if (vocabularyBaseObject && vocabularyBaseObject.kind === Edm.COMPLEX_TYPE_KIND) {
                                        vocabularyBaseObject.properties.forEach((property) => {
                                            addToUpperCaseNameMap(fqName, property.name);
                                        });
                                    }
                                }
                                derivedTypesPerType.set(baseType, derivedTypesPerType.get(baseType) || new Map());
                                derivedTypesPerType.get(baseType).set(fqName, !!vocabularyObject.isAbstract);
                            }
                        }
                        if (vocabularyObject.kind === Edm.ENUM_TYPE_KIND) {
                            vocabularyObject.values.forEach((value) => {
                                addToUpperCaseNameMap(fqName, value.name);
                            });
                        }
                    }
                }
            }
        }
    }
    const vocabulariesInformation: VocabulariesInformation = {
        dictionary,
        byTarget,
        derivedTypesPerType,
        supportedVocabularies,
        namespaceByDefaultAlias,
        upperCaseNameMap
    };
    // fill cache
    if (includeCds) {
        vocabulariesInformationStaticCds = vocabulariesInformation;
    } else {
        vocabulariesInformationStatic = vocabulariesInformation;
    }
    return vocabulariesInformation;
};

/**
 *
 * @param allowedTerm
 * @returns {string}
 */
function getFullyQualifiedAllowedTermName(allowedTerm: string): string {
    const segments = allowedTerm.split('.');
    if (segments.length !== 2) {
        return allowedTerm;
    }
    const namespace = ALIAS_TO_NAMESPACE.get(segments[0] as VocabularyAlias);
    if (!namespace) {
        return allowedTerm;
    }
    segments[0] = namespace;
    return segments.join('.');
}
