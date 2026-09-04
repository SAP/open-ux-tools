// Shared types for the `lookup_ui5_documentation` tool.
//
// These describe the minimal shape of a UI5 designtime api.json that the lookup relies on, plus the
// resolved-fetch metadata and the result union returned to the caller. The result is a union keyed by
// `lookupType` so further member types (association/control) can extend it later.
//
// Field shapes mirror packages/preview-middleware-client/src/cpe/api-json.d.ts (the authoritative
// api.json schema). Note the gotchas: properties have no `cardinality`, and event `parameters` is a
// record keyed by parameter name, not an array.

/** A single aggregation entry as it appears in a control's `ui5-metadata`. */
export interface Ui5Aggregation {
    name: string;
    type?: string;
    cardinality?: string;
    visibility?: string;
    since?: string;
    description?: string;
}

/** A single property entry as it appears in a control's `ui5-metadata`. Properties have no cardinality. */
export interface Ui5Property {
    name: string;
    type?: string;
    defaultValue?: unknown;
    group?: string;
    visibility?: string;
    bindable?: boolean;
    since?: string;
    description?: string;
}

/** A single event parameter, as a value of the `Ui5Event.parameters` record. */
export interface Ui5EventParameter {
    name: string;
    type?: string;
    description?: string;
    since?: string;
}

/** A single event entry as it appears in a control's `ui5-metadata`. `parameters` is a record, not an array. */
export interface Ui5Event {
    name: string;
    visibility?: string;
    since?: string;
    description?: string;
    parameters?: Record<string, Ui5EventParameter>;
    allowPreventDefault?: boolean;
    enableEventBubbling?: boolean;
}

/** A symbol (control/class) entry within an api.json `symbols` array. */
export interface Ui5Symbol {
    name: string;
    /** Fully-qualified name of the parent class, when this symbol extends another. */
    extends?: string;
    'ui5-metadata'?: {
        properties?: Ui5Property[];
        aggregations?: Ui5Aggregation[];
        events?: Ui5Event[];
    };
}

/** Minimal shape of a UI5 designtime api.json that this lookup relies on. */
export interface ApiJson {
    /** Top-level library name of the file (there is no per-symbol library field). */
    library?: string;
    symbols?: Ui5Symbol[];
}

/** Successful outcome of fetching (or cache-reading) an api.json document. */
export interface FetchApiJsonSuccess {
    data: ApiJson;
    source: 'cache' | 'network';
    url: string;
}

/** Failed outcome of a single api.json fetch attempt. */
export interface FetchApiJsonError {
    error: string;
    url: string;
    status?: number;
}

export type FetchApiJsonResult = FetchApiJsonSuccess | FetchApiJsonError;

/** Result of the multi-attempt resolve, carrying the base/version that actually succeeded. */
export interface ResolveApiJsonResult extends FetchApiJsonSuccess {
    base: string;
    version: string | null;
}

/** Provenance of a lookup result: which url/base/version served it and whether a fallback was used. */
export interface LookupSource {
    url: string;
    mode: 'cache' | 'network';
    base: string;
    version: string | null;
    fallbackUsed: boolean;
}

/** Documentation for a single control aggregation. */
export interface AggregationLookupResult {
    lookupType: 'aggregation';
    library: string;
    control: string;
    /** Fully-qualified name of the class that actually declares this member. */
    definedIn: string;
    /** True when `definedIn` differs from `control` (the member is inherited from an ancestor). */
    inherited: boolean;
    aggregation: string;
    type?: string;
    cardinality?: string;
    visibility?: string;
    since: string | null;
    description: string | null;
    source: LookupSource;
}

/** Documentation for a single control property. */
export interface PropertyLookupResult {
    lookupType: 'property';
    library: string;
    control: string;
    definedIn: string;
    inherited: boolean;
    property: string;
    type?: string;
    defaultValue?: unknown;
    group?: string;
    visibility?: string;
    bindable?: boolean;
    since: string | null;
    description: string | null;
    source: LookupSource;
}

/** Documentation for a single control event, with its parameters preserved as a record. */
export interface EventLookupResult {
    lookupType: 'event';
    library: string;
    control: string;
    definedIn: string;
    inherited: boolean;
    event: string;
    visibility?: string;
    parameters?: Record<string, Ui5EventParameter>;
    since: string | null;
    description: string | null;
    source: LookupSource;
}

/**
 * Structured documentation returned by the tool. A union keyed by `lookupType`; widens as further
 * lookup types are added.
 */
export type LookupUi5DocumentationResult = AggregationLookupResult | PropertyLookupResult | EventLookupResult;
