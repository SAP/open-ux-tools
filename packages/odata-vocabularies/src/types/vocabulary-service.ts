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
    FullyQualifiedTypeName,
    Namespace,
    SimpleIdentifier,
    TargetKind,
    COMPLEX_TYPE_KIND,
    ENUM_TYPE_KIND,
    TERM_KIND,
    TYPE_DEFINITION_KIND,
    PROPERTY_KIND
} from './base-types';

import type { VocabularyNamespace } from '../resources';

/**
 * OData vocabulary
 */
export interface Vocabulary {
    namespace: Namespace;
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

/**
 * Facets provide further details on types definitions, terms or properties
 * http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#_Toc26368805
 */
export interface Facets {
    isNullable?: boolean; // source: $Nullable; whether the property can have the value null
    // $MaxLength; maximum length of a binary, stream or string value; no usage in supported vocabularies
    precision?: number; // source: $Precision, for a decimal value: the maximum number of significant decimal digits..
    // ..for a temporal value (e.g. time of dat): the number of decimal places allowed in the seconds
    // $Scale; maximum number of digits allowed to the right.. ; no usage in supported vocabularies
    // $SRID: no usage in supported vocabularies
    // $Unicode; applicable to string values; no usage in supported vocabularies
}

/**
 * Constraints can be provided via Annotations on terms or properties
 * (commented out terms have been considered but discarded)
 */
export interface Constraints {
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
 * target kinds - available values for AppliesTo
 */
export type TargetKindValue =
    | 'Action'
    | 'ActionImport'
    | 'Annotation'
    | 'Apply' // Application of a client-side function in an annotation
    | 'Cast' // Type Cast annotation expression
    | 'Collection' // Entity Set or collection-valued Property or Navigation Property
    | 'ComplexType'
    | 'EntityContainer'
    | 'EntitySet'
    | 'EntityType'
    | 'EnumType'
    | 'Function'
    | 'FunctionImport'
    | 'If' // Conditional annotation expression
    | 'Include' // Reference to an Included Schema
    | 'IsOf' // Type Check annotation expression
    | 'LabeledElement' // Labeled Element expression
    | 'Member' // Enumeration Member
    | 'NavigationProperty'
    | 'Null'
    | 'OnDelete' // On-Delete Action of a navigation property
    | 'Parameter' // Action of Function Parameter
    | 'Property' // Property of a structured type
    | 'PropertyValue' // Property value of a Record annotation expression
    | 'Record' // Record annotation expression
    | 'Reference' // Reference to another CSDL document
    | 'ReferentialConstraint' //Referential Constraint of a navigation property
    | 'ReturnType' // Return Type of an Action or Function
    | 'Schema'
    | 'Singleton'
    | 'Term'
    | 'TypeDefinition'
    | 'UrlRef'; // UrlRef annotation expression

/**
 * possible results for checking applicability of term
 */
export enum TermApplicability {
    Applicable,
    TermNotApplicable,
    TypeNotApplicable,
    UnknownTerm,
    UnknownVocabulary,
    UnSupportedVocabulary
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
