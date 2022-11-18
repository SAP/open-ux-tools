export type CapProjectType = 'CAPJava' | 'CAPNodejs';

export interface CapCustomPaths {
    app: string;
    db: string;
    srv: string;
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
