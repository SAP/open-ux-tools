/**
 * All types representing vocabulary objects should go here
 * (expected: one type per $Kind)
 *
 * Vocabularies will be imported from their json format
 *  described here: (https://docs.oasis-open.org/odata/odata-csdl-json/v4.01/odata-csdl-json-v4.01.html)
 *
 * Typescript types should represent at minimum those features of a vocabulary object that are used in
 * annotation-modeler core or annotation modeler APIs
 */
import type {
    FullyQualifiedName,
    SimpleIdentifier,
    TargetKind,
    COMPLEX_TYPE_KIND,
    ENUM_TYPE_KIND,
    TERM_KIND,
    TYPE_DEFINITION_KIND,
    PROPERTY_KIND,
    NamespaceString,
    TargetKindValue,
    Facets,
    Constraints
} from '@sap-ux/odata-annotation-core-types';

import type { VocabularyNamespace } from '../resources';

/**
 * OData vocabulary
 */
export interface Vocabulary {
    namespace: NamespaceString;
    defaultAlias: SimpleIdentifier;
    defaultUri: string; // to be used e.g. for creating edmx Reference tags
}

export interface CdsVocabulary {
    namespace: string; // com.sap.vocabularies.CDS.v1
    alias: string; // CDS
    nameMap: Map<string, string>; // e.g. @cds.persistence.exists -> CDS.CdsPersistenceExists
    reverseNameMap: Map<string, string>; // e.g. CDS.CdsPersistenceExists -> @cds.persistence.exists
    groupNames: Set<string>; // first segments of CDS annotations containing multiple segments e.g. cds for @cds.persistence.exists
    singletonNames: Set<string>; // cds annotations consisting of single segment only e.g. title for @title
}

export interface AllowedValues {
    value: any;
    description: string;
    longDescription: string;
}

/**
 * Base for all Types and terms contained in vocabularies
 */
export interface BaseVocabularyObject {
    kind: string;
    name: FullyQualifiedName;
    description?: string; // source: @Org.OData.Core.V1.Description
    longDescription?: string; // source: @Org.OData.Core.V1.LongDescription
    deprecated?: boolean; // source: @Org.OData.Core.V1.Revisions/Kind
    deprecatedDescription?: string; // source: @Org.OData.Core.V1.Revisions/Description
    experimental?: string; // source: @com.sap.vocabularies.Common.v1.Experimental
}

export interface PrimitiveType extends BaseVocabularyObject {
    underlyingType?: FullyQualifiedName; // source: "$UnderlyingType"
    // for EnumType: one of Byte, SByte, Int16, Int32, or Int64; default: Int32
    // for TypeDefinition: name of primitive type (MUST NOT be another type definition)
}

/**
 * EnumType definition ("$Kind": "EnumType")
 */
export interface EnumType extends PrimitiveType {
    kind: typeof ENUM_TYPE_KIND;
    isFlags?: boolean; // source: $IsFLags
    values: EnumValue[];
}

export const ENUM_VALUE_KIND = 'Member';

export const CDS_VOCABULARY_NAMESPACE = 'com.sap.vocabularies.CDS.v1';
export const CDS_VOCABULARY_ALIAS = 'CDS';

export interface EnumValue extends BaseVocabularyObject {
    kind: typeof ENUM_VALUE_KIND;
    value: number;
}

/**
 * Type Definition ("$Kind": "TypeDefinition")
 */
export interface TypeDefinition extends PrimitiveType {
    kind: typeof TYPE_DEFINITION_KIND;
    facets?: Facets;
    // regarding constraints on type definitions (see http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_TypeDefinition):
    // "It is up to the definition of a term to specify whether and how annotations with this term propagate to places
    // where the annotated type definition is used, and whether they can be overridden."
    // Current assumption:
    // - constraints on type definitions are always applied to usages of that type definition in terms or properties
    // - if constraint is redefined on property or term, then the value on property or term is applied
    constraints?: Constraints; // although not mentioned in specific
}

/**
 * Property of a complex type ("$Kind": "Property")
 */

export interface ComplexTypeProperty extends BaseVocabularyObject {
    kind: typeof PROPERTY_KIND;
    type: FullyQualifiedName; //source: $Type - no Collection() allowed - use isCollection instead
    isCollection: boolean; // source: $Collection
    isOpenType?: boolean; // source: $Type='Org.OData.Core.V1.Dictionary' => OpenType = true
    facets?: Facets;
    constraints?: Constraints;
    // TODO defaultValue as Element?
    defaultValue?: unknown; // source: $DefaultValue; type-specific JSON representation of the default value of the term
}

interface ComplexTypeBase extends PrimitiveType {
    kind: typeof COMPLEX_TYPE_KIND;
    isAbstract?: boolean; // source: $Abstract; indicates that it is abstract and cannot have instances
    isOpenType?: boolean; // source $OpenType; indicates that it is open and allows clients to add properties dynamically
    properties: Map<string, ComplexTypeProperty>;
    constraints?: Constraints;
}

/**
 * ComplexType ("$Kind": "ComplexType")
 */
export interface ComplexType extends ComplexTypeBase {
    baseType?: FullyQualifiedName; // source $BaseType: can inherit from another complex type by specifying it as its base type
}

/**
 * ComplexType with all base types resolved
 * properties will contain aggregated list of properties
 */
export interface ExpandedComplexType extends ComplexTypeBase {
    baseTypes: FullyQualifiedName[]; // list of resolved base types
}

/**
 * possible results for checking applicability of term
 */
export enum TermApplicability {
    Applicable,
    TermNotApplicable,
    TypeNotApplicable,
    UnknownTerm,
    UnknownVocabulary,
    UnSupportedVocabulary,
    NotInApplicableTermsConstraint
}

/**
 * Term ("$Kind": "Term")
 */
export interface Term extends BaseVocabularyObject {
    kind: typeof TERM_KIND;
    type: FullyQualifiedName; //source: $Type - no Collection() allowed - use isCollection instead
    isCollection: boolean; // source: $Collection
    appliesTo?: TargetKindValue[]; // source: $AppliesTo
    baseTerm?: FullyQualifiedName; // source: $BaseTerm
    facets?: Facets;
    constraints?: Constraints;
    // TODO defaultValue as Element?
    defaultValue?: unknown; // source: $DefaultValue; type-specific JSON representation of the default value of the term
    cdsName?: FullyQualifiedName; // For CDS Vocabularies
}

export interface VocabulariesInformation {
    dictionary: Map<FullyQualifiedName, VocabularyObject>;
    byTarget: Map<TargetKind | '', Set<FullyQualifiedName>>;
    supportedVocabularies: Map<VocabularyNamespace, Vocabulary>;
    namespaceByDefaultAlias: Map<SimpleIdentifier, VocabularyNamespace>;
    derivedTypesPerType: Map<FullyQualifiedName, Map<FullyQualifiedName, boolean>>;
    upperCaseNameMap: Map<string, string | Map<string, string>>;
}

export type VocabularyType = TypeDefinition | EnumType | ComplexType;
export type VocabularyObject = VocabularyType | Term;

export type MarkdownString = string; // mark down (since this is supported by LSP) - see https://daringfireball.net/projects/markdown/syntax
