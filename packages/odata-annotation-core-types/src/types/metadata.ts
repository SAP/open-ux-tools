import type { FullyQualifiedName, Location, TargetKind } from '..';

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

export interface EnumValue {
    name: string;
    value: unknown;
}

export interface ReferentialConstraint {
    sourceTypeName: FullyQualifiedName;
    sourceProperty: string;
    targetTypeName: FullyQualifiedName;
    targetProperty: string;
}

/**
 * Properties of a metadata element
 * e.g. for reuse in representation of metadata file content
 */
export interface MetadataElementProperties {
    /**
     * Identify metadata element among it's siblings (in tree of metadata elements)
     */
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
     * Only for primitive values with `edmPrimitiveType`;
     * Currently only supported by CAP CDS, where enum names are translated to the primitive type values during OData conversion.
     *
     */
    enumValues?: EnumValue[];
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

    targetKinds: TargetKind[];
    /**
     * Only relevant for NavigationProperty kind
     */
    referentialConstraints?: ReferentialConstraint[];
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
     *  URI to a resource which should be referenced when using this metadata element.
     *  (needed to identify missing 'using' statements in CDS)
     */
    importUri?: string;
    /**
     *  Location containing the definition of the metadata element. Can be used for go to definition.
     */
    location?: Location;

    content: MetadataElement[];
}

export type MetadataMap = Map<Path, MetadataElement>;

export interface MetadataServiceOptions {
    isCds?: boolean;
    ODataVersion?: ODataVersionType;
    uriMap?: Map<string, string>;
}

export type MetadataElementVisitor = (element: MetadataElement) => void;

export interface IMetadataService {
    /**
     * OData Version
     *   '2.0': OData 2.0
     *   '4.0': OData 4.0
     *   '': not specified (e.g. for metadata generated from CDS sources)
     */
    readonly ODataVersion: ODataVersionType | '';

    /**
     * isCds
     *   true: metadata are generated based on CDS sources
     */
    readonly isCds: boolean;

    /**
     * Metadata file URI.
     */
    fileUri: string;

    /**
     * Set map of uris from relative to absolute.
     *
     * @param uriMap
     */
    setUriMap(uriMap: Map<string, string>): void;

    /**
     * Import metadata.
     *
     * @param rootNodes Metadata elements.
     * @param fileUri Metadata file URI.
     *
     * The metadata is cached and invalidated (on file change) based on file level
     */
    import(rootNodes: MetadataElement[], fileUri: string): void;

    /**
     * Traverses all metadata elements and calls visitor function for each element.
     *
     * @param visitElement
     */
    visitMetadataElements(visitElement: MetadataElementVisitor): void;

    /**
     * Returns namespaces representing metadata.
     *
     * @returns
     */
    getNamespaces(): Set<string>;

    /**
     * Returns all metadata root elements.
     *
     * @returns
     */
    getRootMetadataElements(): Map<Path, MetadataElement>;

    /**
     * Returns a specific metadata element specified by its path.
     *
     * @param path Path identifying the metadata element (conforming to EDMX, i.e. function/action segments can also be without ())
     * @returns Metadata element
     */
    getMetadataElement(path: Path): MetadataElement | undefined;

    /**
     * Get OData target kinds for a metadata element.
     *
     * @param path Path identifying metadata element.
     * @returns OData target kinds.
     */
    getEdmTargetKinds(path: Path): TargetKind[];

    /**
     * Get (LSP) Locations of metadata element.
     *
     * @param path - path identifying metadata element
     * @returns Locations for the metadata element
     */
    getMetadataElementLocations(path: string): Location[];
}
