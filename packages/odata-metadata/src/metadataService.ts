import type { Namespace, TargetKind, Location } from '@sap-ux/odata-annotation-core-types';
import { Edm } from '@sap-ux/odata-annotation-core-types';

import type {
    MetadataElement,
    MetadataMap,
    Path,
    ODataVersionType,
    MetadataServiceOptions,
    MetadataElementVisitor
} from './types';

// Mapping of action/function names to all their overloads
type ActionNameMap = Map<Path, Set<Path>>;

// OData conform target kinds for CDS kinds
const targetKindsCds = {
    service: [Edm.EntityContainer],
    entitySet: [Edm.EntitySet],
    entity: [Edm.EntityType, Edm.EntitySet],
    view: [Edm.EntityType, Edm.EntitySet],
    aspect: [Edm.ComplexType, Edm.EntityType, Edm.EntitySet],
    element: [Edm.Property],
    action: [Edm.Action, Edm.ActionImport],
    // TODO: check if we can remove this rule as it seems its only relevant for ES3
    // eslint-disable-next-line quote-props
    function: [Edm.Function, Edm.FunctionImport],
    actionImport: [Edm.Action],
    functionImport: [Edm.FunctionImport],
    param: [Edm.Parameter],
    type: [Edm.TypeDefinition, Edm.Property, Edm.Parameter]
};
const targetKindsMapCds: Map<string, string[]> = new Map(Object.entries(targetKindsCds));

function getActionName(name: Path): Path {
    // extract action/function name by removing the part enclosed in parentheses
    const partsOpen = name.split('(');
    const partsClose = name.split(')');
    return partsOpen.length > 1 && partsClose.length > 1 ? (partsOpen.shift() ?? '') + (partsClose.pop() ?? '') : name;
}

function buildMetadataElementLookup(
    metadata: MetadataMap,
    actionNames: ActionNameMap,
    namespaces: Set<Namespace>,
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
function getNamespace(path: string): Namespace {
    let namespace: Namespace = '';
    const firstSegment = path.split('/')[0];
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
export class MetadataService {
    /**
     * Keeps all metadata based on file level (for invalidation when file changes)
     */
    private metadata: MetadataMap = new Map();

    /**
     * Keeps all namespaces based on file level (for invalidation when file changes)
     */
    private namespaces = new Set<Namespace>();

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
     * @param path
     * @returns
     */
    private getMetadataElementLocationsInternal(path: string): Location[] | Location {
        const locations: Location[] = [];
        const mdElements: MetadataElement[] = [];
        const mdElement = this.lookup(path);
        if (mdElement) {
            mdElements.push(mdElement);
        } else {
            // action/function name? find all action/function overloads

            const overloadPaths = this.actionNames.get(path);
            if (overloadPaths) {
                for (const overloadPath of overloadPaths) {
                    const mdElement = this.getMetadataElement(overloadPath);
                    if (mdElement) {
                        mdElements.push(mdElement);
                    }
                }
            }
        }
        // build locations
        for (const mdElement of mdElements) {
            if (mdElement.location) {
                locations.push(mdElement.location);
            }
        }
        return locations.length === 1 ? locations[0] : locations;
    }

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
     * Create new metadata service instance.
     *
     * @param options
     */
    constructor(options?: MetadataServiceOptions) {
        this.ODataVersion = options?.ODataVersion || '';
        this.isCds = options?.isCds !== undefined ? options.isCds : this.ODataVersion === '';
        this.uriMap = options?.uriMap || new Map();
    }

    /**
     * Set map of uris from relative to absolute.
     *
     * @param uriMap
     */
    setUriMap(uriMap: Map<string, string>): void {
        this.uriMap = uriMap;
    }

    /**
     * Import metadata.
     *
     * @param rootNodes
     *
     * The metadata is cached and invalidated (on file change) based on file level
     */
    import(rootNodes: MetadataElement[]): void {
        // build map of all metadata elements contained in file
        const metadataMap: MetadataMap = new Map();
        const actionNameMap: ActionNameMap = new Map();
        const namespaceSet: Set<Namespace> = new Set();

        buildMetadataElementLookup(metadataMap, actionNameMap, namespaceSet, rootNodes);

        this.namespaces = namespaceSet;
        this.actionNames = actionNameMap;
        this.metadata = metadataMap;
    }

    /**
     * Traverses all metadata elements and calls visitor function for each element.
     *
     * @param visitElement
     */
    visitMetadataElements(visitElement: MetadataElementVisitor): void {
        for (const [, element] of this.metadata.entries()) {
            visitElement(element);
        }
    }

    /**
     * Returns namespaces representing metadata.
     *
     * @returns
     */
    getNamespaces(): Set<Namespace> {
        return new Set([...this.namespaces]);
    }

    /**
     * Returns all metadata root elements.
     *
     * @returns
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
     * @returns
     */
    getMetadataElement(path: Path): MetadataElement | undefined {
        const element = this.lookup(path);
        if (element) {
            return element;
        }
        if (!element && path) {
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
        }
    }

    /**
     * Get Action or Function overloads by their top level name.
     *
     * @param topLevelName
     * @returns
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
        const targetKinds: TargetKind[] = [];
        if (this.isCds) {
            targetKinds.push(...(targetKindsMapCds.get(element.kind) || []));
            if (element.kind === 'element' && element.structuredType && element.isEntityType) {
                // CDS elements pointing to an entity type can be annotated like a EDMX navigation property
                targetKinds.unshift(Edm.NavigationProperty);
            }
        } else {
            targetKinds.push(element.kind);
            if (element.kind === Edm.FunctionImport && this.ODataVersion !== '4.0') {
                // vocabulary and annotation files are defined based on OData v4, but are used to annotate both OData v2 and OData v4 metadata.
                // OData v2 does not have 'Action' but only 'FunctionImport'. Map to 'Action' to support annotating 'FunctionImport' with terms targeting actions.
                targetKinds.push(Edm.Action);
            }
        }
        if (targetKinds.includes(Edm.EntitySet) || element.isCollectionValued) {
            targetKinds.push(Edm.Collection);
        }
        return targetKinds;
    }

    /**
     * Get (LSP) Locations of metadata element.
     *
     * @param path - path identifying metadata element
     * @returns Locations for the metadata element
     */
    getMetadataElementLocations(path: string): Location[] | Location {
        const result = this.getMetadataElementLocationsInternal(path);
        if (this.uriMap) {
            // map locations of result to external uri
            if (Array.isArray(result)) {
                result.forEach((location) => (location.uri = this.uriMap.get(location.uri) || location.uri));
            } else if (result) {
                result.uri = this.uriMap.get(result.uri) || result.uri;
            }
        }
        return result;
    }
}
