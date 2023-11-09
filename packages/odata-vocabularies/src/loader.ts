import type {
    CSDLAnnotations,
    UnboxContent,
    TypeDefinition as CSDLTypeDefinition,
    SchemaElement,
    EnumTypeBase,
    ComplexType as CSDLComplexType,
    Term as CSDLTerm,
    CSDL
} from '@sap-ux/vocabularies/CSDL';

import type { VocabularyAlias, VocabularyNamespace } from './resources';
import VOCABULARIES, { ALIAS_TO_NAMESPACE, NAMESPACE_TO_ALIAS } from './resources';
import type {
    EdmNameType,
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
} from './types';
import {
    ENUM_VALUE_KIND,
    PROPERTY_KIND,
    CDS_VOCABULARY_ALIAS,
    CDS_VOCABULARY_NAMESPACE,
    TYPE_DEFINITION_KIND,
    ENUM_TYPE_KIND,
    COMPLEX_TYPE_KIND,
    TERM_KIND
} from './types';

const PROPERTY_PATTERN = /^(\w){1,128}$/;

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

let vocabulariesInformationStatic: VocabulariesInformation | undefined;
let vocabulariesInformationStaticCds: VocabulariesInformation | undefined;

/**
 *
 * @param base Vocabulary object
 * @param raw CSDL object
 * @param prefix Annotation prefix
 */
function fillBaseProperties<T extends UnboxContent<CSDLAnnotations>>(
    base: BaseVocabularyObject,
    raw: T,
    prefix: string = ''
): void {
    const description = raw[`${prefix}@Org.OData.Core.V1.Description`];
    if (description !== undefined) {
        base.description = description;
    }
    const longDescription = raw[`${prefix}@Org.OData.Core.V1.LongDescription`];
    if (longDescription !== undefined) {
        base.longDescription = longDescription;
    }
    const experimental = raw[`${prefix}@com.sap.vocabularies.Common.v1.Experimental`];
    if (experimental !== undefined) {
        base.experimental = experimental;
    }

    // deprecated status
    const revisions = raw[`${prefix}@Org.OData.Core.V1.Revisions`] ?? [];
    const deprecatedRevisions = revisions.find(
        (revision: { Kind: string; Description: string }) => revision.Kind === 'Deprecated'
    );
    if (deprecatedRevisions) {
        base.deprecated = true;
        base.deprecatedDescription = deprecatedRevisions.Description;
    }
}

/**
 *
 * @param primitiveType Vocabulary Object
 * @param raw CSDL Object
 */
function fillPrimitiveTypeProperties(primitiveType: PrimitiveType, raw: SchemaElement): void {
    fillBaseProperties(primitiveType, raw);
    if (raw.$UnderlyingType !== undefined) {
        primitiveType.underlyingType = raw.$UnderlyingType;
    }
}

/**
 *
 * @param raw CSDL Object
 * @returns Facets
 */
function getFacets(raw: SchemaElement): Facets | undefined {
    const facets: Facets = {};
    if (raw.$Nullable !== undefined) {
        facets.isNullable = !!raw.$Nullable;
    }
    if (raw.$Precision !== undefined && Number.isInteger(raw.$Precision)) {
        facets.precision = raw.$Precision;
    }
    return Object.keys(facets).length ? facets : undefined;
}

/**
 *
 * @param raw CSDL Object
 * @returns Allowed values
 */
function parseAllowedValues(raw: UnboxContent<CSDLAnnotations>): AllowedValues[] {
    const rawAllowedValue = raw['@Org.OData.Validation.V1.AllowedValues'];
    if (rawAllowedValue?.length) {
        return rawAllowedValue.map((rawValue: UnboxContent<CSDLAnnotations> & { Value: unknown }) => ({
            value: rawValue.Value,
            description: rawValue['@Org.OData.Core.V1.Description'],
            longDescription: rawValue['@Org.OData.Core.V1.LongDescription'] ?? ''
        }));
    }
    return [];
}

/**
 *
 * @param key string
 * @returns boolean
 */
const isValidKey = (key: string) => {
    const maxLength = 512;
    if (key.startsWith('$') && key.length <= maxLength) {
        return true;
    }

    if (key.indexOf('@') >= 0 && key.length <= maxLength) {
        return true;
    }

    return false;
};

/**
 *
 * @param raw CSDL Object
 * @returns Constraints
 */
function getConstraints(raw: UnboxContent<CSDLAnnotations>): Constraints {
    const constraints: Constraints = {};
    const allowedValues: AllowedValues[] = parseAllowedValues(raw);
    if (allowedValues?.length) {
        constraints.allowedValues = allowedValues;
    }

    const allowedTerms = raw['@Org.OData.Validation.V1.AllowedTerms'];
    if (allowedTerms?.length) {
        constraints.allowedTerms = allowedTerms.map(getFullyQualifiedAllowedTermName);
    }

    const isLanguageDependent = raw['@Org.OData.Core.V1.IsLanguageDependent'];
    if (isLanguageDependent !== undefined) {
        constraints.isLanguageDependent = !!isLanguageDependent;
    }

    const requiresType = raw['@Org.OData.Core.V1.RequiresType'];
    if (requiresType) {
        constraints.requiresType = requiresType;
    }
    const openPropertyTypeConstraints = raw['@Org.OData.Validation.V1.OpenPropertyTypeConstraint'];
    if (openPropertyTypeConstraints) {
        constraints.openPropertyTypeConstraints = openPropertyTypeConstraints;
    }
    return constraints;
}

/**
 *
 * @param name Name of the type definition
 * @param raw CSDL Object
 * @returns Vocabulary Object
 */
function parseTypeDefinition(name: string, raw: CSDLTypeDefinition): TypeDefinition {
    const typeDef: TypeDefinition = { kind: TYPE_DEFINITION_KIND, name: name };
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
 * @param name Name of the enum
 * @param raw CSDL Object
 * @returns Vocabulary Object
 */
export function parseEnumTypeDefinition(name: string, raw: EnumTypeBase): EnumType {
    const enumType: EnumType = {
        kind: ENUM_TYPE_KIND,
        name: name,
        isFlags: false,
        values: [],
        deprecated: false
    };
    try {
        fillPrimitiveTypeProperties(enumType, raw);
        enumType.isFlags = raw.$IsFlags === true;

        // scan for enum values
        enumType.values = Object.keys(raw)
            .filter((key) => !isValidKey(key))
            .map((key) => {
                const value = parseInt(raw[key], 10);
                const enumValue: EnumValue = {
                    kind: ENUM_VALUE_KIND,
                    name: key,
                    value
                };
                fillBaseProperties(enumValue, raw, key);
                return enumValue;
            });
    } catch (e) {
        return enumType;
    }
    return enumType;
}

/**
 *
 * @param name Name of the complex type
 * @param raw CSDL Object
 * @returns Vocabulary Object
 */
function parseComplexType(name: string, raw: CSDLComplexType): ComplexType {
    const complexType: ComplexType = { kind: COMPLEX_TYPE_KIND, name: name, properties: new Map() };
    fillPrimitiveTypeProperties(complexType, raw);
    if (raw.$BaseType !== undefined) {
        complexType.baseType = raw.$BaseType;
    }
    if (raw.$Abstract !== undefined) {
        complexType.isAbstract = !!raw.$Abstract;
    }
    if (raw.$OpenType !== undefined) {
        complexType.isOpenType = !!raw.$OpenType;
    }

    // collect properties
    Object.keys(raw)
        .filter((key) => !isValidKey(key))
        .forEach((key) => {
            const propRaw = raw[key];
            const property: ComplexTypeProperty = {
                kind: PROPERTY_KIND,
                name: key,
                type: propRaw.$Type ?? 'Edm.String',
                isCollection: !!propRaw.$Collection
            };
            fillBaseProperties(property, propRaw);
            if (propRaw.$DefaultValue !== undefined) {
                property.defaultValue = propRaw.$DefaultValue;
            }
            // facets
            const facets = getFacets(propRaw);
            if (facets) {
                property.facets = facets;
            }
            // constraints
            const constraints = getConstraints(propRaw);
            const derivedTypeConstraints = propRaw['@Org.OData.Validation.V1.DerivedTypeConstraint'];
            if (derivedTypeConstraints?.length) {
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
 * @param name Name of the term
 * @param raw CSDL Object
 * @returns Vocabulary Object
 */
function parseTerm(name: string, raw: CSDLTerm): Term {
    const term: Term = {
        kind: TERM_KIND,
        name: name,
        type: raw.$Type ?? 'Edm.String',
        isCollection: !!raw.$Collection
    };
    fillBaseProperties(term, raw);
    if (raw.$DefaultValue !== undefined) {
        term.defaultValue = raw.$DefaultValue;
    }
    if (raw.$AppliesTo !== undefined) {
        term.appliesTo = raw.$AppliesTo;
    }
    if (raw.$BaseTerm !== undefined) {
        term.baseTerm = raw.$BaseTerm;
    }
    if (raw.$CdsName !== undefined) {
        term.cdsName = raw.$CdsName;
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
 * @param identifier Name
 * @param element CSDL Object
 * @returns Vocabulary Object
 */
function parseSchemaElements(identifier: string, element: SchemaElement): VocabularyObject | undefined {
    if (element.$Kind !== undefined) {
        switch (element.$Kind) {
            case 'EnumType':
                return parseEnumTypeDefinition(identifier, element);

            case 'TypeDefinition':
                return parseTypeDefinition(identifier, element);

            case 'ComplexType':
                return parseComplexType(identifier, element);

            case 'Term':
                return parseTerm(identifier, element);

            default:
        }
    }
    return undefined;
}

/**
 *
 * @param includeCds Flag indicating if CDS vocabularies should be loaded
 * @returns Vocabularies
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

    const addToUpperCaseNameMap = (name: string, propertyName?: string): void => {
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
    };

    const getVocabularyUri = (vocabulary: any): string => {
        const links: { rel?: string; href?: string }[] = vocabulary?.['@Org.OData.Core.V1.Links'] ?? [];
        const linkMap: Map<string, string> = new Map();
        for (const link of links) {
            linkMap.set(link.rel ?? '', link.href ?? '');
        }
        // get url pointing to latest version xml - if not available use alternative
        const latestVersion = linkMap.get('latest-version');
        const alternate = linkMap.get('alternate');
        if (latestVersion?.endsWith('.xml')) {
            return latestVersion;
        } else if (alternate?.endsWith('.xml')) {
            return alternate;
        } else if (latestVersion) {
            return latestVersion;
        } else if (alternate) {
            return alternate;
        }
        return '';
    };

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
            const document: CSDL = VOCABULARIES[alias];
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
                        if (vocabularyObject.kind === TERM_KIND) {
                            for (const targetKind of vocabularyObject.appliesTo ?? ['']) {
                                byTarget.set(targetKind, byTarget.get(targetKind) ?? new Set());
                                byTarget.get(targetKind)?.add(fqName);
                            }
                        } else if (vocabularyObject.kind === COMPLEX_TYPE_KIND) {
                            vocabularyObject.properties.forEach((property) => {
                                addToUpperCaseNameMap(fqName, property.name);
                            });
                            const baseType = vocabularyObject.baseType;
                            if (baseType) {
                                const baseName = baseType.split('.').pop() ?? '';
                                const baseElement = vocabulary[baseName];
                                if (baseElement) {
                                    const vocabularyBaseObject = parseSchemaElements(baseType, baseElement);
                                    // add property of baseType to fqName
                                    if (vocabularyBaseObject?.kind === COMPLEX_TYPE_KIND) {
                                        vocabularyBaseObject.properties.forEach((property) => {
                                            addToUpperCaseNameMap(fqName, property.name);
                                        });
                                    }
                                }
                                derivedTypesPerType.set(baseType, derivedTypesPerType.get(baseType) ?? new Map());
                                derivedTypesPerType.get(baseType)?.set(fqName, !!vocabularyObject.isAbstract);
                            }
                        }
                        if (vocabularyObject.kind === ENUM_TYPE_KIND) {
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
 * @param allowedTerm Term name
 * @returns fully qualified term name
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
