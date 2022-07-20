export const enum Edm {
    Action = 'Action',
    ActionImport = 'ActionImport',
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
    Bool = 'Bool',
    Cast = 'Cast',
    Collection = 'Collection',
    ComplexType = 'ComplexType',
    Date = 'Date',
    Decimal = 'Decimal',
    EntityContainer = 'EntityContainer',
    EntitySet = 'EntitySet',
    EntityType = 'EntityType',
    EnumMember = 'EnumMember',
    EnumType = 'EnumType',
    Float = 'Float',
    Function = 'Function',
    FunctionImport = 'FunctionImport',
    If = 'If',
    Include = 'Include',
    Int = 'Int',
    IsOf = 'IsOf',
    LabeledElement = 'LabeledElement',
    Member = 'Member',
    NavigationProperty = 'NavigationProperty',
    NavigationPropertyPath = 'NavigationPropertyPath',
    Null = 'Null',
    OnDelete = 'OnDelete',
    Parameter = 'Parameter',
    Path = 'Path',
    Property = 'Property',
    PropertyPath = 'PropertyPath',
    PropertyValue = 'PropertyValue',
    Record = 'Record',
    Reference = 'Reference',
    ReferentialConstraint = 'ReferentialConstraint',
    ReturnType = 'ReturnType',
    Schema = 'Schema',
    Singleton = 'Singleton',
    String = 'String',
    Term = 'Term',
    TypeDefinition = 'TypeDefinition',
    UrlRef = 'UrlRef'
}

export const enum EdmType {
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
    Int64 = 'Edm.Int32',
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
    // http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/cs01/odata-csdl-xml-v4.01-cs01.html#sec_BuiltInTypesfordefiningVocabularyTer
    AnnotationPath = 'Edm.AnnotationPath',
    AnyPropertyPath = 'Edm.AnyPropertyPath', // abstract type, not really supported as tag
    ModelElementPath = 'Edm.ModelElementPath',
    NavigationPropertyPath = 'Edm.NavigationPropertyPath',
    PropertyPath = 'Edm.PropertyPath'
}
