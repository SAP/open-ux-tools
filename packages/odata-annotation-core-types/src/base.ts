/**
 * common OData types used in vocabulary and metadata API
 */

/**
 * String types used for documentation purposes
 */
export type TargetKind = string; // restrict to defined constants below ?
export type SimpleIdentifier = string; // "starts with a letter or underscore, followed by at most 127 letters, underscores or digits"
export type Name = SimpleIdentifier;
export type Alias = SimpleIdentifier;
export type Namespace = string; // "dot separated sequence of SimpleIdentifier"

export type QualifiedName = string; // <Namespace|Alias>.<Name>
export type FullyQualifiedName = string; // <Namespace>.<Name>
export type FullyQualifiedTypeName = string; // <Namespace>.<Name> || Collection(<Namespace>.<Name>)

export type TargetPath = string; // target path value for externally targeting annotations

/**
 * Target Kinds
 *
 * used for finding allowed vocabulary terms (kinds are restricted via AppliesTo attribute) to service meta data objects
 */

// kinds which have fully qualified name
// export const TYPE_DEFINITION_KIND = 'TypeDefinition';
// export const ENUM_TYPE_KIND = 'EnumType';
// export const COMPLEX_TYPE_KIND = 'ComplexType';
// export const TERM_KIND = 'Term';

// export const ENTITY_TYPE_KIND = 'EntityType';

// export const ACTION_KIND = 'Action';
// export const FUNCTION_KIND = 'Function';

// export const ASSOCIATION_KIND = 'Association'; // V2 only

// export const ENTITY_CONTAINER_KIND = 'EntityContainer';

// // kinds which have simple identifier only
// // (embedded in structural types)
// export const PROPERTY_KIND = 'Property';
// export const NAVIGATION_PROPERTY_KIND = 'NavigationProperty';
// export const PARAMETER_KIND = 'Parameter';

// // (embedded in entity container)
// export const ENTITY_SET_KIND = 'EntitySet';
// export const SINGLETON_KIND = 'Singleton';
// export const ACTION_IMPORT_KIND = 'ActionImport';
// export const FUNCTION_IMPORT_KIND = 'FunctionImport';
// export const ASSOCIATION_SET_KIND = 'AssociationSet'; // V2 only

// // miscellaneous
// export const COLLECTION_KIND = 'Collection';
