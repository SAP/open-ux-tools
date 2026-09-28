import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { ConceptBank, SyntheticSampleDataset } from '../types.js';

/**
 * The single store of every value bank the generator draws from, `resources/banks/value-banks.v1.json`.
 *
 * A bank is keyed by its label, `<kind>:<id>`:
 * - `role` banks feed the role value providers: names, organizations, descriptions, locations, units,
 *   statuses and the other descriptive samples. They are package-authored synthetic examples, not
 *   application facts or a realism oracle; application evidence always overrides them.
 * - `concept` banks hold the values of the classifier's concept head (head B), keyed by concept id. The
 *   head itself carries only prototypes, thresholds and acceptance inputs.
 *
 * A bank holds `values` (strings, or integers for `integer` banks), code/text `pairs`, a numeric `range`
 * or structured `records` whose fields the bank declares. Value order is behaviour: generators index
 * banks by a row hash.
 */
export const VALUE_BANK_STORE_ID = 'mockgen-value-banks';
export const VALUE_BANK_STORE_VERSION = '1';
export const VALUE_BANK_STORE_PATH = 'resources/banks/value-banks.v1.json';

export type ValueBankKind = 'role' | 'concept';
export type RecordFieldType = 'string' | 'integer';
export type RecordFields = Readonly<Record<string, RecordFieldType>>;
/** A structured record whose field types follow the declared field map. */
export type BankRecord<Fields extends RecordFields> = {
    readonly [Name in keyof Fields]: Fields[Name] extends 'integer' ? number : string;
};

interface BankIdentity {
    readonly label: string;
    readonly id: string;
}

/** Strings drawn by row hash: codes, names, texts or identifiers. */
export interface StringValueBank extends BankIdentity {
    readonly kind: 'role';
    readonly valueKind: 'code' | 'name' | 'text' | 'identifier';
    readonly values: ReadonlyArray<string>;
}

/** Integers drawn by row hash, such as field-control states. */
export interface IntegerValueBank extends BankIdentity {
    readonly kind: 'role';
    readonly valueKind: 'integer';
    readonly values: ReadonlyArray<number>;
}

/** Codes with their display text, kept together so a row reads coherently. */
export interface PairValueBank extends BankIdentity {
    readonly kind: 'role';
    readonly valueKind: 'code-text';
    readonly pairs: ReadonlyArray<Readonly<{ code: string; text: string }>>;
}

/** Structured records whose fields stay together, such as a city with its region and postal code. */
export interface RecordValueBank extends BankIdentity {
    readonly kind: 'role';
    readonly valueKind: 'record';
    readonly fields: RecordFields;
    readonly records: ReadonlyArray<Readonly<Record<string, string | number>>>;
}

/** The value bank of one classifier concept; the head's acceptance inputs are joined at load time. */
export type ConceptValueBank = Omit<ConceptBank, 'minimumSimilarity' | 'cohesion'> & {
    readonly kind: 'concept';
    readonly label: string;
};

export type ValueBank = StringValueBank | IntegerValueBank | PairValueBank | RecordValueBank | ConceptValueBank;

export interface ValueBankStore {
    readonly format: 'mockgen-value-banks';
    readonly version: 1;
    readonly banks: ReadonlyMap<string, ValueBank>;
}

const STORE_KEYS = new Set(['format', 'version', 'banks']);
const CONCEPT_VALUE_KINDS = new Set(['code', 'code-text', 'name', 'text', 'identifier', 'number', 'decimal']);
const ROLE_STRING_KINDS = new Set(['code', 'name', 'text', 'identifier']);
const BANK_ID = /^[a-z0-9][a-z0-9_.-]*$/u;

/** The keys each bank shape may carry; anything else is a store error, not an ignored extra. */
const BANK_KEYS: Readonly<Record<string, ReadonlySet<string>>> = {
    'role-values': new Set(['kind', 'id', 'valueKind', 'values']),
    'role-pairs': new Set(['kind', 'id', 'valueKind', 'pairs']),
    'role-records': new Set(['kind', 'id', 'valueKind', 'fields', 'records']),
    'concept-values': new Set(['kind', 'id', 'name', 'valueKind', 'types', 'values']),
    'concept-pairs': new Set(['kind', 'id', 'name', 'valueKind', 'types', 'pairs']),
    'concept-range': new Set(['kind', 'id', 'name', 'valueKind', 'types', 'range'])
};

/**
 * A plain JSON object, or a TypeError naming what was expected.
 *
 * @param value candidate value
 * @param label what the value is, for the error message
 * @returns the object
 */
function objectRecord(value: unknown, label: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value as Record<string, unknown>;
}

/**
 * Reject keys outside the allowed set, so a misspelt or stray key is an error rather than ignored.
 *
 * @param input object to check
 * @param allowed the keys the shape may carry
 * @param label what the object is, for the error message
 */
function assertKeys(input: Record<string, unknown>, allowed: ReadonlySet<string>, label: string): void {
    const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
    if (unexpected.length > 0) {
        throw new TypeError(`${label} has unexpected keys: ${unexpected.join(', ')}`);
    }
}

/**
 * A frozen, non-empty list of non-empty strings.
 *
 * @param value candidate list
 * @param label what the list is, for the error message
 * @returns the frozen list
 */
function nonEmptyStrings(value: unknown, label: string): ReadonlyArray<string> {
    if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((entry) => typeof entry !== 'string' || entry.length === 0)
    ) {
        throw new TypeError(`${label} must be a non-empty list of non-empty strings`);
    }
    return Object.freeze([...(value as string[])]);
}

/**
 * Frozen code/text pairs, each with exactly a non-empty code and text.
 *
 * @param value candidate pair list
 * @param label what the list is, for the error message
 * @returns the frozen pairs
 */
function parsePairs(value: unknown, label: string): PairValueBank['pairs'] {
    if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError(`${label} must be a non-empty list of code/text pairs`);
    }
    return Object.freeze(
        value.map((entry: unknown, index) => {
            const pair = objectRecord(entry, `${label}[${index}]`);
            assertKeys(pair, new Set(['code', 'text']), `${label}[${index}]`);
            const { code, text } = pair;
            if (typeof code !== 'string' || typeof text !== 'string' || !code || !text) {
                throw new TypeError(`${label}[${index}] needs a non-empty code and text`);
            }
            return Object.freeze({ code, text });
        })
    );
}

/**
 * The declared fields of a record bank and its records, each checked against those fields.
 *
 * @param input the bank object
 * @param label the bank label, for the error message
 * @returns the frozen field map and records
 */
function parseRecords(input: Record<string, unknown>, label: string): Pick<RecordValueBank, 'fields' | 'records'> {
    const fieldsInput = objectRecord(input.fields, `${label} fields`);
    const names = Object.keys(fieldsInput);
    if (names.length === 0 || names.some((name) => fieldsInput[name] !== 'string' && fieldsInput[name] !== 'integer')) {
        throw new TypeError(`${label} fields must map each field name to "string" or "integer"`);
    }
    const fields = Object.freeze({ ...(fieldsInput as Record<string, RecordFieldType>) });
    if (!Array.isArray(input.records) || input.records.length === 0) {
        throw new TypeError(`${label} records must be a non-empty list`);
    }
    const records = input.records.map((entry: unknown, index) => {
        const recordLabel = `${label} records[${index}]`;
        const item = objectRecord(entry, recordLabel);
        assertKeys(item, new Set(names), recordLabel);
        for (const name of names) {
            const field = item[name];
            const valid =
                fields[name] === 'integer'
                    ? typeof field === 'number' && Number.isSafeInteger(field)
                    : typeof field === 'string' && field.length > 0;
            if (!valid) {
                throw new TypeError(
                    `${recordLabel}.${name} must be ${fields[name] === 'integer' ? 'an integer' : 'a non-empty string'}`
                );
            }
        }
        return Object.freeze({ ...(item as Record<string, string | number>) });
    });
    return { fields, records: Object.freeze(records) };
}

/**
 * A role bank of one of the role value kinds.
 *
 * @param input the bank object
 * @param label the bank label
 * @param id the bank id
 * @returns the frozen bank
 */
function parseRoleBank(input: Record<string, unknown>, label: string, id: string): ValueBank {
    const { valueKind } = input;
    if (typeof valueKind === 'string' && ROLE_STRING_KINDS.has(valueKind)) {
        assertKeys(input, BANK_KEYS['role-values'], label);
        return Object.freeze({
            label,
            kind: 'role',
            id,
            valueKind: valueKind as StringValueBank['valueKind'],
            values: nonEmptyStrings(input.values, `${label} values`)
        });
    }
    if (valueKind === 'integer') {
        assertKeys(input, BANK_KEYS['role-values'], label);
        const values = input.values;
        if (
            !Array.isArray(values) ||
            values.length === 0 ||
            values.some((entry) => typeof entry !== 'number' || !Number.isSafeInteger(entry))
        ) {
            throw new TypeError(`${label} values must be a non-empty list of integers`);
        }
        return Object.freeze({ label, kind: 'role', id, valueKind, values: Object.freeze([...(values as number[])]) });
    }
    if (valueKind === 'code-text') {
        assertKeys(input, BANK_KEYS['role-pairs'], label);
        return Object.freeze({ label, kind: 'role', id, valueKind, pairs: parsePairs(input.pairs, `${label} pairs`) });
    }
    if (valueKind === 'record') {
        assertKeys(input, BANK_KEYS['role-records'], label);
        return Object.freeze({ label, kind: 'role', id, valueKind, ...parseRecords(input, label) });
    }
    throw new TypeError(`${label} has an unsupported role value kind`);
}

/**
 * A concept bank: a name, the primitive types it was observed with, and values, pairs or a range.
 *
 * @param input the bank object
 * @param label the bank label
 * @param id the concept id
 * @returns the frozen bank
 */
function parseConceptBank(input: Record<string, unknown>, label: string, id: string): ConceptValueBank {
    const { name, valueKind } = input;
    if (typeof name !== 'string' || name.length === 0) {
        throw new TypeError(`${label} needs a name`);
    }
    if (typeof valueKind !== 'string' || !CONCEPT_VALUE_KINDS.has(valueKind)) {
        throw new TypeError(`${label} has an unsupported concept value kind`);
    }
    const kind = valueKind as ConceptBank['valueKind'];
    const types = nonEmptyStrings(input.types, `${label} types`);
    const identity = { label, kind: 'concept', id, name, valueKind: kind, types } as const;
    if (kind === 'code-text') {
        assertKeys(input, BANK_KEYS['concept-pairs'], label);
        return Object.freeze({ ...identity, pairs: parsePairs(input.pairs, `${label} pairs`) });
    }
    if (kind === 'number' || kind === 'decimal') {
        assertKeys(input, BANK_KEYS['concept-range'], label);
        const range = objectRecord(input.range, `${label} range`);
        assertKeys(range, new Set(['min', 'max', 'scale']), `${label} range`);
        const { min, max, scale } = range;
        if (
            typeof min !== 'number' ||
            typeof max !== 'number' ||
            typeof scale !== 'number' ||
            !(min <= max) ||
            !Number.isInteger(scale) ||
            scale < 0
        ) {
            throw new TypeError(`${label} needs a numeric range`);
        }
        return Object.freeze({ ...identity, range: Object.freeze({ min, max, scale }) });
    }
    assertKeys(input, BANK_KEYS['concept-values'], label);
    return Object.freeze({ ...identity, values: nonEmptyStrings(input.values, `${label} values`) });
}

/**
 * Validate a value-bank store document against its strict schema.
 *
 * @param value parsed JSON document
 * @returns the validated, frozen store
 * @example
 * parseValueBankStore({ format: 'mockgen-value-banks', version: 1, banks: {
 *     'role:currencies': { kind: 'role', id: 'currencies', valueKind: 'code', values: ['EUR', 'USD'] }
 * } });
 */
export function parseValueBankStore(value: unknown): ValueBankStore {
    const input = objectRecord(value, 'value-bank store');
    assertKeys(input, STORE_KEYS, 'value-bank store');
    if (input.format !== 'mockgen-value-banks' || input.version !== 1) {
        throw new TypeError('unsupported value-bank store format');
    }
    const entries = Object.entries(objectRecord(input.banks, 'value-bank store banks'));
    if (entries.length === 0) {
        throw new TypeError('value-bank store has no banks');
    }
    const banks = new Map<string, ValueBank>();
    for (const [label, entry] of entries) {
        const bank = objectRecord(entry, `bank ${label}`);
        const { kind, id } = bank;
        if ((kind !== 'role' && kind !== 'concept') || typeof id !== 'string' || !BANK_ID.test(id)) {
            throw new TypeError(`bank ${label} needs a role or concept kind and a lower-case id`);
        }
        if (label !== `${kind}:${id}`) {
            throw new TypeError(`bank ${label} must be labelled ${kind}:${id}`);
        }
        banks.set(label, kind === 'role' ? parseRoleBank(bank, label, id) : parseConceptBank(bank, label, id));
    }
    return Object.freeze({ format: 'mockgen-value-banks', version: 1, banks });
}

/**
 * The role bank with an id, if any.
 *
 * @param store value-bank store
 * @param id role bank id
 * @returns the bank, or undefined
 */
function roleBank(store: ValueBankStore, id: string): Exclude<ValueBank, ConceptValueBank> | undefined {
    const bank = store.banks.get(`role:${id}`);
    return bank?.kind === 'role' ? bank : undefined;
}

/**
 * The strings of a role bank, or undefined when the store has no such string bank.
 *
 * @param store value-bank store
 * @param id role bank id, such as `currencies` or a role name like `language`
 * @returns the bank's values in store order
 */
export function roleBankValues(store: ValueBankStore, id: string): ReadonlyArray<string> | undefined {
    const bank = roleBank(store, id);
    return bank && bank.valueKind !== 'integer' && 'values' in bank ? bank.values : undefined;
}

/**
 * The strings of a role bank the package cannot work without.
 *
 * @param store value-bank store
 * @param id role bank id
 * @returns the bank's values in store order
 */
export function requiredRoleBankValues(store: ValueBankStore, id: string): ReadonlyArray<string> {
    const values = roleBankValues(store, id);
    if (!values) {
        throw new TypeError(`The value-bank store lacks the string bank role:${id}`);
    }
    return values;
}

/**
 * The integers of a role bank the package cannot work without.
 *
 * @param store value-bank store
 * @param id role bank id
 * @returns the bank's integers in store order
 */
export function requiredIntegerBankValues(store: ValueBankStore, id: string): ReadonlyArray<number> {
    const bank = roleBank(store, id);
    if (bank?.valueKind !== 'integer') {
        throw new TypeError(`The value-bank store lacks the integer bank role:${id}`);
    }
    return bank.values;
}

/**
 * The code/text pairs of a role bank the package cannot work without.
 *
 * @param store value-bank store
 * @param id role bank id
 * @returns the bank's pairs in store order
 */
export function requiredPairBankValues(store: ValueBankStore, id: string): PairValueBank['pairs'] {
    const bank = roleBank(store, id);
    if (bank?.valueKind !== 'code-text') {
        throw new TypeError(`The value-bank store lacks the code/text bank role:${id}`);
    }
    return bank.pairs;
}

/**
 * The records of a role bank, checked against the fields the caller relies on.
 *
 * @param store value-bank store
 * @param id role bank id
 * @param fields the exact field map the caller expects
 * @returns the bank's records in store order, typed by the field map
 */
export function requiredRecordBankValues<Fields extends RecordFields>(
    store: ValueBankStore,
    id: string,
    fields: Fields
): ReadonlyArray<BankRecord<Fields>> {
    const bank = roleBank(store, id);
    if (bank?.valueKind !== 'record') {
        throw new TypeError(`The value-bank store lacks the record bank role:${id}`);
    }
    const declared = Object.entries(bank.fields).sort(([left], [right]) => left.localeCompare(right));
    const expected = Object.entries(fields).sort(([left], [right]) => left.localeCompare(right));
    if (JSON.stringify(declared) !== JSON.stringify(expected)) {
        throw new TypeError(`The record bank role:${id} does not declare the fields the generator uses`);
    }
    // The parser checked every record against the declared fields, which equal the expected ones.
    return bank.records as ReadonlyArray<BankRecord<Fields>>;
}

/**
 * The value bank of a classifier concept.
 *
 * @param store value-bank store
 * @param id concept id
 * @returns the concept's bank, or undefined when the store has none
 */
export function conceptValueBank(store: ValueBankStore, id: string): ConceptValueBank | undefined {
    const bank = store.banks.get(`concept:${id}`);
    return bank?.kind === 'concept' ? bank : undefined;
}

/**
 * Read, digest and validate the packaged store once; any defect stops the package from loading.
 *
 * @returns the store and the SHA-256 of the bytes that were parsed
 */
function loadPackagedStore(): Readonly<{ store: ValueBankStore; sha256: string }> {
    const bytes = readFileSync(new URL(`../../${VALUE_BANK_STORE_PATH}`, import.meta.url));
    return Object.freeze({
        store: parseValueBankStore(JSON.parse(bytes.toString('utf8')) as unknown),
        sha256: createHash('sha256').update(bytes).digest('hex')
    });
}

const PACKAGED = loadPackagedStore();
/** The packaged store, validated once at load. */
export const VALUE_BANKS = PACKAGED.store;
/** SHA-256 of the exact store bytes that were parsed; the package manifest must declare the same digest. */
export const VALUE_BANK_STORE_SHA256 = PACKAGED.sha256;

/**
 * The value bank of a classifier concept in the packaged store.
 *
 * @param id concept id
 * @returns the concept's bank, or undefined when the store has none
 */
export function packagedConceptBank(id: string): ConceptValueBank | undefined {
    return conceptValueBank(VALUE_BANKS, id);
}

export const LOCATIONS = requiredRecordBankValues(VALUE_BANKS, 'locations', {
    city: 'string',
    country: 'string',
    countryName: 'string',
    region: 'string',
    regionName: 'string',
    postalCode: 'string',
    phonePrefix: 'string',
    phoneSubscriberDigits: 'integer',
    mobilePrefix: 'string',
    mobileSubscriberDigits: 'integer'
});
export const DATA_ENRICHMENT_LOCATIONS = requiredRecordBankValues(VALUE_BANKS, 'data-enrichment-locations', {
    city: 'string',
    country: 'string',
    district: 'string',
    postalCode: 'string',
    region: 'string',
    streetAddress: 'string'
});
export const UNIT_SAMPLES = requiredRecordBankValues(VALUE_BANKS, 'units', {
    code: 'string',
    iso: 'string',
    text: 'string'
});
export const UNITS: ReadonlyArray<string> = Object.freeze(UNIT_SAMPLES.map(({ code }) => code));
export const UNIT_ISO_CODES: Readonly<Record<string, string>> = Object.freeze(
    Object.fromEntries(UNIT_SAMPLES.map(({ code, iso }) => [code, iso]))
);
export const CURRENCIES = requiredRoleBankValues(VALUE_BANKS, 'currencies');
export const STATUS_SAMPLES = requiredPairBankValues(VALUE_BANKS, 'statuses');
export const PRODUCTS = requiredRoleBankValues(VALUE_BANKS, 'products');
export const EQUIPMENT_NAMES = requiredRoleBankValues(VALUE_BANKS, 'equipment-names');
export const ETHNICITIES = requiredRoleBankValues(VALUE_BANKS, 'ethnicities');
export const FIELD_CONTROL_VALUES = requiredIntegerBankValues(VALUE_BANKS, 'field-control-values');
export const MEASUREMENT_DIMENSIONS = requiredRoleBankValues(VALUE_BANKS, 'measurement-dimensions');
export const PRICE_SOURCES = requiredRoleBankValues(VALUE_BANKS, 'price-sources');
export const ACCOUNT_DESCRIPTIONS = requiredRoleBankValues(VALUE_BANKS, 'account-descriptions');
export const BANK_NAMES = requiredRoleBankValues(VALUE_BANKS, 'bank-names');

/**
 * Descriptive samples addressed by semantic role name (for example `language` or `bic`).
 *
 * @param role semantic role, or a sample family such as `street_name`
 * @returns the samples, or undefined when the store has no bank for the role
 */
export function roleSamples(role: string): ReadonlyArray<string> | undefined {
    return roleBankValues(VALUE_BANKS, role);
}

/**
 * The default names, organizations and descriptions. Hosts may replace them through the
 * `sampleDataset` option; the identity names this sample set, whose content is unchanged since
 * version 1, so generation provenance stays comparable across releases.
 */
export const DEFAULT_SAMPLE_DATASET: SyntheticSampleDataset = Object.freeze({
    id: 'offline-text-samples',
    version: '1',
    firstNames: requiredRoleBankValues(VALUE_BANKS, 'first-names'),
    lastNames: requiredRoleBankValues(VALUE_BANKS, 'last-names'),
    organizations: requiredRoleBankValues(VALUE_BANKS, 'organizations'),
    descriptions: requiredRoleBankValues(VALUE_BANKS, 'descriptions')
});
