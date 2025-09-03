export const enum Edm {
    Action = 'Action',
    ActionImport = 'ActionImport',
    Add = 'Add',
    /**
     * as attribute name only
     */
    Alias = 'Alias',
    And = 'And',
    Annotation = 'Annotation',
    Annotations = 'Annotations',
    AnnotationPath = 'AnnotationPath',
    /**
     * Only for OData V2
     */
    Association = 'Association',
    /**
     * Only for OData V2
     */
    AssociationSet = 'AssociationSet',
    Apply = 'Apply',
    Binary = 'Binary',
    Bool = 'Bool',
    Cast = 'Cast',
    Collection = 'Collection',
    ComplexType = 'ComplexType',
    Date = 'Date',
    DateTimeOffset = 'DateTimeOffset',
    Decimal = 'Decimal',
    Div = 'Div',
    Duration = 'Duration',
    EntityContainer = 'EntityContainer',
    EntitySet = 'EntitySet',
    EntityType = 'EntityType',
    EnumMember = 'EnumMember',
    EnumType = 'EnumType',
    Eq = 'Eq',
    Float = 'Float',
    Function = 'Function',
    FunctionImport = 'FunctionImport',
    Ge = 'Ge',
    Gt = 'Gt',
    Guid = 'Guid',
    If = 'If',
    In = 'In',
    Include = 'Include',
    Int = 'Int',
    IsOf = 'IsOf',
    LabeledElement = 'LabeledElement',
    Le = 'Le',
    Lt = 'Lt',
    Member = 'Member',
    ModelElementPath = 'ModelElementPath',
    Mul = 'Mul',
    /**
     * as attribute name only
     */
    Name = 'Name',
    /**
     * as attribute name only
     */
    Namespace = 'Namespace',
    NavigationProperty = 'NavigationProperty',
    NavigationPropertyPath = 'NavigationPropertyPath',
    Ne = 'Ne',
    Neg = 'Neg',
    Not = 'Not',
    Null = 'Null',
    OnDelete = 'OnDelete',
    Parameter = 'Parameter',
    Path = 'Path',
    Property = 'Property',
    PropertyPath = 'PropertyPath',
    PropertyValue = 'PropertyValue',
    Or = 'Or',
    /**
     * as attribute name only
     */
    Qualifier = 'Qualifier',
    Record = 'Record',
    Reference = 'Reference',
    ReferentialConstraint = 'ReferentialConstraint',
    /**
     * as attribute name only
     */
    ReferencedProperty = 'ReferencedProperty',
    ReturnType = 'ReturnType',
    Schema = 'Schema',
    Singleton = 'Singleton',
    String = 'String',
    Sub = 'Sub',
    /**
     * as attribute name only
     */
    Target = 'Target',
    Term = 'Term',
    TimeOfDay = 'TimeOfDay',
    /**
     * as attribute name only
     */
    Type = 'Type',
    TypeDefinition = 'TypeDefinition',
    UrlRef = 'UrlRef'
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
    PropertyPath = 'Edm.PropertyPath',
    // not in OData Specification! introduced to find 'virtualProperties' defined by terms like "Analytics.AggregatedProperties"
    VirtualProperty = 'Edm.VirtualProperty',
    // not in OData Specification! introduced to indicate that 1:n associations are allowed when looking up pathCache
    PrimitiveCollection = 'Edm.PrimitiveCollection',
    /**
     * Not in OData Specification! introduced to indicate that enum members are allowed (CAP CDS only)
     */
    DataModelEnum = 'Edm.DataModelEnum'
}
