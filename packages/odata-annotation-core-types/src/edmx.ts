export const enum Edmx {
    Alias = 'Alias', // as attribute name only
    DataServices = 'DataServices',
    Edmx = 'Edmx',
    Import = 'Import',
    Include = 'Include',
    Namespace = 'Namespace', // as attribute name only
    Reference = 'Reference',
    Uri = 'Uri', // as attribute name only
    Version = 'Version' // as attribute name only
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
