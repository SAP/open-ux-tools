import { PRIMITIVE_TYPES, type PrimitiveType, type SchemaProperty } from '../schema/graph.js';
import {
    ABAP_DATS_LENGTH,
    ABAP_TIMESTAMP_TEXT_LENGTH,
    ABAP_TIMS_LENGTH,
    ISO_DATE_LENGTH,
    ISO_DATETIME_LENGTH,
    ISO_TIME_LENGTH
} from '../spec/abap.js';
import { packagedBanks } from './bank-store.js';
import { assertKeys, nonEmptyString, nonEmptyStrings, objectRecord } from './strict-json.js';
import { canonicalJson, sha256 } from '../hash.js';
import { loadDomainResource } from './resource-integrity.js';
import { lazy } from '../lazy.js';

interface SemanticRoleDefinition {
    family: string;
    compatiblePrimitiveTypes: readonly PrimitiveType[];
    keyPolicy: 'allowed' | 'forbidden';
    validator: 'structural' | 'email' | 'phone' | 'url' | 'iban' | 'bic' | 'country' | 'currency';
    sftEligible: boolean;
    lexicalPrecisionGate: boolean;
    routeThreshold: number;
    conflictThreshold: number;
    /**
     * The value bank whose distinct values are the role's whole key domain. The registry names the bank
     * rather than its size, so editing a bank never changes the registry fingerprint the classifier head pins.
     */
    keyDomain?: KeyDomain;
    /** The shortest key column that can hold every value of the key domain. */
    minimumKeyLength?: number;
}

/** Value banks that bound a role's key domain; see {@link semanticRoleKeyCardinality}. */
type KeyDomain = 'locations' | 'currencies' | 'units' | 'unit-iso-codes' | 'bic';

/** The role registry resource and its manifest dataset id. */
export const ROLE_REGISTRY_ID = 'mockgen-role-registry';
export const ROLE_REGISTRY_PATH = 'resources/rules/role-registry.v1.json';

const DEFINITION_KEYS: ReadonlySet<string> = new Set([
    'family',
    'compatiblePrimitiveTypes',
    'keyPolicy',
    'validator',
    'sftEligible',
    'lexicalPrecisionGate',
    'routeThreshold',
    'conflictThreshold',
    'keyDomain',
    'minimumKeyLength'
]);
const VALIDATORS: ReadonlySet<string> = new Set<SemanticRoleDefinition['validator']>([
    'structural',
    'email',
    'phone',
    'url',
    'iban',
    'bic',
    'country',
    'currency'
]);
const KEY_DOMAINS: ReadonlySet<string> = new Set<KeyDomain>([
    'locations',
    'currencies',
    'units',
    'unit-iso-codes',
    'bic'
]);
const PRIMITIVE_TYPE_NAMES: ReadonlySet<string> = new Set(PRIMITIVE_TYPES);

/**
 * Whether a declared validator is one the registry supports.
 *
 * @param value the declared validator
 * @returns true for a known validator
 */
function isValidator(value: unknown): value is SemanticRoleDefinition['validator'] {
    return typeof value === 'string' && VALIDATORS.has(value);
}

/**
 * Whether a declared key domain names a key-domain bank.
 *
 * @param value the declared key domain
 * @returns true for a known key domain
 */
function isKeyDomain(value: unknown): value is KeyDomain {
    return typeof value === 'string' && KEY_DOMAINS.has(value);
}

/**
 * Whether a declared type name is one of the schema's primitive types.
 *
 * @param type the declared name
 * @returns true for a primitive type
 */
function isPrimitiveType(type: string): type is PrimitiveType {
    return PRIMITIVE_TYPE_NAMES.has(type);
}

/**
 * A boolean, or a TypeError naming what was expected.
 *
 * @param value candidate value
 * @param label what the value is, for the error message
 * @returns the boolean
 */
function booleanValue(value: unknown, label: string): boolean {
    if (typeof value !== 'boolean') {
        throw new TypeError(`${label} must be a boolean`);
    }
    return value;
}

/**
 * A probability threshold in the closed unit interval.
 *
 * @param value candidate value
 * @param label what the value is, for the error message
 * @returns the threshold
 */
function threshold(value: unknown, label: string): number {
    if (typeof value !== 'number' || !(value >= 0 && value <= 1)) {
        throw new TypeError(`${label} must be a number from 0 to 1`);
    }
    return value;
}

/**
 * One role definition, checked field by field.
 *
 * @param value candidate definition
 * @param label the role, for the error message
 * @returns the frozen definition
 */
function parseRoleDefinition(value: unknown, label: string): SemanticRoleDefinition {
    const input = objectRecord(value, label);
    assertKeys(input, DEFINITION_KEYS, label);
    const types = nonEmptyStrings(input.compatiblePrimitiveTypes, `${label}.compatiblePrimitiveTypes`);
    if (!types.every(isPrimitiveType)) {
        throw new TypeError(`${label}.compatiblePrimitiveTypes names an unknown primitive type`);
    }
    if (input.keyPolicy !== 'allowed' && input.keyPolicy !== 'forbidden') {
        throw new TypeError(`${label}.keyPolicy must be "allowed" or "forbidden"`);
    }
    if (!isValidator(input.validator)) {
        throw new TypeError(`${label}.validator is not a known validator`);
    }
    if (input.keyDomain !== undefined && !isKeyDomain(input.keyDomain)) {
        throw new TypeError(`${label}.keyDomain is not a known key-domain bank`);
    }
    if (
        input.minimumKeyLength !== undefined &&
        (typeof input.minimumKeyLength !== 'number' ||
            !Number.isSafeInteger(input.minimumKeyLength) ||
            input.minimumKeyLength < 1)
    ) {
        throw new TypeError(`${label}.minimumKeyLength must be a positive integer`);
    }
    return Object.freeze({
        family: nonEmptyString(input.family, `${label}.family`),
        compatiblePrimitiveTypes: Object.freeze(types),
        keyPolicy: input.keyPolicy,
        validator: input.validator,
        sftEligible: booleanValue(input.sftEligible, `${label}.sftEligible`),
        lexicalPrecisionGate: booleanValue(input.lexicalPrecisionGate, `${label}.lexicalPrecisionGate`),
        routeThreshold: threshold(input.routeThreshold, `${label}.routeThreshold`),
        conflictThreshold: threshold(input.conflictThreshold, `${label}.conflictThreshold`),
        ...(input.keyDomain === undefined ? {} : { keyDomain: input.keyDomain }),
        ...(input.minimumKeyLength === undefined ? {} : { minimumKeyLength: input.minimumKeyLength })
    });
}

/**
 * Validate a role registry document against its strict schema.
 *
 * @param value parsed JSON document
 * @returns the role definitions by role name
 * @example
 * parseRoleRegistry({ format: 'mockgen-role-registry', version: 1, notes: 'n', roles: { email: { ... } } });
 */
export function parseRoleRegistry(value: unknown): Readonly<Record<string, SemanticRoleDefinition>> {
    const input = objectRecord(value, 'role registry');
    assertKeys(input, new Set(['format', 'version', 'notes', 'roles']), 'role registry');
    if (input.format !== 'mockgen-role-registry' || input.version !== 1) {
        throw new TypeError('unsupported role registry format');
    }
    nonEmptyString(input.notes, 'role registry notes');
    const entries = Object.entries(objectRecord(input.roles, 'role registry roles'));
    if (entries.length === 0) {
        throw new TypeError('role registry has no roles');
    }
    // A prototype-free map, so a role named like an `Object.prototype` member is an ordinary entry;
    // `Object.create` is typed `any`.
    const roles: Record<string, SemanticRoleDefinition> = Object.create(null) as Record<string, SemanticRoleDefinition>;
    for (const [role, definition] of entries) {
        if (!/^[a-z][a-z0-9_]*$/u.test(role)) {
            throw new TypeError(`role registry role ${role} must be a snake-case name`);
        }
        roles[role] = parseRoleDefinition(definition, `role ${role}`);
    }
    return Object.freeze(roles);
}

/** The packaged role registry: the role definitions, the digest of their bytes and their fingerprint. */
export interface PackagedRoleRegistry {
    /** The role definitions by role name. */
    readonly roles: Readonly<Record<string, SemanticRoleDefinition>>;
    /** SHA-256 of the exact registry bytes that were parsed; the package manifest must declare the same digest. */
    readonly sha256: string;
    /**
     * SHA-256 of the canonical JSON of the role definitions. The classifier head pins it, so a head trained
     * against other roles is rejected. Key domains enter by bank name, not size: bank edits keep it stable.
     */
    readonly fingerprint: string;
}

/**
 * The packaged role registry, read from the domain resource root and validated on first use.
 *
 * @returns the role definitions, their digest and their fingerprint
 * @throws {MockGenError} `RESOURCE_INTEGRITY` when the registry is unreadable, not valid JSON or breaks its format
 */
export const packagedRoleRegistry: () => PackagedRoleRegistry = lazy(() => {
    const { value, sha256: digest } = loadDomainResource(
        ROLE_REGISTRY_PATH,
        'integrity.resourceName.roleRegistry',
        parseRoleRegistry
    );
    return Object.freeze({ roles: value, sha256: digest, fingerprint: sha256(canonicalJson(value)) });
});

export function semanticRoleDefinition(role: string): SemanticRoleDefinition | undefined {
    const { roles } = packagedRoleRegistry();
    return Object.prototype.hasOwnProperty.call(roles, role) ? roles[role] : undefined;
}

function semanticRoleCompatibility(
    role: string,
    property: Pick<SchemaProperty, 'primitiveType' | 'isKey'>
): 'compatible' | 'unsupported-role' | 'incompatible-type' | 'key-policy' {
    const definition = semanticRoleDefinition(role);
    if (!definition) {
        return 'unsupported-role';
    }
    if (!definition.compatiblePrimitiveTypes.some((primitiveType) => primitiveType === property.primitiveType)) {
        return 'incompatible-type';
    }
    if (property.isKey && definition.keyPolicy === 'forbidden') {
        return 'key-policy';
    }
    return 'compatible';
}

/** Date roles whose values a string column can carry in a fixed-width date format. */
const STRING_DATE_ROLES: ReadonlySet<string> = new Set(['date', 'datetime', 'start_date', 'end_date']);

type StringDateFormat = 'yyyymmdd' | 'iso-date' | 'yyyymmddhhmmss' | 'iso-datetime';

/**
 * The date format a string column's declared length implies: 8 characters `yyyymmdd`, 10 an ISO date,
 * 14 `yyyymmddhhmmss`, 19 or more (or no limit) an ISO date-time. Other lengths imply none.
 *
 * @param property the string column
 * @returns the format, or undefined
 */
export function stringDateFormat(
    property: Pick<SchemaProperty, 'primitiveType' | 'maxLength'>
): StringDateFormat | undefined {
    if (property.primitiveType !== 'string') {
        return undefined;
    }
    const length = property.maxLength;
    if (length === undefined || length >= ISO_DATETIME_LENGTH) {
        return 'iso-datetime';
    }
    const formats: Readonly<Record<number, StringDateFormat>> = {
        [ABAP_DATS_LENGTH]: 'yyyymmdd',
        [ISO_DATE_LENGTH]: 'iso-date',
        [ABAP_TIMESTAMP_TEXT_LENGTH]: 'yyyymmddhhmmss'
    };
    return formats[length];
}

/**
 * The time format a string column's declared length implies: 6 characters `HHMMSS`, 8 or more (or no
 * limit) `HH:MM:SS`. Other lengths imply none.
 *
 * @param property the string column
 * @returns the format, or undefined
 */
export function stringTimeFormat(
    property: Pick<SchemaProperty, 'primitiveType' | 'maxLength'>
): 'hhmmss' | 'iso-time' | undefined {
    if (property.primitiveType !== 'string') {
        return undefined;
    }
    if (property.maxLength === undefined || property.maxLength >= ISO_TIME_LENGTH) {
        return 'iso-time';
    }
    return property.maxLength === ABAP_TIMS_LENGTH ? 'hhmmss' : undefined;
}

const DATE_OR_DATETIME_COLUMNS: ReadonlySet<SchemaProperty['primitiveType']> = new Set([
    'date',
    'datetime',
    'datetimeoffset'
]);

/**
 * Role compatibility of a routed role with a column the role registry's types leave out but whose values
 * the role's provider genuinely writes, for non-key columns: a date role on a string column whose length
 * implies a date format, `date` and `datetime` across date and date-time columns, and `time` on a string
 * column whose length implies a time format. The role registry, which the classifier head pins, is
 * unchanged; every other case is the registry's compatibility.
 *
 * @param role the routed role
 * @param property the column
 * @returns the compatibility
 */
export function routedRoleCompatibility(
    role: string,
    property: Pick<SchemaProperty, 'primitiveType' | 'isKey' | 'maxLength'>
): ReturnType<typeof semanticRoleCompatibility> {
    const compatibility = semanticRoleCompatibility(role, property);
    if (compatibility !== 'incompatible-type' || property.isKey) {
        return compatibility;
    }
    const supported =
        (STRING_DATE_ROLES.has(role) && stringDateFormat(property) !== undefined) ||
        ((role === 'date' || role === 'datetime') && DATE_OR_DATETIME_COLUMNS.has(property.primitiveType)) ||
        (role === 'time' && stringTimeFormat(property) !== undefined);
    return supported ? 'compatible' : compatibility;
}

/**
 * The number of distinct values in a key-domain bank, read from the packaged value banks at call time.
 *
 * @param domain the key-domain bank
 * @returns its distinct value count
 */
function keyDomainCardinality(domain: KeyDomain): number {
    const cardinalities: Readonly<Record<KeyDomain, () => number>> = {
        locations: () => packagedBanks().locations.length,
        currencies: () => packagedBanks().currencies.length,
        units: () => packagedBanks().units.length,
        'unit-iso-codes': () => new Set(Object.values(packagedBanks().unitIsoCodes)).size,
        bic: () => packagedBanks().locations.length
    };
    return cardinalities[domain]();
}

/**
 * The number of distinct key values a role's provider can write into a key column, when the role's key
 * domain is a value bank and the column is wide enough for every value of it.
 *
 * @param role the routed role
 * @param property the key column
 * @returns the key-domain size, or undefined when the role does not bound its keys
 * @example
 * semanticRoleKeyCardinality('currency', { maxLength: 3 }); // the size of the currency bank
 */
export function semanticRoleKeyCardinality(
    role: string | undefined,
    property: Pick<SchemaProperty, 'maxLength'>
): number | undefined {
    if (!role) {
        return undefined;
    }
    const definition: SemanticRoleDefinition | undefined = semanticRoleDefinition(role);
    if (
        definition?.keyDomain === undefined ||
        (definition.minimumKeyLength !== undefined &&
            property.maxLength !== undefined &&
            property.maxLength < definition.minimumKeyLength)
    ) {
        return undefined;
    }
    return keyDomainCardinality(definition.keyDomain);
}
