/* eslint-disable @typescript-eslint/no-namespace */

/**
 * types for
 */
export namespace EdmNameType {
    export type ElementName = string;
    export type AttributeName = string;

    export type SimpleIdentifier = string; // "starts with a letter or underscore, followed by at most 127 letters, underscores or digits"

    export type Name = SimpleIdentifier;
    export type Alias = SimpleIdentifier;
    export type Namespace = string; // "dot separated sequence of SimpleIdentifier"
    export type QualifiedName = string; // <Namespace|Alias>.<Name>
    //export type QName = QualifiedName; // ? short form
    export type FullyQualifiedName = string; // <Namespace>.<Name>
    //export type FqName = FullyQualifiedName; // ? short form
    export type FullyQualifiedTypeName = string; // <Namespace>.<Name> | Collection(<Namespace>.<Name>)
}

export namespace EdmValueType {
    export type AttributeValue = string;
    export type TextValue = string; // content of TextNode
    export type PathValue = AttributeValue | TextValue; // segments separated by '/'; absolute (starts with /) or relative path
}

/**
 * tag/attribute names defined for edm namespace (url://docs.oasis-open.org/odata/odata/v4.0/errata03/os/complete/schemas/edmx.xsd)
 */
export enum EdmxElementName {
    DataServices = 'DataServices',
    Edmx = 'Edmx',
    Include = 'Include',
    IncludeAnnotations = 'IncludeAnnotations',
    Reference = 'Reference'
}

export enum EdmxReferenceElementAttributeName {
    Uri = 'Uri'
}

export enum EdmxIncludeElementAttributeName {
    Alias = 'Alias',
    Namespace = 'Namespace'
}

export const EDMX_ELEMENT_NAMES = new Set([
    EdmxElementName.DataServices,
    EdmxElementName.Edmx,
    EdmxElementName.Include,
    EdmxElementName.IncludeAnnotations,
    EdmxElementName.Reference
]);

export const EDMX_NAMESPACE_ALIAS = 'Edmx';
export const EDM_NAMESPACE_ALIAS = 'Edm';

export type NamespaceAlias = typeof EDMX_NAMESPACE_ALIAS | typeof EDM_NAMESPACE_ALIAS;

/**
 * tag/attribute names defined for edm namespace (url://docs.oasis-open.org/odata/odata/v4.0/errata03/os/complete/schemas/edm.xsd)
 */
export enum Edm {
    Action = 'Action',
    ActionImport = 'ActionImport',
    Annotations = 'Annotations',
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
    IsOf = 'IsOf',
    LabeledElement = 'LabeledElement',
    Member = 'Member',
    NavigationProperty = 'NavigationProperty',
    Null = 'Null',
    OnDelete = 'OnDelete',
    Parameter = 'Parameter',
    Property = 'Property',
    PropertyValue = 'PropertyValue',
    PrimitiveType = 'PrimitiveType',
    Record = 'Record',
    ReferentialConstraint = 'ReferentialConstraint',
    ReturnType = 'ReturnType',
    Schema = 'Schema',
    Singleton = 'Singleton',
    Target = 'Target',
    Term = 'Term',
    TypeDefinition = 'TypeDefinition',
    UrlRef = 'UrlRef',
    // appearing as attributes only
    Qualifier = 'Qualifier',
    Type = 'Type',
    // constant expressions http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/cs01/odata-csdl-xml-v4.01-cs01.html#sec_ConstantExpression
    Binary = 'Binary',
    Bool = 'Bool',
    Date = 'Date',
    DateTimeOffset = 'DateTimeOffset',
    Decimal = 'Decimal',
    Duration = 'Duration',
    EnumMember = 'EnumMember',
    Float = 'Float',
    Guid = 'Guid',
    Int = 'Int',
    String = 'String',
    TimeOfDay = 'TimeOfDay',
    // path expressions http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/cs01/odata-csdl-xml-v4.01-cs01.html#sec_PathExpressions
    AnnotationPath = 'AnnotationPath',
    ModelElementPath = 'ModelElementPath',
    NavigationPropertyPath = 'NavigationPropertyPath',
    PropertyPath = 'PropertyPath',
    Path = 'Path'
}

/**
 * primitive types
 */
export enum EdmType {
    // http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/cs01/odata-csdl-xml-v4.01-cs01.html#sec_PrimitiveTypes
    // Geography*, Geometry* omitted
    Binary = 'Edm.Binary',
    Boolean = 'Edm.Boolean',
    Byte = 'Edm.Byte',
    Date = 'Edm.Date',
    DateTimeOffset = 'Edm.DateTimeOffset',
    Decimal = 'Edm.Decimal',
    Double = 'Edm.Double',
    Duration = 'Edm.Duration',
    Guid = 'Edm.Guid',
    Int16 = 'Edm.Int16',
    Int32 = 'Edm.Int32',
    Int64 = 'Edm.Int64',
    SByte = 'Edm.SByte',
    Single = 'Edm.Single',
    Stream = 'Edm.Stream',
    String = 'Edm.String',
    TimeOfDay = 'Edm.TimeOfDay',
    // http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/cs01/odata-csdl-xml-v4.01-cs01.html#sec_BuiltInAbstractTypes
    PrimitiveType = 'Edm.PrimitiveType',
    ComplexType = 'Edm.ComplexType',
    EntityType = 'Edm.EntityType',
    Untyped = 'Edm.Untyped',
    // not in OData Specification! introduced to represent all collection typed entries in cache
    EntityTypeCollection = 'Edm.EntityTypeCollection',
    NonEntityTypeCollection = 'Edm.NonEntityTypeCollection',
    // http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/cs01/odata-csdl-xml-v4.01-cs01.html#sec_BuiltInTypesfordefiningVocabularyTer
    AnnotationPath = 'Edm.AnnotationPath',
    AnyPropertyPath = 'Edm.AnyPropertyPath', // abstract type, not really supported as tag
    ModelElementPath = 'Edm.ModelElementPath',
    NavigationPropertyPath = 'Edm.NavigationPropertyPath',
    PropertyPath = 'Edm.PropertyPath'
}

export const cacheKeyAnyTermName = 'Impl.AnyTerm';
