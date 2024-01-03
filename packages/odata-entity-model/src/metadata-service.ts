import type {
    TargetKind,
    Location,
    MetadataElement,
    MetadataMap,
    Path,
    ODataVersionType,
    MetadataServiceOptions,
    MetadataElementVisitor,
    IMetadataService
} from '@sap-ux/odata-annotation-core-types';
import { Edm } from '@sap-ux/odata-annotation-core-types';

// Mapping of action/function names to all their overloads
type ActionNameMap = Map<Path, Set<Path>>;

/**
 * Extracts action/function name by removing the part enclosed in parentheses.
 *
 * @param name action/function name
 * @returns extracted name
 */
function getActionName(name: Path): Path {
    const partsOpen = name.split('(');
    const partsClose = name.split(')');
    return partsOpen.length > 1 && partsClose.length > 1 ? (partsOpen.shift() ?? '') + (partsClose.pop() ?? '') : name;
}

/**
 * Builds a lookup for metadata elements based on provided data.
 *
 * @param metadata - The map to store metadata elements, keyed by their paths.
 * @param actionNames - The map to store action names and associated overload paths.
 * @param namespaces - The set to store unique namespaces encountered during the process.
 * @param metadataElements - The array of metadata elements to process and build the lookup.
 */
function buildMetadataElementLookup(
    metadata: MetadataMap,
    actionNames: ActionNameMap,
    namespaces: Set<string>,
    metadataElements: MetadataElement[]
): void {
    for (const node of metadataElements) {
        const namespace = getNamespace(node.path);
        if (namespace) {
            namespaces.add(namespace);
        }
        if (node.name.includes('(')) {
            const actionName = getActionName(node.name);
            let overloadPaths = actionNames.get(actionName);
            if (!overloadPaths) {
                overloadPaths = new Set<string>();
                actionNames.set(actionName, overloadPaths);
            }
            overloadPaths.add(node.name);
        }
        metadata.set(node.path, node);
        if (node.content) {
            buildMetadataElementLookup(metadata, actionNames, namespaces, node.content);
        }
    }
}

/**
 * Returns the namespace of an element identified by its path.
 *
 * @param path - Path of an element
 * @returns    - Namespace
 */
function getNamespace(path: string): string {
    let namespace = '';
    const segments = path.split('/');
    const firstSegment = segments[0] === '' ? segments[1] : segments[0];
    if (firstSegment) {
        // segment name for overloads can be <fqFunctionName>(<fqNamePar1>, <fqNamePar2>)
        // each fqName can contain dots
        const beforeFirstBracket = firstSegment.split('(')[0];
        const parts = beforeFirstBracket.split('.');
        parts.pop();
        namespace = parts.join('.');
    }
    return namespace;
}

/**
 * Metadata service
 */
export class MetadataService implements IMetadataService {
    /**
     * Keeps all metadata based on file level (for invalidation when file changes)
     */
    private metadata: MetadataMap = new Map();

    /**
     * Keeps all namespaces based on file level (for invalidation when file changes)
     */
    private namespaces = new Set<string>();

    /**
     * Mapping of action names to set of overloads on file level (for invalidation when file changes)
     */
    private actionNames: ActionNameMap = new Map();

    /**
     * Map of relative to absolute uri
     */
    private uriMap: Map<string, string>;

    /**
     * Lookup metadata element by its path.
     *
     * @param path - need to exactly match path of metadata element (i.e. function/action segment needs to contain ())
     * @returns Metadata element if it exists for the given path.
     */
    private lookup(path: Path): MetadataElement | undefined {
        return this.metadata.get(path);
    }

    /**
     *
     * @param path element path
     * @returns element location
     */
    private getMetadataElementLocationsInternal(path: string): Location[] {
        const locations: Location[] = [];
        const elements: MetadataElement[] = [];
        const mdElement = this.lookup(path);
        if (mdElement) {
            elements.push(mdElement);
        } else {
            // action/function name? find all action/function overloads

            const overloadPaths = this.actionNames.get(path);
            if (overloadPaths) {
                for (const overloadPath of overloadPaths) {
                    const overloadElement = this.getMetadataElement(overloadPath);
                    if (overloadElement) {
                        elements.push(overloadElement);
                    }
                }
            }
        }
        // build locations
        for (const element of elements) {
            if (element.location) {
                locations.push(element.location);
            }
        }
        return locations;
    }

    /**
     * OData Version
     *   '2.0': OData 2.0
     *   '4.0': OData 4.0
     *   '': not specified (e.g. for metadata generated from CDS sources)
     */
    readonly ODataVersion: ODataVersionType | '';

    /**
     * Metadata file URI.
     */
    fileUri = '';

    /**
     * Create new metadata service instance.
     *
     * @param options metadata service instance option
     */
    constructor(options?: MetadataServiceOptions) {
        this.ODataVersion = options?.ODataVersion ?? '';
        this.uriMap = options?.uriMap ?? new Map();
    }

    /**
     * Set map of uris from relative to absolute.
     *
     * @param uriMap A map where keys are relative URIs and values are their corresponding absolute URIs.
     */
    setUriMap(uriMap: Map<string, string>): void {
        this.uriMap = uriMap;
    }

    /**
     * Import metadata.
     *
     * @param rootNodes Metadata elements.
     * @param fileUri Metadata file URI.
     *
     * The metadata is cached and invalidated (on file change) based on file level
     */
    import(rootNodes: MetadataElement[], fileUri: string): void {
        // build map of all metadata elements contained in file
        const metadataMap: MetadataMap = new Map();
        const actionNameMap: ActionNameMap = new Map();
        const namespaceSet: Set<string> = new Set();

        buildMetadataElementLookup(metadataMap, actionNameMap, namespaceSet, rootNodes);

        this.fileUri = fileUri;
        this.namespaces = namespaceSet;
        this.actionNames = actionNameMap;
        this.metadata = metadataMap;
    }

    /**
     * Traverses all metadata elements and calls the specified visitor function for each element.
     *
     * @param {MetadataElementVisitor} visitElement - A function that will be called for each metadata element during traversal.
     * The function should accept a single argument, which is the metadata element being visited.
     */
    visitMetadataElements(visitElement: MetadataElementVisitor): void {
        for (const [, element] of this.metadata.entries()) {
            visitElement(element);
        }
    }

    /**
     * Returns namespaces representing metadata.
     *
     * @returns set of namespaces
     */
    getNamespaces(): Set<string> {
        return new Set([...this.namespaces]);
    }

    /**
     * Returns all metadata root elements.
     *
     * @returns a map containing metadata root elements, where the keys are the paths and the values are the corresponding metadata elements.
     */
    getRootMetadataElements(): Map<Path, MetadataElement> {
        const map: Map<Path, MetadataElement> = new Map();
        for (const metadataElement of this.metadata.values()) {
            if (metadataElement.path.indexOf('/') < 0) {
                map.set(metadataElement.path, metadataElement);
            }
        }
        return map;
    }

    /**
     * Returns a specific metadata element specified by its path.
     *
     * @param path Path identifying the metadata element (conforming to EDMX, i.e. function/action segments can also be without ())
     * @returns Metadata element
     */
    getMetadataElement(path: Path): MetadataElement | undefined {
        const element = this.lookup(path);
        if (element) {
            return element;
        }
        // check if first segment represents action function name (without signature)
        const segments = path.split('/');
        const topLevelName = segments.shift();
        if (!topLevelName) {
            return undefined;
        }
        const actionFunctionOverloads = this.getActionFunctionOverloads(topLevelName);
        if (actionFunctionOverloads) {
            const remainingSegments = segments.join('/');
            for (const overloadName of actionFunctionOverloads) {
                const newPath = overloadName + (remainingSegments ? '/' + remainingSegments : '');
                const element = this.lookup(newPath);
                if (element) {
                    return element;
                }
            }
        }

        return undefined;
    }

    /**
     * Get Action or Function overloads by their top level name.
     *
     * @param topLevelName First segment represents action function name.
     * @returns if first segment represents action function name (without signature).
     */
    private getActionFunctionOverloads(topLevelName: string): Set<string> | undefined {
        return this.actionNames.get(topLevelName);
    }

    /**
     * Get OData target kinds for a metadata element.
     *
     * @param path Path identifying metadata element.
     * @returns OData target kinds.
     */
    getEdmTargetKinds(path: Path): TargetKind[] {
        const element = this.getMetadataElement(path);
        if (!element) {
            return [];
        }
        return element.targetKinds;
    }

    /**
     * Get (LSP) Locations of metadata element.
     *
     * @param path - path identifying metadata element
     * @returns Locations for the metadata element
     */
    getMetadataElementLocations(path: string): Location[] {
        const result = this.getMetadataElementLocationsInternal(path);
        if (this.uriMap) {
            // map locations of result to external uri
            result.forEach((location) => {
                if (location.uri.indexOf('node_modules') > -1) {
                    const values = [...this.uriMap.values()];
                    const item = values.find((val) => val.endsWith(location.uri.replace(/\\/g, '/')));
                    if (item) {
                        location.uri = item;
                    }
                } else {
                    location.uri = this.uriMap.get(location.uri) ?? location.uri;
                }
            });
        }
        return result;
    }
}
