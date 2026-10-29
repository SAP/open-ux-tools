import type { JsonValue, SyntheticSampleDataset, SyntheticScenario } from '../types.js';
import type { SchemaProperty } from '../schema/graph.js';
import { DEFAULT_DATE_WINDOW, type DateWindow } from '../date-window.js';

import { semanticRoleDefinition, stringDateFormat, stringTimeFormat } from './role-registry.js';
import { packagedBanks, roleSamples, type PackagedBanks } from './bank-store.js';
import { semanticRules, type IntegerRange } from './rule-store.js';
import { lazy } from '../lazy.js';
import { sha256 } from '../hash.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../errors.js';

// Roles the switches of the `stringRoleValue` groups and of `semanticValue` produce a value for, by
// their `case` labels; `provider-capability.test.ts` keeps this list in step with them.
const SWITCH_PROVIDER_ROLES = [
    'account_description',
    'audit_user',
    'bank_account_internal_id',
    'bank_name',
    'bank_statement_id',
    'bank_statement_page',
    'batch',
    'bic',
    'boolean_flag',
    'business_identifier',
    'business_network_id',
    'business_partner_id',
    'city',
    'comment',
    'count',
    'country',
    'country_name',
    'currency',
    'currency_name',
    'customer_id',
    'customer_purchase_order',
    'date',
    'datetime',
    'decimal_places',
    'description',
    'dimension_exponent',
    'document_id',
    'document_item',
    'duration_unit',
    'email',
    'employee_id',
    'end_date',
    'equipment_id',
    'equipment_name',
    'field_control',
    'guid_text',
    'iban',
    'indicator',
    'language',
    'length_unit',
    'long_text',
    'manufacturer',
    'material_no',
    'measurement_dimension',
    'mobile_phone',
    'notes',
    'numeric_identifier',
    'org_name',
    'payment_file_id',
    'person_first_name',
    'person_full_name',
    'person_last_name',
    'phone',
    'postal_code',
    'pressure_unit',
    'product_name',
    'purchase_order_no',
    'region',
    'region_name',
    'remark',
    'sales_doc_no',
    'service_organization',
    'service_team',
    'source_name',
    'start_date',
    'street_address',
    'temperature_unit',
    'time',
    'timezone',
    'unique_item_identifier',
    'unit_of_measure',
    'unit_of_measure_iso',
    'url',
    'vendor_id',
    'year'
];

// Roles that `semanticValue` can actually produce a value for: the switch roles and the numeric roles
// of the value banks' ranges. A role outside this set has no value bank, so accepting it would claim
// semantic coverage the generator cannot deliver: the cell would silently fall through to the typed floor.
export const providerCapableRoles: () => ReadonlySet<string> = lazy(() =>
    Object.freeze(new Set([...SWITCH_PROVIDER_ROLES, ...packagedBanks().numericRoleRanges.keys()]))
);

export const SEMANTIC_CATALOG_VERSION = 'synthetic-providers-v2' as const;

/** The site every generated URL belongs to; the bare site is the shortest URL the providers write. */
export const URL_ORIGIN = 'https://example.com';
// The value-bank store's digest covers every bank a generated value can come from, the concept banks
// included, so a changed bank changes the generation fingerprint and invalidates cached data.
export const semanticCatalogFingerprint: () => string = lazy(() =>
    sha256(JSON.stringify({ version: SEMANTIC_CATALOG_VERSION, valueBanks: packagedBanks().sha256 }))
);

/**
 * Reject unusable host sample datasets before generation, including untyped host configuration.
 *
 * @param dataset the sample dataset a host passes in `sampleDataset`
 */
export function validateSampleDataset(dataset: SyntheticSampleDataset): void {
    if (
        !dataset ||
        typeof dataset.id !== 'string' ||
        !dataset.id ||
        typeof dataset.version !== 'string' ||
        !dataset.version ||
        ![dataset.firstNames, dataset.lastNames, dataset.organizations, dataset.descriptions].every(
            (values) =>
                Array.isArray(values) &&
                values.length > 0 &&
                values.every((value) => typeof value === 'string' && value.length > 0)
        )
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            'A synthetic sample dataset requires an identity, version and non-empty string arrays.'
        );
    }
    if (
        dataset.roleSamples !== undefined &&
        (!dataset.roleSamples ||
            typeof dataset.roleSamples !== 'object' ||
            Array.isArray(dataset.roleSamples) ||
            !Object.values(dataset.roleSamples).every(
                (values) =>
                    Array.isArray(values) &&
                    values.length > 0 &&
                    values.every((value) => typeof value === 'string' && value.length > 0)
            ))
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            'Synthetic role samples must be non-empty string arrays.'
        );
    }
    for (const role of Object.keys(dataset.roleSamples ?? {})) {
        const definition = semanticRoleDefinition(role);
        if (
            definition?.keyPolicy !== 'forbidden' ||
            definition.validator !== 'structural' ||
            !definition.compatiblePrimitiveTypes.includes('string')
        ) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.REQUEST_INVALID,
                'Only non-key descriptive roles can use sample replacements; use explicit field domains for codes.'
            );
        }
    }
}

function subscriberDigits(hash: number, length: number): string {
    const minimum = 10 ** (length - 1);
    return String((hash % (9 * minimum)) + minimum);
}

export interface SemanticRowContext {
    dataset: SyntheticSampleDataset;
    ibanCountry?: SyntheticScenario['ibanCountry'];
    firstName: string;
    lastName: string;
    location: PackagedBanks['locations'][number];
    currency: PackagedBanks['currencies'][number];
    unit: PackagedBanks['units'][number];
    organization: string;
    startDate: Date;
    /** The calendar window the row's dates are drawn from. */
    dateWindow: DateWindow;
}

/**
 * Whether a value fits a length facet whole, counted in code points as OData counts characters.
 *
 * @param value the value
 * @param maximumLength the field's MaxLength, if any
 * @returns true when the value fits
 */
function fits(value: string, maximumLength: number | undefined): boolean {
    return maximumLength === undefined || Array.from(value).length <= maximumLength;
}

function repeatedDigits(hash: number, maximumLength = 10): string {
    const source = String(hash).padStart(10, '0');
    return source.repeat(Math.ceil(maximumLength / source.length)).slice(0, maximumLength);
}

function stableHex(hash: number, rowIndex: number, maximumLength: number): string {
    let state = (hash ^ Math.imul(rowIndex + 1, 0x9e3779b9)) >>> 0;
    let value = '';
    while (value.length < maximumLength) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        value += state.toString(16).toUpperCase().padStart(8, '0');
    }
    return value.slice(0, maximumLength);
}

/**
 * The first candidate that fits the column width, searching from `start` so that successive rows
 * draw different samples instead of all taking the first one that fits.
 *
 * @param candidates the samples to choose from, in preference order
 * @param maximumLength the column width, when declared
 * @param start the row-specific position to begin the search from
 * @returns a sample that fits whole, or undefined when none does
 */
function completeString(
    candidates: ReadonlyArray<string>,
    maximumLength: number | undefined,
    start = 0
): string | undefined {
    for (let offset = 0; offset < candidates.length; offset++) {
        const candidate = candidates[(start + offset) % candidates.length];
        if (fits(candidate, maximumLength)) {
            return candidate;
        }
    }
    return undefined;
}

/** A winter day, so a zone's offset is its standard time rather than its daylight saving time. */
const STANDARD_TIME_INSTANT = new Date(Date.UTC(2024, 0, 15));

/**
 * The standard-time offset of an IANA time zone from UTC in its short form.
 *
 * @param timeZone IANA time zone name
 * @returns `UTC` for no offset, else the offset in hours and minutes when they are not whole
 * @example
 * utcOffsetName('Europe/Berlin'); // 'UTC+1'
 */
function utcOffsetName(timeZone: string): string {
    const offset =
        new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
            .formatToParts(STANDARD_TIME_INSTANT)
            .find(({ type }) => type === 'timeZoneName')?.value ?? 'GMT';
    const match = /^GMT([+-])(\d{2}):(\d{2})$/u.exec(offset);
    if (!match) {
        return 'UTC';
    }
    const [, sign, hours, minutes] = match;
    return `UTC${sign}${Number(hours)}${minutes === '00' ? '' : `:${minutes}`}`;
}

function catalogSample(role: string, index: number): string | undefined {
    const samples = roleSamples(role);
    return samples?.length ? samples[index % samples.length] : undefined;
}

/**
 * An integer of an inclusive range, chosen by a non-negative hash.
 *
 * @param range the range
 * @param hash the hash
 * @returns the integer
 */
function drawn(range: IntegerRange, hash: number): number {
    return range.minimum + (hash % (range.maximum - range.minimum + 1));
}

function fixedDigits(hash: number, length: number): string {
    const modulus = 10n ** BigInt(length);
    return (BigInt(hash) % modulus).toString().padStart(length, '0');
}

function numericFacetBounds(property: SchemaProperty): Readonly<{ minimum: number; maximum: number; scale: number }> {
    if (property.primitiveType === 'int') {
        return {
            minimum: property.numericMinimum ?? Number.MIN_SAFE_INTEGER,
            maximum: property.numericMaximum ?? Number.MAX_SAFE_INTEGER,
            scale: 0
        };
    }
    const scale = Math.min(property.scale ?? (property.precision === undefined ? 2 : 0), 6);
    const precision = Math.min(property.precision ?? 15, 15);
    const maximum =
        property.precision === undefined
            ? Number.MAX_SAFE_INTEGER
            : (10 ** precision - 1) / 10 ** Math.min(property.scale ?? 0, precision);
    return { minimum: -maximum, maximum, scale };
}

function boundedNumericValue(
    property: SchemaProperty,
    hash: number,
    desiredMinimum: number,
    desiredMaximum: number
): number | undefined {
    if (property.primitiveType !== 'int' && property.primitiveType !== 'decimal') {
        return undefined;
    }
    const facets = numericFacetBounds(property);
    const factor = 10 ** facets.scale;
    const minimum = Math.ceil(Math.max(desiredMinimum, facets.minimum) * factor);
    const maximum = Math.floor(Math.min(desiredMaximum, facets.maximum) * factor);
    if (minimum > maximum) {
        return undefined;
    }
    return Number(((minimum + (hash % (maximum - minimum + 1))) / factor).toFixed(facets.scale));
}

/**
 * Build stable shared values used by semantic coherence groups in one row.
 *
 * @param hash
 * @param dataset
 * @param ibanCountry
 * @param dateWindow the calendar window; the row's start date falls in one of the years after its first
 */
export function semanticRowContext(
    hash: number,
    dataset: SyntheticSampleDataset = packagedBanks().defaultSampleDataset,
    ibanCountry?: SyntheticScenario['ibanCountry'],
    dateWindow: DateWindow = DEFAULT_DATE_WINDOW
): SemanticRowContext {
    // The year, month, day and second of the day are read from the hash as digits of a mixed radix, so each
    // is independent of the others and every day of a month and second of a day can occur.
    const years = Math.max(dateWindow.years - 1, 1);
    const yearOffset = dateWindow.years > 1 ? 1 + (hash % years) : 0;
    const month = Math.floor(hash / years) % 12;
    const year = dateWindow.startYear + yearOffset;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.floor(hash / (years * 12)) % daysInMonth;
    const secondOfDay = Math.floor(hash / (years * 12 * 31)) % 86_400;
    const startDate = new Date(Date.UTC(year, month, day + 1) + secondOfDay * 1_000);
    return Object.freeze({
        dataset,
        ibanCountry,
        firstName: dataset.firstNames[hash % dataset.firstNames.length],
        lastName: dataset.lastNames[Math.floor(hash / dataset.firstNames.length) % dataset.lastNames.length],
        location: packagedBanks().locations[hash % packagedBanks().locations.length],
        currency:
            packagedBanks().currencies[
                Math.floor(hash / packagedBanks().locations.length) % packagedBanks().currencies.length
            ],
        unit: packagedBanks().units[hash % packagedBanks().units.length],
        organization: dataset.organizations[hash % dataset.organizations.length],
        startDate,
        dateWindow
    });
}

/**
 * A person name, an audit user or a business identifier.
 *
 * @param role the planned semantic role
 * @param property the property the value is for; its facets bound the value
 * @param context the shared values of the row
 * @param hash the stable hash of the cell
 * @param rowIndex the row's position in its entity set
 * @returns the value, or undefined when the role is not one of this group's or has no value here
 */
function personOrIdentifierValue(
    role: string,
    property: SchemaProperty,
    context: SemanticRowContext,
    hash: number,
    rowIndex: number
): string | undefined {
    switch (role) {
        case 'person_first_name':
            return context.firstName;
        case 'person_last_name':
            return context.lastName;
        case 'person_full_name':
            return `${context.firstName} ${context.lastName}`;
        case 'currency_name':
            return new Intl.DisplayNames('en', { type: 'currency', fallback: 'none' }).of(context.currency);
        case 'audit_user':
            return `${context.firstName.at(0) ?? 'U'}${context.lastName}`.toUpperCase().replace(/[^A-Z0-9_]/gu, '');
        case 'equipment_id':
            return `EQ${String(hash % 10_000_000_000).padStart(10, '0')}`;
        case 'numeric_identifier':
            if (property.isKey) {
                return fixedDigits(hash, Math.min(property.maxLength ?? 10, 18));
            }
            return repeatedDigits(hash, Math.min(property.maxLength ?? 10, 18));
        case 'customer_id':
        case 'vendor_id':
        case 'material_no':
        case 'purchase_order_no':
        case 'sales_doc_no':
            return fixedDigits(hash, Math.min(property.maxLength ?? 10, 18));
        case 'business_identifier':
        case 'business_partner_id':
            return `ID${hash.toString(36).toUpperCase().padStart(8, '0')}`;
        case 'business_network_id':
            return `AN${fixedDigits(hash, 10)}`;
        case 'unique_item_identifier':
            return `UII-${context.dateWindow.startYear + 1 + (hash % context.dateWindow.years)}-${fixedDigits(hash, 6)}`;
        case 'guid_text':
            return stableHex(hash, rowIndex, property.maxLength ?? 32);
        case 'customer_purchase_order':
            return `PO-${context.startDate.getUTCFullYear()}-${fixedDigits(hash, 6)}`;
        case 'batch':
            return String(hash % 10_000_000_000).padStart(10, '0');
        default:
            return undefined;
    }
}

/**
 * A contact detail, a currency or unit of the row, or a part of its location.
 *
 * @param role the planned semantic role
 * @param property the property the value is for; its facets bound the value
 * @param context the shared values of the row
 * @param hash the stable hash of the cell
 * @param rowIndex the row's position in its entity set
 * @returns the value, or undefined when the role is not one of this group's or has no value here
 */
function contactOrLocationValue(
    role: string,
    property: SchemaProperty,
    context: SemanticRowContext,
    hash: number,
    rowIndex: number
): string | undefined {
    switch (role) {
        case 'email':
            if (property.maxLength !== undefined && property.maxLength < 40) {
                return 'a@b.test';
            }
            return `${context.firstName.toLowerCase()}.${context.lastName.toLowerCase()}@example.com`;
        case 'phone':
            return `${context.location.phonePrefix} ${subscriberDigits(hash, context.location.phoneSubscriberDigits)}`;
        case 'mobile_phone':
            return `${context.location.mobilePrefix} ${subscriberDigits(
                hash,
                context.location.mobileSubscriberDigits
            )}`;
        case 'url':
            // The organisation's page when it fits whole, else another organisation's, else the site itself.
            return completeString(
                [
                    ...[context.organization, ...context.dataset.organizations].map(
                        (name) => `${URL_ORIGIN}/${name.toLowerCase().replace(/\s+/g, '-')}`
                    ),
                    URL_ORIGIN
                ],
                property.maxLength
            );
        case 'currency':
            return property.isKey
                ? packagedBanks().currencies[rowIndex % packagedBanks().currencies.length]
                : context.currency;
        case 'unit_of_measure':
            return context.unit;
        case 'unit_of_measure_iso':
            return packagedBanks().unitIsoCodes[context.unit];
        case 'country':
            return context.location.country;
        case 'country_name':
            return context.location.countryName;
        case 'city':
            return context.location.city;
        case 'region':
            return context.location.region;
        case 'region_name':
            return context.location.regionName;
        case 'postal_code':
            return context.location.postalCode;
        case 'street_address':
            return `${drawn(semanticRules().generationRanges.streetNumber, hash)} ${catalogSample('street_name', hash) ?? ''}`.trim();
        default:
            return undefined;
    }
}

/**
 * A name, a description or a code from a governed catalogue.
 *
 * @param role the planned semantic role
 * @param property the property the value is for; its facets bound the value
 * @param context the shared values of the row
 * @param hash the stable hash of the cell
 * @param rowIndex the row's position in its entity set
 * @returns the value, or undefined when the role is not one of this group's or has no value here
 */
function descriptiveValue(
    role: string,
    property: SchemaProperty,
    context: SemanticRowContext,
    hash: number,
    rowIndex: number
): string | undefined {
    switch (role) {
        case 'org_name':
            return completeString([context.organization, ...context.dataset.organizations], property.maxLength);
        case 'product_name':
        case 'equipment_name':
        case 'source_name':
        case 'account_description':
            // Which products, equipment, sources or accounts a service names depends on its domain, which
            // nothing here knows: only the names a host supplies as role samples are written.
            return undefined;
        case 'description':
        case 'long_text':
        case 'notes':
        case 'comment':
        case 'remark':
            // What a free text says depends on the service's domain, which nothing here knows: only the
            // descriptions a host supplies are written; the packaged sample set has none that fit every service.
            return context.dataset.id === packagedBanks().defaultSampleDataset.id
                ? undefined
                : completeString(context.dataset.descriptions, property.maxLength, hash);
        case 'indicator':
            return rowIndex % 2 === 0 ? '' : 'X';
        case 'measurement_dimension':
            return packagedBanks().measurementDimensions[hash % packagedBanks().measurementDimensions.length];
        case 'language':
        case 'manufacturer':
            return catalogSample(role, hash);
        case 'timezone':
            // A zone name that does not fit gives way to the same place's offset from UTC, never to a zone of
            // another place.
            return property.maxLength !== undefined && property.maxLength < context.location.timeZone.length
                ? completeString([utcOffsetName(context.location.timeZone)], property.maxLength)
                : context.location.timeZone;
        case 'temperature_unit':
            return catalogSample(role, hash);
        case 'pressure_unit':
            return catalogSample(role, hash);
        default:
            return undefined;
    }
}

/**
 * A bank detail, a count or a document, employee or service-organisation number.
 *
 * @param role the planned semantic role
 * @param property the property the value is for; its facets bound the value
 * @param context the shared values of the row
 * @param hash the stable hash of the cell
 * @param rowIndex the row's position in its entity set
 * @returns the value, or undefined when the role is not one of this group's or has no value here
 */
function bankOrDocumentValue(
    role: string,
    property: SchemaProperty,
    context: SemanticRowContext,
    hash: number,
    rowIndex: number
): string | undefined {
    switch (role) {
        case 'iban': {
            const country = context.ibanCountry;
            if (!country) {
                return undefined;
            }
            const { bbanTemplate } = packagedBanks().ibanFormats[country];
            const bankPart = bbanTemplate.slice(0, bbanTemplate.indexOf('#'));
            const bban = `${bankPart}${fixedDigits(hash, bbanTemplate.length - bankPart.length)}`;
            const digits = `${bban}${country}00`.replace(/[A-Z]/gu, (letter) => String(letter.charCodeAt(0) - 55));
            return `${country}${String(98n - (BigInt(digits) % 97n)).padStart(2, '0')}${bban}`;
        }
        case 'bic':
            return context.location.bic;
        case 'bank_account_internal_id':
            return fixedDigits(hash, Math.min(property.maxLength ?? 10, 10));
        case 'bank_statement_id':
            return fixedDigits(hash, Math.min(property.maxLength ?? 5, 5));
        case 'bank_statement_page':
            return String(drawn(semanticRules().generationRanges.bankStatementPage, rowIndex));
        case 'payment_file_id':
            return `PAY${fixedDigits(hash, 8)}`;
        case 'bank_name':
            return context.location.bankName;
        case 'count':
            return String(
                drawn(
                    {
                        minimum: semanticRules().generationRanges.count.minimum,
                        maximum: Math.min(
                            semanticRules().generationRanges.count.maximum,
                            10 ** Math.min(property.maxLength ?? 3, 3) - 1
                        )
                    },
                    hash
                )
            );
        case 'employee_id':
            return fixedDigits(hash, Math.min(property.maxLength ?? 10, 10));
        case 'service_organization':
            return `SORG${fixedDigits(hash, 4)}`;
        case 'service_team':
            return `TEAM${fixedDigits(hash, 4)}`;
        case 'document_id':
            return fixedDigits(hash, Math.min(property.maxLength ?? 10, 10));
        case 'document_item':
            return String((rowIndex + 1) * 10).padStart(Math.min(property.maxLength ?? 6, 6), '0');
        case 'duration_unit':
            return catalogSample(role, hash);
        case 'length_unit':
            return catalogSample(role, hash);
        default:
            return undefined;
    }
}

/**
 * The string value of a role: from the host's role samples when it has any, otherwise from the value
 * banks of the role's group.
 *
 * @param role the planned semantic role
 * @param property the property the value is for; its facets bound the value
 * @param context the shared values of the row
 * @param hash the stable hash of the cell
 * @param rowIndex the row's position in its entity set
 * @returns the value, or undefined when the role is not one of this group's or has no value here
 */
function stringRoleValue(
    role: string,
    property: SchemaProperty,
    context: SemanticRowContext,
    hash: number,
    rowIndex: number
): string | undefined {
    const samples = context.dataset.roleSamples?.[role];
    if (samples?.length) {
        return samples[hash % samples.length];
    }
    // The groups answer disjoint roles, so at most one of them has a value for the role.
    return (
        personOrIdentifierValue(role, property, context, hash, rowIndex) ??
        contactOrLocationValue(role, property, context, hash, rowIndex) ??
        descriptiveValue(role, property, context, hash, rowIndex) ??
        bankOrDocumentValue(role, property, context, hash, rowIndex)
    );
}

/**
 * Produce a governed semantic candidate; undefined means the deterministic type fallback should run.
 *
 * @param role
 * @param property
 * @param context
 * @param hash
 * @param rowIndex
 */
export function semanticValue(
    role: string | undefined,
    property: SchemaProperty,
    context: SemanticRowContext,
    hash: number,
    rowIndex = 0
): JsonValue | undefined {
    if (!role) {
        return undefined;
    }
    const stringValue = stringRoleValue(role, property, context, hash, rowIndex);
    if (stringValue !== undefined && property.primitiveType === 'string') {
        // A value cut to the field's length is another value (`ES` cut to one letter is `E`, the SAP key of
        // English), so a value that does not fit whole is not written; keys go to the facet-aware allocator.
        return fits(stringValue, property.maxLength) ? stringValue : undefined;
    }
    const range = packagedBanks().numericRoleRanges.get(role);
    if (range) {
        return boundedNumericValue(property, hash, range.minimum, range.maximum);
    }
    switch (role) {
        case 'year':
            if (property.primitiveType === 'int') {
                return context.startDate.getUTCFullYear();
            }
            return property.primitiveType === 'string' ? String(context.startDate.getUTCFullYear()) : undefined;
        case 'boolean_flag':
            return property.primitiveType === 'bool' ? hash % 2 === 0 : undefined;
        case 'field_control':
            return property.primitiveType === 'int'
                ? packagedBanks().fieldControlValues[hash % packagedBanks().fieldControlValues.length]
                : undefined;
        case 'decimal_places':
            return property.primitiveType === 'int'
                ? drawn(semanticRules().generationRanges.decimalPlaces, hash)
                : undefined;
        case 'dimension_exponent': {
            const exponent = drawn(semanticRules().generationRanges.dimensionExponent, hash);
            return boundedNumericValue(property, 0, exponent, exponent);
        }
        case 'date':
        case 'datetime':
        case 'start_date':
        case 'end_date': {
            const textFormat = stringDateFormat(property);
            if (!['date', 'datetime', 'datetimeoffset'].includes(property.primitiveType) && !textFormat) {
                return undefined;
            }
            const date = new Date(context.startDate);
            if (role === 'end_date') {
                date.setUTCDate(date.getUTCDate() + drawn(semanticRules().generationRanges.endDateGapDays, hash));
            }
            if (property.primitiveType === 'string' && textFormat) {
                // A string column carries the date in the fixed-width format its length implies.
                const iso = date.toISOString();
                const digits = iso.replace(/[-:T]/gu, '').slice(0, 14);
                const text: Readonly<Record<typeof textFormat, string>> = {
                    yyyymmdd: digits.slice(0, 8),
                    'iso-date': iso.slice(0, 10),
                    yyyymmddhhmmss: digits,
                    'iso-datetime': iso.slice(0, 19)
                };
                return text[textFormat];
            }
            return property.primitiveType === 'date' ? date.toISOString().slice(0, 10) : date.toISOString();
        }
        case 'time': {
            // The time of the row's start, so a time agrees with the row's timestamps.
            const [hours, minutes, seconds] = context.startDate.toISOString().slice(11, 19).split(':');
            if (property.primitiveType === 'time') {
                return `${hours}:${minutes}:${seconds}`;
            }
            // A string column carries the time in the fixed-width format its length implies.
            const format = stringTimeFormat(property);
            if (format === 'hhmmss') {
                return `${hours}${minutes}${seconds}`;
            }
            return format === 'iso-time' ? `${hours}:${minutes}:${seconds}` : undefined;
        }
        default:
            return undefined;
    }
}
