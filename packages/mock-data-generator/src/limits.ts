/**
 * Tunable limits of the generator, each named once with the reason for its value. These are product
 * decisions, not specification constants (those live in `src/spec/`) and not domain data (that lives
 * in the versioned resources under `resources/`).
 */

/**
 * Most rows one entity set may hold, whether requested, authored by the caller or projected for a value
 * list. It bounds the result a mock server publishes per collection and keeps key-capacity planning
 * finite.
 */
export const MAX_ROWS_PER_ENTITY = 1_000;

/**
 * Key capacity reported for a domain with more distinct keys than any entity may need. Capacities are
 * saturated at one above {@link MAX_ROWS_PER_ENTITY}, so products of key cardinalities stay small and a
 * saturated capacity still compares as "enough for every allowed row count".
 */
export const SATURATED_KEY_CAPACITY = MAX_ROWS_PER_ENTITY + 1;

/** Maximum UTF-8 size accepted for one EDMX or CSN input, checked before hashing or parsing. */
export const MAX_METADATA_INPUT_BYTES = 32 * 1024 * 1024;

/** Keep complete generation inside the standard FE host's aggregate result ceiling. */
export const MAX_GENERATED_RESULT_BYTES = 64 * 1024 * 1024;

/**
 * Default time budget of the fine-tuned (SFT) tier for one whole service, in milliseconds. When it is
 * spent, the remaining entity sets keep their deterministic values.
 */
export const DEFAULT_SFT_SERVICE_BUDGET_MS = 20_000;

/**
 * Budget preset of the `data-editor` execution mode, for an interactive editor that waits for the result:
 * the SFT service budget, in milliseconds. The `api` and `start-mock` modes apply no preset and use the
 * defaults of the generation options.
 */
export const DATA_EDITOR_SFT_BUDGET_MS = DEFAULT_SFT_SERVICE_BUDGET_MS;

/** Budget preset of the `data-editor` execution mode: the time limit of one SFT entity run, in milliseconds. */
export const DATA_EDITOR_SFT_ENTITY_TIMEOUT_MS = 30_000;

/** Budget preset of the `data-editor` execution mode: the rows per entity set the SFT model writes. */
export const DATA_EDITOR_SFT_MODEL_ROWS = 4;

/** Budget preset of the `data-editor` execution mode: the overall SFT deadline, in milliseconds. */
export const DATA_EDITOR_SFT_DEADLINE_MS = 20_000;

/**
 * Budget preset of the `data-editor` execution mode: the fields the SFT model writes per call. On a
 * two-core workspace a call of three fields for four rows takes three to five seconds and a call of four
 * fields up to seven, so three fields per call let a wide entity set keep model values within the
 * editor's deadline.
 */
export const DATA_EDITOR_SFT_FIELDS_PER_CALL = 3;

/** Default time limit of one SFT model run for one entity set, in milliseconds. */
export const DEFAULT_SFT_ENTITY_TIMEOUT_MS = 90_000;

/** Largest SFT service budget or per-entity timeout a caller may set, in milliseconds. */
export const MAX_SFT_TIME_LIMIT_MS = 120_000;

/** Largest overall SFT deadline a caller may set, in milliseconds. */
export const MAX_SFT_DEADLINE_MS = 600_000;

/**
 * Default number of fields the SFT model writes in one call. Fewer fields per call keep the prompt
 * and the grammar-bounded output short for the packaged small model; coupled fields always share a call
 * even when that exceeds this number. Callers can override it with `maxFieldsPerPrompt`.
 */
export const DEFAULT_SFT_FIELDS_PER_CALL = 8;

/** Largest number of fields per SFT call a caller may set. */
export const MAX_SFT_FIELDS_PER_CALL = 64;

/**
 * Rows the SFT model decodes together. Smaller batches complete progressively, so a time budget that
 * runs out keeps the rows that have already finished.
 */
export const SFT_BATCH_ROWS = 4;

/** Default first day of the deterministic date window, as an ISO 8601 date (UTC). */
export const DEFAULT_REFERENCE_DATE = '2020-01-01';

/** Default length of the deterministic date window in calendar years: 2020-01-01 to 2025-12-31. */
export const DEFAULT_WINDOW_YEARS = 6;

/** Longest date window a caller may set, in calendar years. */
export const MAX_WINDOW_YEARS = 100;

/**
 * Days after the reference date over which a seeded key-date sequence may start (five 365-day years);
 * the window's length caps it. Each key date then advances one day (or one second) per key ordinal.
 */
export const KEY_DATE_SPREAD_DAYS = 1_825;

/** Default number of model completions an in-memory or file completion store keeps. */
export const DEFAULT_COMPLETION_STORE_ENTRIES = 20_000;

/**
 * Longest string, in characters, the SFT model is asked to write for one field. Longer string fields
 * keep their deterministic values: the packaged small model degrades on long free text, and the bound
 * keeps each grammar-constrained decode short.
 */
export const MAX_SFT_STRING_LENGTH = 80;

/**
 * Shortest SFT model call worth making, in milliseconds. On a two-core workspace a resource needs a few
 * seconds to produce any rows, so slices shorter than this only spend time and fall back anyway.
 */
export const MINIMUM_SFT_ATTEMPT_MS = 4_000;

/**
 * Time kept back from a caller's generation deadline, in milliseconds, for finalization and validation
 * after the SFT tier returns.
 */
export const DEADLINE_FINALIZATION_RESERVE_MS = 300;

/** Fields the semantic classifier embeds in one batch by default. */
export const DEFAULT_CLASSIFIER_BATCH_SIZE = 32;

/**
 * Largest classifier batch a caller may set. One batch is one encoder call, so the bound caps the
 * native memory of a single call.
 */
export const MAX_CLASSIFIER_BATCH_SIZE = 256;

/**
 * Field texts whose classification the embedding classifier remembers, most recent first. A session
 * reuses them across requests and across services, which share many fields. Measured on 200 services
 * classified in one session: 50,104 distinct texts at about 740 bytes each. A bound below that working
 * set re-embeds shared fields (10,000 entries made such a session 29% slower); this one keeps it and
 * caps the cache at about 75 MB.
 */
export const CLASSIFIER_CACHE_ENTRIES = 100_000;

/**
 * Grammar states whose allowed-token set the SFT decoder remembers. Each entry holds at most one
 * vocabulary-sized `Int32Array`, so the bound caps that cache at a few tens of megabytes.
 */
export const SFT_ALLOWED_TOKEN_CACHE_ENTRIES = 512;

/** Grammar-forced texts whose tokenization the SFT decoder remembers. */
export const SFT_FORCED_TEXT_CACHE_ENTRIES = 4_096;
