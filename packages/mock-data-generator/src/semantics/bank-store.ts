import type { ConceptBank, SyntheticSampleDataset, SyntheticScenario } from '../types.js';
import { compareCodePoints } from '../ordering.js';
import { assertKeys, nonEmptyString, nonEmptyStrings, objectRecord } from './strict-json.js';
import { lazy } from '../lazy.js';
import { loadDomainResource, packagedResourceInvalid } from './resource-integrity.js';

/**
 * The single store of every value bank the generator draws from, `resources/banks/value-banks.v2.json`.
 *
 * A bank is keyed by its label, `<kind>:<id>`:
 * - `role` banks feed the role value providers: names, organizations, descriptions, locations, units,
 *   statuses and the other descriptive samples. They are package-authored synthetic examples, not
 *   application facts or a realism oracle; application evidence always overrides them.
 * - `concept` banks hold the values of the classifier's concept head (head B), keyed by concept id. The
 *   head itself carries only prototypes and thresholds.
 *
 * A bank holds `values` (strings, or integers for `integer` banks), code/text `pairs`, a numeric `range`
 * or structured `records` whose fields the bank declares. Value order is behaviour: generators index
 * banks by a row hash. The store also names the default sample dataset (`sampleDataset`: id and version)
 * that the name, organization and description banks make up.
 *
 * Version 2 added number fields, optional record fields and a `source` citation to record banks, and the
 * `sampleDataset` identity.
 */
export const VALUE_BANK_STORE_ID = 'mockgen-value-banks';
export const VALUE_BANK_STORE_PATH = 'resources/banks/value-banks.v2.json';

/** A record field's type; a trailing `?` marks a field a record may omit. */
type RecordFieldType = 'string' | 'integer' | 'number' | 'string?' | 'integer?' | 'number?';
type RecordFields = Readonly<Record<string, RecordFieldType>>;
type RecordFieldValue<Type extends RecordFieldType> = Type extends 'integer' | 'number'
    ? number
    : Type extends 'string'
      ? string
      : Type extends 'integer?' | 'number?'
        ? number | undefined
        : string | undefined;
/** A structured record whose field types follow the declared field map. */
type BankRecord<Fields extends RecordFields> = {
    readonly [Name in keyof Fields]: RecordFieldValue<Fields[Name]>;
};
const RECORD_FIELD_TYPES: ReadonlyArray<RecordFieldType> = [
    'string',
    'integer',
    'number',
    'string?',
    'integer?',
    'number?'
];

/**
 * Whether a declared field type is one a record bank supports.
 *
 * @param value the declared type
 * @returns true for a record field type
 */
function isRecordFieldType(value: unknown): value is RecordFieldType {
    return RECORD_FIELD_TYPES.some((type) => type === value);
}

interface BankIdentity {
    readonly label: string;
    readonly id: string;
}

/** Strings drawn by row hash: codes, names, texts or identifiers. */
interface StringValueBank extends BankIdentity {
    readonly kind: 'role';
    readonly valueKind: 'code' | 'name' | 'text' | 'identifier';
    readonly values: ReadonlyArray<string>;
}

/** Integers drawn by row hash, such as field-control states. */
interface IntegerValueBank extends BankIdentity {
    readonly kind: 'role';
    readonly valueKind: 'integer';
    readonly values: ReadonlyArray<number>;
}

/** Codes with their display text, kept together so a row reads coherently. */
interface PairValueBank extends BankIdentity {
    readonly kind: 'role';
    readonly valueKind: 'code-text';
    readonly pairs: ReadonlyArray<Readonly<{ code: string; text: string }>>;
}

/** Structured records whose fields stay together, such as a city with its region and postal code. */
interface RecordValueBank extends BankIdentity {
    readonly kind: 'role';
    readonly valueKind: 'record';
    /** Where the records come from, for banks transcribed from a published standard. */
    readonly source?: string;
    readonly fields: RecordFields;
    readonly records: ReadonlyArray<Readonly<Record<string, string | number>>>;
}

/** The value bank of one classifier concept; the head's thresholds are joined at load time. */
export type ConceptValueBank = Omit<ConceptBank, 'minimumSimilarity'> & {
    readonly kind: 'concept';
    readonly label: string;
};

type ValueBank = StringValueBank | IntegerValueBank | PairValueBank | RecordValueBank | ConceptValueBank;

/** The identity of the default sample dataset, recorded in generation provenance. */
interface SampleDatasetIdentity {
    readonly id: string;
    readonly version: string;
}

interface ValueBankStore {
    readonly format: 'mockgen-value-banks';
    readonly version: 2;
    readonly sampleDataset: SampleDatasetIdentity;
    readonly banks: ReadonlyMap<string, ValueBank>;
}

const STORE_KEYS = new Set(['format', 'version', 'sampleDataset', 'banks']);
const SAMPLE_DATASET_KEYS = new Set(['id', 'version']);
const CONCEPT_VALUE_KINDS: ReadonlyArray<ConceptBank['valueKind']> = [
    'code',
    'code-text',
    'name',
    'text',
    'identifier',
    'number',
    'decimal'
];
const ROLE_STRING_KINDS: ReadonlyArray<StringValueBank['valueKind']> = ['code', 'name', 'text', 'identifier'];

/**
 * Whether a declared value kind is one of the concept value kinds.
 *
 * @param value the declared kind
 * @returns true for a concept value kind
 */
function isConceptValueKind(value: unknown): value is ConceptBank['valueKind'] {
    return CONCEPT_VALUE_KINDS.some((kind) => kind === value);
}

/**
 * Whether a declared value kind is one of the string kinds of a role bank.
 *
 * @param value the declared kind
 * @returns true for a role string value kind
 */
function isRoleStringKind(value: unknown): value is StringValueBank['valueKind'] {
    return ROLE_STRING_KINDS.some((kind) => kind === value);
}

/**
 * Whether a value is a safe integer.
 *
 * @param value candidate value
 * @returns true for an integer number within the safe range
 */
function isSafeInteger(value: unknown): value is number {
    return Number.isSafeInteger(value);
}
const BANK_ID = /^[a-z0-9][a-z0-9_.-]*$/u;

/** The keys each bank shape may carry; anything else is a store error, not an ignored extra. */
const BANK_KEYS: Readonly<Record<string, ReadonlySet<string>>> = {
    'role-values': new Set(['kind', 'id', 'valueKind', 'values']),
    'role-pairs': new Set(['kind', 'id', 'valueKind', 'pairs']),
    'role-records': new Set(['kind', 'id', 'valueKind', 'source', 'fields', 'records']),
    'concept-values': new Set(['kind', 'id', 'name', 'valueKind', 'types', 'values']),
    'concept-pairs': new Set(['kind', 'id', 'name', 'valueKind', 'types', 'pairs']),
    'concept-range': new Set(['kind', 'id', 'name', 'valueKind', 'types', 'range'])
};

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
    const declaredFields = Object.entries(fieldsInput);
    if (
        declaredFields.length === 0 ||
        !declaredFields.every((entry): entry is [string, RecordFieldType] => isRecordFieldType(entry[1]))
    ) {
        throw new TypeError(
            `${label} fields must map each field name to "string", "integer" or "number", optionally suffixed with "?"`
        );
    }
    const names = declaredFields.map(([name]) => name);
    const fields: RecordFields = Object.freeze(Object.fromEntries(declaredFields));
    if (!Array.isArray(input.records) || input.records.length === 0) {
        throw new TypeError(`${label} records must be a non-empty list`);
    }
    const records = input.records.map((entry: unknown, index) => {
        const recordLabel = `${label} records[${index}]`;
        const item = objectRecord(entry, recordLabel);
        assertKeys(item, new Set(names), recordLabel);
        for (const name of names) {
            const field = item[name];
            const optional = fields[name].endsWith('?');
            const type = fields[name].replace('?', '');
            const valid =
                (optional && !Object.hasOwn(item, name)) ||
                (type === 'string' && typeof field === 'string' && field.length > 0) ||
                (type === 'integer' && typeof field === 'number' && Number.isSafeInteger(field)) ||
                (type === 'number' && typeof field === 'number' && Number.isFinite(field));
            if (!valid) {
                const expected = { string: 'a non-empty string', integer: 'an integer', number: 'a finite number' }[
                    type
                ];
                throw new TypeError(`${recordLabel}.${name} must be ${expected}`);
            }
        }
        // Every key is a declared field and every present field was checked above, so this keeps them all.
        const values = Object.entries(item).filter(
            (entry): entry is [string, string | number] => typeof entry[1] === 'string' || typeof entry[1] === 'number'
        );
        return Object.freeze(Object.fromEntries(values));
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
    if (isRoleStringKind(valueKind)) {
        assertKeys(input, BANK_KEYS['role-values'], label);
        return Object.freeze({
            label,
            kind: 'role',
            id,
            valueKind,
            values: nonEmptyStrings(input.values, `${label} values`)
        });
    }
    if (valueKind === 'integer') {
        assertKeys(input, BANK_KEYS['role-values'], label);
        const values = input.values;
        if (!Array.isArray(values) || values.length === 0 || !values.every(isSafeInteger)) {
            throw new TypeError(`${label} values must be a non-empty list of integers`);
        }
        return Object.freeze({ label, kind: 'role', id, valueKind, values: Object.freeze([...values]) });
    }
    if (valueKind === 'code-text') {
        assertKeys(input, BANK_KEYS['role-pairs'], label);
        return Object.freeze({ label, kind: 'role', id, valueKind, pairs: parsePairs(input.pairs, `${label} pairs`) });
    }
    if (valueKind === 'record') {
        assertKeys(input, BANK_KEYS['role-records'], label);
        return Object.freeze({
            label,
            kind: 'role',
            id,
            valueKind,
            ...(input.source === undefined ? {} : { source: nonEmptyString(input.source, `${label} source`) }),
            ...parseRecords(input, label)
        });
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
    if (!isConceptValueKind(valueKind)) {
        throw new TypeError(`${label} has an unsupported concept value kind`);
    }
    const kind = valueKind;
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
 * parseValueBankStore({ format: 'mockgen-value-banks', version: 2,
 *     sampleDataset: { id: 'offline-text-samples', version: '1' }, banks: {
 *     'role:currencies': { kind: 'role', id: 'currencies', valueKind: 'code', values: ['EUR', 'USD'] }
 * } });
 */
export function parseValueBankStore(value: unknown): ValueBankStore {
    const input = objectRecord(value, 'value-bank store');
    assertKeys(input, STORE_KEYS, 'value-bank store');
    if (input.format !== 'mockgen-value-banks' || input.version !== 2) {
        throw new TypeError('unsupported value-bank store format');
    }
    const sampleDatasetInput = objectRecord(input.sampleDataset, 'value-bank store sampleDataset');
    assertKeys(sampleDatasetInput, SAMPLE_DATASET_KEYS, 'value-bank store sampleDataset');
    const sampleDataset = Object.freeze({
        id: nonEmptyString(sampleDatasetInput.id, 'value-bank store sampleDataset id'),
        version: nonEmptyString(sampleDatasetInput.version, 'value-bank store sampleDataset version')
    });
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
    return Object.freeze({ format: 'mockgen-value-banks', version: 2, sampleDataset, banks });
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
    const declared = Object.entries(bank.fields).sort(([left], [right]) => compareCodePoints(left, right));
    const expected = Object.entries(fields).sort(([left], [right]) => compareCodePoints(left, right));
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

/** An IBAN format: ISO 3166 country, total IBAN length and the BBAN with its generated account digits. */
export interface IbanFormat {
    readonly country: string;
    readonly length: number;
    /** The fixed bank part of the BBAN, followed by `#` for each generated account digit. */
    readonly bbanTemplate: string;
}
const IBAN_COUNTRY = /^[A-Z]{2}$/u;
/** A BBAN template: a fixed bank part of upper-case letters and digits, then one `#` per generated digit. */
const BBAN_TEMPLATE = /^[A-Z0-9]*#+$/u;

/**
 * Check an IBAN format against ISO 13616: an IBAN is the country, two check digits and the BBAN, so the
 * template must be exactly four characters shorter than the declared length.
 *
 * @param format the IBAN format record
 * @returns the format
 */
function checkedIbanFormat(format: IbanFormat): IbanFormat {
    if (
        !IBAN_COUNTRY.test(format.country) ||
        !BBAN_TEMPLATE.test(format.bbanTemplate) ||
        format.bbanTemplate.length + 4 !== format.length
    ) {
        throw new TypeError(`The IBAN format of ${format.country} is inconsistent with its length`);
    }
    return format;
}

/** A country the `syntheticScenario.ibanCountry` option accepts. */
export type IbanCountry = NonNullable<SyntheticScenario['ibanCountry']>;
/** The countries of {@link IbanCountry}; the store must hold exactly one format for each. */
const IBAN_COUNTRIES: ReadonlyArray<IbanCountry> = ['CZ', 'DE', 'IE', 'IT'];

/**
 * Whether a value is a supported IBAN country, including for untyped host configuration.
 *
 * @param value candidate country
 * @returns true for a country of {@link IbanCountry}
 */
export function isIbanCountry(value: unknown): value is IbanCountry {
    return typeof value === 'string' && IBAN_COUNTRIES.some((country) => country === value);
}

/**
 * The IBAN format of every supported country, from the store's `iban-formats` records.
 *
 * @param formats the checked format records
 * @returns the format of each supported country
 */
function ibanFormatsByCountry(formats: ReadonlyArray<IbanFormat>): Readonly<Record<IbanCountry, IbanFormat>> {
    const countries = formats.map(({ country }) => country).sort(compareCodePoints);
    if (JSON.stringify(countries) !== JSON.stringify([...IBAN_COUNTRIES].sort(compareCodePoints))) {
        throw new TypeError(`The IBAN formats must cover exactly the countries ${IBAN_COUNTRIES.join(', ')}`);
    }
    // Checked above: the keys are exactly the supported countries, each once.
    return Object.freeze(Object.fromEntries(formats.map((format) => [format.country, format]))) as Readonly<
        Record<IbanCountry, IbanFormat>
    >;
}

/** The value range a numeric role draws from, before the property's own facets narrow it. */
export interface NumericRoleRange {
    readonly role: string;
    readonly minimum: number;
    readonly maximum: number;
}

const LOCATION_FIELDS = {
    city: 'string',
    country: 'string',
    countryName: 'string',
    region: 'string',
    regionName: 'string',
    postalCode: 'string',
    phonePrefix: 'string',
    phoneSubscriberDigits: 'integer',
    mobilePrefix: 'string',
    mobileSubscriberDigits: 'integer',
    bankName: 'string',
    bic: 'string',
    timeZone: 'string'
} as const satisfies RecordFields;
const UNIT_FIELDS = {
    code: 'string',
    iso: 'string',
    text: 'string',
    decimals: 'integer',
    toBaseNumerator: 'integer?',
    toBaseDenominator: 'integer?'
} as const satisfies RecordFields;
const ISO_4217_FIELDS = { code: 'string', numeric: 'string?', minorUnits: 'integer?' } as const satisfies RecordFields;
const IBAN_FIELDS = { country: 'string', length: 'integer', bbanTemplate: 'string' } as const satisfies RecordFields;
const NUMERIC_RANGE_FIELDS = { role: 'string', minimum: 'number', maximum: 'number' } as const satisfies RecordFields;

/** The packaged value banks: the parsed store, its digest and the banks the generator reads by name. */
export interface PackagedBanks {
    /** The parsed store. */
    readonly store: ValueBankStore;
    /** SHA-256 of the exact store bytes that were parsed; the package manifest must declare the same digest. */
    readonly sha256: string;
    /**
     * One location per country: city, region, postal code, telephone numbering, a major bank with its BIC,
     * and the city's IANA time zone, so every place field of a row can follow one country.
     */
    readonly locations: ReadonlyArray<BankRecord<typeof LOCATION_FIELDS>>;
    /**
     * The units the value banks generate: internal code, ISO/UN-ECE code, text, display decimals (counted
     * units have none) and, where recorded, the exact conversion to the SI base unit as numerator/denominator.
     */
    readonly unitSamples: ReadonlyArray<BankRecord<typeof UNIT_FIELDS>>;
    readonly units: ReadonlyArray<string>;
    readonly unitIsoCodes: Readonly<Record<string, string>>;
    readonly currencies: ReadonlyArray<string>;
    /**
     * ISO 4217 currency records (List One as published by SIX): code, numeric code and minor-unit digits.
     * A record without `minorUnits` is a currency without a minor unit (SIX "N.A."); the numeric code is
     * recorded for the currencies the value banks generate. A code without a record has two minor units.
     */
    readonly iso4217Currencies: ReadonlyArray<BankRecord<typeof ISO_4217_FIELDS>>;
    readonly statusSamples: PairValueBank['pairs'];
    readonly fieldControlValues: ReadonlyArray<number>;
    readonly measurementDimensions: ReadonlyArray<string>;
    /**
     * The IBAN formats synthetic IBANs are generated in, per ISO 13616 and the SWIFT IBAN Registry. Each
     * format's bank part is fixed and its account digits come from the row hash.
     */
    readonly ibanFormats: Readonly<Record<IbanCountry, IbanFormat>>;
    /**
     * Value ranges of the numeric roles, keyed by role. They are plausible synthetic magnitudes (a rating of
     * 1 to 5, a temperature of -30 to 50), not facts; the property's precision and scale still apply.
     */
    readonly numericRoleRanges: ReadonlyMap<string, NumericRoleRange>;
    /**
     * The default names, organizations and descriptions. Hosts may replace them through the
     * `sampleDataset` option; the identity, recorded in the store, names this sample set so generation
     * provenance stays comparable across releases.
     */
    readonly defaultSampleDataset: SyntheticSampleDataset;
}

/**
 * Resolve the banks the generator reads by name and check their shape; a missing bank or a record that
 * breaks its declared fields stops loading.
 *
 * @param store the parsed store
 * @param digest SHA-256 of the exact store bytes that were parsed
 * @returns the store, its digest and the named banks
 */
function resolvePackagedBanks(store: ValueBankStore, digest: string): PackagedBanks {
    const unitSamples = requiredRecordBankValues(store, 'units', UNIT_FIELDS);
    const numericRoleRanges = new Map(
        requiredRecordBankValues(store, 'numeric-role-ranges', NUMERIC_RANGE_FIELDS).map((range) => {
            if (range.minimum > range.maximum) {
                throw new TypeError(`The numeric range of ${range.role} is empty`);
            }
            return [range.role, range];
        })
    );
    return Object.freeze({
        store,
        sha256: digest,
        locations: requiredRecordBankValues(store, 'locations', LOCATION_FIELDS),
        unitSamples,
        units: Object.freeze(unitSamples.map(({ code }) => code)),
        unitIsoCodes: Object.freeze(Object.fromEntries(unitSamples.map(({ code, iso }) => [code, iso]))),
        currencies: requiredRoleBankValues(store, 'currencies'),
        iso4217Currencies: requiredRecordBankValues(store, 'iso-4217-currencies', ISO_4217_FIELDS),
        statusSamples: requiredPairBankValues(store, 'statuses'),
        fieldControlValues: requiredIntegerBankValues(store, 'field-control-values'),
        measurementDimensions: requiredRoleBankValues(store, 'measurement-dimensions'),
        ibanFormats: ibanFormatsByCountry(
            requiredRecordBankValues(store, 'iban-formats', IBAN_FIELDS).map(checkedIbanFormat)
        ),
        numericRoleRanges,
        defaultSampleDataset: Object.freeze({
            id: store.sampleDataset.id,
            version: store.sampleDataset.version,
            firstNames: requiredRoleBankValues(store, 'first-names'),
            lastNames: requiredRoleBankValues(store, 'last-names'),
            organizations: requiredRoleBankValues(store, 'organizations'),
            descriptions: requiredRoleBankValues(store, 'descriptions')
        })
    });
}

/**
 * The packaged value banks, read from the domain resource root, validated and resolved on first use.
 *
 * @returns the store, its digest and the named banks
 * @throws {MockGenError} `RESOURCE_INTEGRITY` when the store is unreadable, not valid JSON or breaks its format
 */
export const packagedBanks: () => PackagedBanks = lazy(() => {
    const { value, sha256: digest } = loadDomainResource(
        VALUE_BANK_STORE_PATH,
        'integrity.resourceName.valueBankStore',
        parseValueBankStore
    );
    try {
        return resolvePackagedBanks(value, digest);
    } catch (error) {
        throw packagedResourceInvalid('integrity.resourceName.valueBankStore', error);
    }
});

/**
 * The value bank of a classifier concept in the packaged store.
 *
 * @param id concept id
 * @returns the concept's bank, or undefined when the store has none
 */
export function packagedConceptBank(id: string): ConceptValueBank | undefined {
    return conceptValueBank(packagedBanks().store, id);
}

/**
 * Descriptive samples addressed by semantic role name (for example `language` or `bic`).
 *
 * @param role semantic role, or a sample family such as `street_name`
 * @returns the samples, or undefined when the store has no bank for the role
 */
export function roleSamples(role: string): ReadonlyArray<string> | undefined {
    return roleBankValues(packagedBanks().store, role);
}
