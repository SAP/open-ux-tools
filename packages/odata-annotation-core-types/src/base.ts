import { EDM_NAMESPACE_ALIAS } from './annotation-file';
import { EDMX_NAMESPACE_ALIAS } from './annotation-file';
import type { Alias, NamespaceString } from './specification';

export type NamespaceAlias = typeof EDMX_NAMESPACE_ALIAS | typeof EDM_NAMESPACE_ALIAS;

/**
 * String types used for documentation purposes
 */
export type TargetKind = string; // restrict to defined constants below ?
export type TargetPath = string; // target path value for externally targeting annotations

/**
 * generic context used in value handling (check/completion of annotation values)
 */
export interface AliasMap {
    // also add entries for namespaces to facilitate alias to namespace conversion
    [aliasOrNamespace: string]: NamespaceString;
}

/**
 * Maps of alias-namespace of current and metadata file.
 *
 */
export interface AliasInformation {
    currentFileNamespace: NamespaceString;
    currentFileAlias?: Alias;
    aliasMap: AliasMap;
    reverseAliasMap: { [namespace: string]: Alias | NamespaceString }; // if no alias available: use namespace
    aliasMapMetadata: AliasMap;
    aliasMapVocabulary: AliasMap;
}

/**
 * Target Kinds
 *
 * used for finding allowed vocabulary terms (kinds are restricted via AppliesTo attribute) to service meta data objects
 */

// kinds which have fully qualified name
export const TYPE_DEFINITION_KIND = 'TypeDefinition';
export const ENUM_TYPE_KIND = 'EnumType';
export const COMPLEX_TYPE_KIND = 'ComplexType';
export const TERM_KIND = 'Term';

export const ENTITY_TYPE_KIND = 'EntityType';

export const ACTION_KIND = 'Action';
export const FUNCTION_KIND = 'Function';

export const ASSOCIATION_KIND = 'Association'; // V2 only

export const ENTITY_CONTAINER_KIND = 'EntityContainer';

// kinds which have simple identifier only
// (embedded in structural types)
export const PROPERTY_KIND = 'Property';
export const NAVIGATION_PROPERTY_KIND = 'NavigationProperty';

// (embedded in entity container)
export const ENTITY_SET_KIND = 'EntitySet';
export const SINGLETON_KIND = 'Singleton';
export const ACTION_IMPORT_KIND = 'ActionImport';
export const FUNCTION_IMPORT_KIND = 'FunctionImport';
export const ASSOCIATION_SET_KIND = 'AssociationSet'; // V2 only

// miscellaneous
export const COLLECTION_KIND = 'Collection';

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

export const cacheKeyAnyTermName = 'Impl.AnyTerm';
