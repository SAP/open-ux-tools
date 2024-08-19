export type CapProjectType = 'CAPJava' | 'CAPNodejs';

export interface CapCustomPaths {
    app: string;
    db: string;
    srv: string;
}

export interface CdsEnvironment {
    folders?: CapCustomPaths;
    i18n?: CapI18n;
}

export interface CapI18n {
    default_language?: string;
    fallback_bundle?: string;
    file?: string;
    folders?: string[];
}

type SELECT = {
    SELECT: {
        distinct?: true;
        one?: boolean;
        from: source;
        columns?: column_expr[];
        excluding?: string[];
        where?: predicate;
        having?: predicate;
        groupBy?: expr[];
        orderBy?: ordering_term[];
        limit?: { rows: number; offset: number };
    };
};
type source = (ref | SELECT) & { as?: name; join?: name; on?: xpr };
type name = string;
type operator = string;
type predicate = _xpr;
type _xpr = (expr | operator)[];
type expr = ref | val | xpr | SELECT;
type ref = { ref: (name & { id?: string; where?: expr; args?: expr[] })[] };
type val = { val: any };
type xpr = { xpr: _xpr };
type ordering_term = expr & { asc?: true; desc?: true };
type column_expr = expr & { as?: name; cast?: any; expand?: column_expr[]; inline?: column_expr[] };

/** A parsed model. */
export type csn = CSN;

export interface CSN {
    /** The assigned namespace. If parsed from multiple sources, this is the topmost model's namespace, if any, not the ones of imported models. */
    namespace?: string;

    /** The list of usings in this parsed model. Not available after imports have been resolved into a merged model. */
    using?: { name: string; as?: string; from?: string }[];

    /** All definitions in the model including those from imported models. */
    definitions?: Definitions;

    /** All extensions in the model including those from imported models. Not available after extensions have been applied. */
    extensions?: Definition[];

    $sources?: string[];
}

export type ServiceDefinitions = Definitions & ((namespace: string) => Definitions) & any[];

interface DefinitionRegistry {
    type: Type;
    struct: Struct;
    entity: Entity;
    Association: Association;
}
type Definition = DefinitionRegistry[keyof DefinitionRegistry];

interface Definitions {
    [name: string]: Definition;
}

type kind = 'context' | 'service' | 'type' | 'entity' | 'element' | 'const' | 'annotation';
type Element = Type &
    Struct &
    Association & {
        kind: 'element' | undefined;
    };

interface Type {
    kind?: kind;
    type?: string;
    name: string;
}

interface Struct extends Type {
    /** structs have elements which are in turn Definitions */
    elements: { [name: string]: Element };
    /** References to definitions to be included. Not available after extensions have been applied. */
    include?: string[];
}

interface Entity extends Struct {
    kind: 'entity';
    /** Entities with a query signify a view */
    query?: SELECT & { cql: string };
    /** Elements of entities may have additional qualifiers */
    elements: {
        [name: string]: Element & {
            key?: boolean;
            virtual?: boolean;
            unique?: boolean;
            notNull?: boolean;
        };
    };
    keys: {
        [name: string]: Definition;
    };
}

interface LinkedDefinition {
    /**
     * Checks if the definition is of the specified kind or has the 'Association' or 'Composition' kind.
     *
     * @param {kind | 'Association' | 'Composition'} kind - The kind to check for.
     * @returns {boolean} - True if the definition is of the specified kind or has the 'Association' or 'Composition' kind, false otherwise.
     */
    is(kind: kind | 'Association' | 'Composition'): boolean;
    name: string;
}
type Filter = string | ((def: Definition) => boolean);
type Visitor = (def: Definition, name: string, parent: Definition, defs: Definitions) => void;

interface Association extends Type {
    type: 'cds.Association' | 'cds.Composition';
    /** The fully-qualified name of the Association's target entity */
    target: string;
    /** The specified cardinality. to-one = {max:1}, to-many = {max:'*'} */
    cardinality?: { src?: 1; min?: 1 | 0; max?: 1 | '*' };
    /** The parsed on condition in case of unmanaged Associations */
    on?: predicate;
    /** The optionally specified keys in case of managed Associations */
    keys?: column_expr[];
}

export interface LinkedModel extends CSN {
    /**
     * Fetches definitions matching the given filter, returning an iterator on them.
     *
     * @example
     * 		let m = cds.reflect (aParsedModel)
     *      for (let d of m.each('entity'))  console.log (d.kind, d.name)
     *      let entities = [...m.each('entity')]  //> capture all
     *      let entities = m.all('entity')          //> equivalent shortcut
     */
    each(x: Filter, defs?: Definitions): IterableIterator<LinkedDefinition>;

    /**
     * Fetches definitions matching the given filter, returning them in an array.
     * Convenience shortcut for `[...reflect.each('entity')]`
     */
    all(x: Filter, defs?: Definitions): LinkedDefinition[];

    /**
     * Fetches definitions matching the given filter, returning the first match, if any.
     *
     * @example
     *      let service = model.find('service')
     * @param {Filter} [x]  the filter
     * @param {Definitions} [defs]  the definitions to fetch in, default: `this.definitions`
     */
    find(x: Filter, defs?: Definitions): LinkedDefinition;

    /**
     * Calls the visitor for each definition matching the given filter.
     *
     * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-reflect-foreach)
     */
    foreach(x?: Filter, visitor?: Visitor, defs?: Definitions): this;

    /**
     * Same as foreach but recursively visits each element definition
     *
     * @see [capire](https://github.wdf.sap.corp/pages/cap/node.js/api#cds-reflect-foreach)
     */
    forall(x?: Filter, visitor?: Visitor, defs?: Definitions): this;

    /**
     * Fetches definitions declared as children of a given parent context or service.
     * It fetches all definitions whose fully-qualified names start with the parent's name.
     * Returns the found definitions as an object with the local names as keys.
     *
     * @example
     *      let service = model.find ('service')
     *      let entities = m.childrenOf (service)
     * @param parent  either the parent itself or its fully-qualified name
     * @param filter  an optional filter to apply before picking a child
     */
    childrenOf(parent: LinkedDefinition | string, filter?: (def: Definition) => boolean): Definitions;

    /**
     * Provides convenient access to the model's top-level definitions.
     * For example, you can use it in an es6-import-like fashion to avoid
     * working with fully-qualified names as follows:
     *
     * @example
     * let model = cds.reflect (cds.parse(`
     *     namespace our.lovely.bookshop;
     *     entity Books {...}
     *     entity Authors {...}
     * `))
     * const {Books,Authors} = model.exports
     * SELECT.from (Books) .where ({ID:11})
     */
    exports: Definitions & ((namespace: string) => Definitions);
    entities: Definitions & ((namespace: string) => Definitions);
    services: Definitions & ((namespace: string) => Definitions);
    definitions: Definitions;
}

export interface ServiceInfo {
    name: string;
    urlPath: string;
    runtime?: string;
    endpoints?: [
        {
            kind: string;
            path: string;
        }
    ];
}

/**
 * CDS version information extracted from package json that was used to compile the project when determining the service.
 */
export interface CdsVersionInfo {
    home: string;
    version: string;
    root: string;
}
