import type { FullyQualifiedName, Location } from '@sap-ux/odata-annotation-core-types';

export type ODataVersionType = '2.0' | '4.0';

/**
 * Identification of a file containing metadata.
 */
export type FileUri = string;
/**
 * Metadata element kind, e.g. Entity for CDS, EntitySet for OData.
 */
export type Kind = string;
/**
 * Identify specific element among it's siblings, will be fully qualified names for root elements (CDS parameters will get prefix to distinguish them from elements).
 */
export type ElementName = string;
/**
 * Identifier for MetadataElement, consists of segments of SimpleNames separated by '/'
 */
export type Path = string;
/**
 * Properties of a metadata element
 * e.g. for reuse in representation of metadata file content
 */
export interface MetadataElementProperties {
    /**
     * Identify metadata element among it's siblings (in tree of metadata elements)
     **/
    name: ElementName;
    /**
     * Kind carrying semantics of the source language (e.g. 'Entity' in CDS, 'EntitySet' in EDM)
     * will only be used for differentiating metadata elements in UI, ie. show separate list of ComplexType and Function for EDM
     */
    kind: Kind;
    /**
     * Some metadata elements might not be annotatable (e.g. root of EDMX service)
     */
    isAnnotatable: boolean;

    // rest is ony relevant if isAnnotatable === true

    /**
     * File uri for go to definition
     */
    definitionFileUri?: FileUri;
    /**
     * Original - fully qualified - name (needed to identify missing 'using' statements in CDS)
     */
    originalName?: FullyQualifiedName;
    /**
     * To restrict applicable terms (AppliesTo: 'Collection' - 	Entity Set or collection-valued Property or Navigation Property).
     * To restrict path expressions to generic types (e.g. 'Collection(Edm.PrimitiveType)').
     */
    isCollectionValued?: boolean;
    /**
     * To qualify as value for abstract type 'Edm.EntityType'.
     * In EDM: all EntityTypes, EntitySets, Singletons, NavigationProperties.
     */
    isEntityType?: boolean;
    /**
     * To qualify as value for abstract type 'Edm.ComplexType'.
     * In EDM: all ComplexType, Properties and Parameters typed with ComplexTypes.
     */
    isComplexType?: boolean;
    /**
     * Only for primitive values; if present also qualifies for abstract type 'Edm.PrimitiveValue'.
     * To restrict paths correctly, e.g. to 'Edm.String' values, to apply 'Core.RequiresType' constraint for terms.
     */
    edmPrimitiveType?: string;
    /**
     * For all structured values: (absolute) path to metadata element defining the structure.
     * (e.g. EntityType for EDM NavigationProperty, target for CDS association)
     */
    structuredType?: Path;

    // just for information purposes

    /**
     * For entities (CDS), entity types (EDMX)
     */
    keys?: ElementName[];
}

/**
 * Metadata element as returned from API lookup calls
 */
export interface MetadataElement extends MetadataElementProperties {
    /**
     * Path to this metadata element, last path segment is SimpleName of current metadata element
     */
    path: Path;
    /**
     *  Range containing the definition of the metadata element
     */
    location?: Location;

    content?: MetadataElement[];
}

export type MetadataMap = Map<Path, MetadataElement>;

export interface MetadataServiceOptions {
    isCds?: boolean;
    ODataVersion?: ODataVersionType;
    uriMap?: Map<string, string>;
}

export type MetadataElementVisitor = (element: MetadataElement) => void;
