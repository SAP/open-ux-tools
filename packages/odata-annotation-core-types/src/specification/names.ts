/**
 * Types for elements property in AnnotationFile
 */
export type ElementName = string;
export type AttributeName = string;

/**
 * Starts with a letter or underscore, followed by at most 127 letters, underscores or digits
 */
export type SimpleIdentifier = string;

export type Name = SimpleIdentifier;
export type Alias = SimpleIdentifier;
/**
 * Dot separated sequence of SimpleIdentifier
 */
export type NamespaceString = string;
/**
 * Is a name part <Namespace|Alias>
 */
export type NameQualifier = SimpleIdentifier | string;
/**
 * Is a name represented in <Alias>.<Name> format
 */
export type AliasQualifiedName = string;
/**
 * Is a name represented in <Namespace|Alias>.<Name> format
 */
export type QualifiedName = string;
/**
 * Is a name represented in <Namespace>.<Name> format
 */
export type FullyQualifiedName = string;
/**
 * Is a name represented in <Namespace>.<Name> | Collection(<Namespace>.<Name>) format
 */
export type FullyQualifiedTypeName = string;

/**
 * Types for elements value in AnnotationFile
 */

/**
 * contents of AttributeValue
 */
export type AttributeValue = string;
/**
 * contents of TextNode
 */
export type TextValue = string;
/**
 * segments separated by '/'; absolute (starts with /) or relative path
 */
export type PathValue = AttributeValue | TextValue;

/**
 * Types for segments of target, term, action.
 */
export interface ResolvedName {
    namespace?: NamespaceString;
    alias?: Alias;
    name: Name; // SimpleIdentifier
    qName: FullyQualifiedName; // <Namespace|Alias>.<Name>
}
