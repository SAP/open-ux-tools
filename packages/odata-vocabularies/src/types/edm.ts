/* eslint-disable @typescript-eslint/no-namespace */

export namespace Edm {
    export type SimpleIdentifier = string; // "starts with a letter or underscore, followed by at most 127 letters, underscores or digits"
    export type Name = SimpleIdentifier;
    export type Alias = SimpleIdentifier;
    export type Namespace = string; // "dot separated sequence of SimpleIdentifier"
    export type NameQualifier = SimpleIdentifier | string; //  <Namespace|Alias>
    export type QualifiedName = string; // <Namespace|Alias>.<Name>
    export type AliasQualifiedName = string; // <Alias>.<Name>
    export type FullyQualifiedName = string; // <Namespace>.<Name>

    export type Annotation = string;
    export enum SymbolicValue {
        Action = 'Action',
        ActionImport = 'ActionImport',
        Annotation = 'Annotation',
        Apply = 'Apply',
        Cast = 'Cast',
        Collection = 'Collection',
        ComplexType = 'ComplexType',
        EntityContainer = 'EntityContainer',
        EntitySet = 'EntitySet',
        EntityType = 'EntityType',
        EnumType = 'EnumType',
        Function = 'Function',
        FunctionImport = 'FunctionImport',
        If = 'If',
        Include = 'Include',
        IsOf = 'IsOf',
        LabeledElement = 'LabeledElement',
        Member = 'Member',
        NavigationProperty = 'NavigationProperty',
        Null = 'Null',
        OnDelete = 'OnDelete',
        Parameter = 'Parameter',
        Property = 'Property',
        PropertyValue = 'PropertyValue',
        Record = 'Record',
        Reference = 'Reference',
        ReferentialConstraint = 'ReferentialConstraint',
        ReturnType = 'ReturnType',
        Schema = 'Schema',
        Singleton = 'Singleton',
        Term = 'Term',
        TypeDefinition = 'TypeDefinition',
        UrlRef = 'UrlRef'
    }
    export interface Schema {
        $Alias?: string;
        [name: string]: SchemaChild | string;
    }

    export const TERM_KIND = 'Term';
    export interface Term {
        $Kind: typeof TERM_KIND;
        $Type: QualifiedName;
        $Collection?: boolean;
        $AppliesTo?: SymbolicValue[];
        [name: string]: any;
    }

    export const TYPE_DEFINITION_KIND = 'TypeDefinition';
    export interface TypeDefinition {
        $Kind: typeof TYPE_DEFINITION_KIND;
        $UnderlyingType: QualifiedName;
        [name: string]: any;
    }

    export const COMPLEX_TYPE_KIND = 'ComplexType';
    export interface ComplexType {
        $Kind: typeof COMPLEX_TYPE_KIND;
        $BaseType?: QualifiedName;
        [name: string]: any;
    }

    export const ENUM_TYPE_KIND = 'EnumType';
    export interface EnumType {
        $Kind: typeof ENUM_TYPE_KIND;
        [properties: string]: any;
    }

    export const ACTION_KIND = 'Action';
    export interface Action {
        $Kind: typeof ACTION_KIND;
        [properties: string]: any;
    }

    export const FUNCTION_KIND = 'Function';
    export interface EdmFunction {
        $Kind: typeof FUNCTION_KIND;
        [properties: string]: any;
    }

    export const ENTITY_TYPE_KIND = 'EntityType';
    export interface EntityType {
        $Kind: typeof ENTITY_TYPE_KIND;
        [properties: string]: any;
    }

    export const ENTITY_CONTAINER_KIND = 'EntityContainer';
    export interface EntityContainer {
        $Kind: typeof ENTITY_CONTAINER_KIND;
        [properties: string]: any;
    }

    export const SINGLETON_KIND = 'Singleton';
    export interface Singleton {
        $Kind: typeof SINGLETON_KIND;
        [properties: string]: any;
    }

    export const ENTITY_SET_KIND = 'EntitySet';
    export interface EntitySet {
        $Kind: typeof ENTITY_SET_KIND;
        [properties: string]: any;
    }

    export const ACTION_IMPORT_KIND = 'ActionImport';
    export interface ActionImport {
        $Kind: typeof ACTION_IMPORT_KIND;
        [properties: string]: any;
    }

    export const FUNCTION_IMPORT_KIND = 'FunctionImport';
    export interface FunctionImport {
        $Kind: typeof FUNCTION_IMPORT_KIND;
        [properties: string]: any;
    }

    // OData V2 BEGIN
    export const ASSOCIATION_SET_KIND = 'AssociationSet';
    export interface AssociationSet {
        $Kind: typeof ASSOCIATION_SET_KIND;
        [properties: string]: any;
    }

    export const ASSOCIATION_KIND = 'Association';
    export interface Association {
        $Kind: typeof ASSOCIATION_KIND;
        [properties: string]: any;
    }

    export enum AssociationAttributes {
        Name = 'Name'
    }

    export enum AssociationChild {
        End = 'End'
    }

    export enum EndAttributes {
        Role = 'Role',
        Type = 'Type',
        Multiplicity = 'Multiplicity'
    }

    // OData V2 END

    export type SchemaChild =
        | Term
        | TypeDefinition
        | ComplexType
        | EnumType
        | EntityType
        | Action
        | EdmFunction
        | EntityContainer
        | Singleton
        | EntitySet
        | FunctionImport
        | ActionImport
        | AssociationSet // OData V2
        | Association; // OData V2
    export type SchemaChildKind =
        | typeof TERM_KIND
        | typeof TYPE_DEFINITION_KIND
        | typeof COMPLEX_TYPE_KIND
        | typeof ENUM_TYPE_KIND
        | typeof ENTITY_TYPE_KIND
        | typeof ACTION_KIND
        | typeof FUNCTION_KIND
        | typeof ENTITY_CONTAINER_KIND
        | typeof SINGLETON_KIND
        | typeof ENTITY_SET_KIND
        | typeof ACTION_IMPORT_KIND
        | typeof FUNCTION_IMPORT_KIND
        | typeof ASSOCIATION_SET_KIND // OData V2
        | typeof ASSOCIATION_KIND; // OData V2
}
