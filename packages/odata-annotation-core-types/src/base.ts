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
