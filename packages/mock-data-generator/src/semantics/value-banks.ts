import { createHash } from 'node:crypto';
import type { JsonValue, SyntheticSampleDataset, SyntheticScenario } from '../types.js';
import type { SchemaProperty } from '../schema/graph.js';

import { DEFAULT_SAMPLE_DATASET } from './sample-dataset.js';
import { stringDateFormat } from './role-registry.js';
import * as sampleCatalog from './sample-catalog.js';
import {
    LOCATIONS,
    DATA_ENRICHMENT_LOCATIONS,
    CURRENCIES,
    UNITS,
    UNIT_ISO_CODES,
    PRODUCTS,
    EQUIPMENT_NAMES,
    ETHNICITIES,
    FIELD_CONTROL_VALUES,
    MEASUREMENT_DIMENSIONS,
    PRICE_SOURCES,
    ACCOUNT_DESCRIPTIONS,
    BANK_NAMES,
    CATALOG_ROLE_SAMPLES
} from './sample-catalog.js';

// Roles that `semanticValue` can actually produce a value for. A role outside this set has no
// value bank, so accepting it would claim semantic coverage the generator cannot deliver: the cell
// would silently fall through to the typed floor. Derived from the `case` labels of the two
// switches below and kept in step with them by `provider-capability.test.ts`.
export const PROVIDER_CAPABLE_ROLES: ReadonlySet<string> = Object.freeze(
    new Set([
        'account_description',
        'audit_user',
        'bank_account_internal_id',
        'bank_name',
        'bank_statement_id',
        'bank_statement_page',
        'bank_statement_short_id',
        'batch',
        'bic',
        'boolean_flag',
        'business_identifier',
        'business_network_id',
        'business_partner_id',
        'city',
        'comment',
        'congressional_district',
        'conversion_factor',
        'conversion_offset',
        'count',
        'country',
        'country_name',
        'currency',
        'currency_name',
        'customer_id',
        'customer_purchase_order',
        'data_enrichment_city',
        'data_enrichment_country',
        'data_enrichment_ethnicity',
        'data_enrichment_postal_code',
        'data_enrichment_region',
        'data_enrichment_street_address',
        'date',
        'datetime',
        'decimal_places',
        'description',
        'dimension_exponent',
        'distance',
        'document_id',
        'document_item',
        'duration',
        'duration_unit',
        'email',
        'employee_id',
        'end_date',
        'equipment_id',
        'equipment_name',
        'ethnicity',
        'exponent',
        'field_control',
        'guid_text',
        'iban',
        'indicator',
        'interest_rate',
        'language',
        'length_unit',
        'long_text',
        'manufacturer',
        'material_no',
        'measurement_dimension',
        'mobile_phone',
        'monetary_amount',
        'notes',
        'numeric_identifier',
        'org_name',
        'payment_file_id',
        'percentage',
        'person_first_name',
        'person_full_name',
        'person_last_name',
        'phone',
        'postal_code',
        'pressure',
        'pressure_unit',
        'price',
        'product_name',
        'purchase_order_no',
        'quantity',
        'rating',
        'region',
        'region_name',
        'remark',
        'risk_class',
        'sales_doc_no',
        'sales_item_proposal_description',
        'service_organization',
        'service_team',
        'source_name',
        'start_date',
        'street_address',
        'temperature',
        'temperature_unit',
        'time',
        'timezone',
        'unique_item_identifier',
        'unique_item_identifier_structure_type',
        'unit_of_measure',
        'unit_of_measure_iso',
        'url',
        'vendor_id',
        'year'
    ])
) as ReadonlySet<string>;

export const SEMANTIC_CATALOG_VERSION = 'synthetic-providers-v2' as const;
export const SEMANTIC_CATALOG_FINGERPRINT = createHash('sha256')
    .update(
        JSON.stringify({
            version: SEMANTIC_CATALOG_VERSION,
            samples: sampleCatalog,
            textSamples: DEFAULT_SAMPLE_DATASET
        })
    )
    .digest('hex');

function subscriberDigits(hash: number, length: number): string {
    const minimum = 10 ** (length - 1);
    return String((hash % (9 * minimum)) + minimum);
}

export interface SemanticRowContext {
    dataset: SyntheticSampleDataset;
    ibanCountry?: SyntheticScenario['ibanCountry'];
    firstName: string;
    lastName: string;
    location: (typeof LOCATIONS)[number];
    currency: (typeof CURRENCIES)[number];
    unit: (typeof UNITS)[number];
    organization: string;
    product: (typeof PRODUCTS)[number];
    startDate: Date;
}

function truncate(value: string, maximumLength?: number): string {
    return maximumLength === undefined ? value : Array.from(value).slice(0, maximumLength).join('');
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
 * @returns a sample that fits, or the last sample truncated to fit
 */
function completeString(candidates: ReadonlyArray<string>, maximumLength: number | undefined, start = 0): string {
    for (let offset = 0; offset < candidates.length; offset++) {
        const candidate = candidates[(start + offset) % candidates.length];
        if (maximumLength === undefined || candidate.length <= maximumLength) {
            return candidate;
        }
    }
    return truncate(candidates.at(-1) ?? 'Value', maximumLength);
}

function catalogSample(role: string, index: number): string | undefined {
    const samples = CATALOG_ROLE_SAMPLES[role];
    return samples?.length ? samples[index % samples.length] : undefined;
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
 */
export function semanticRowContext(
    hash: number,
    dataset: SyntheticSampleDataset = DEFAULT_SAMPLE_DATASET,
    ibanCountry?: SyntheticScenario['ibanCountry']
): SemanticRowContext {
    const startDate = new Date(Date.UTC(2021 + (hash % 5), hash % 12, (hash % 24) + 1));
    return Object.freeze({
        dataset,
        ibanCountry,
        firstName: dataset.firstNames[hash % dataset.firstNames.length],
        lastName: dataset.lastNames[Math.floor(hash / dataset.firstNames.length) % dataset.lastNames.length],
        location: LOCATIONS[hash % LOCATIONS.length],
        currency: CURRENCIES[Math.floor(hash / LOCATIONS.length) % CURRENCIES.length],
        unit: UNITS[hash % UNITS.length],
        organization: dataset.organizations[hash % dataset.organizations.length],
        product: PRODUCTS[hash % PRODUCTS.length],
        startDate
    });
}

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
            return `UII-${2021 + (hash % 6)}-${fixedDigits(hash, 6)}`;
        case 'unique_item_identifier_structure_type':
            return catalogSample(role, hash);
        case 'guid_text':
            return stableHex(hash, rowIndex, property.maxLength ?? 32);
        case 'customer_purchase_order':
            return `PO-${context.startDate.getUTCFullYear()}-${fixedDigits(hash, 6)}`;
        case 'batch':
            return String(hash % 10_000_000_000).padStart(10, '0');
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
            return `https://example.com/${context.organization.toLowerCase().replace(/\s+/g, '-')}`;
        case 'currency':
            return property.isKey ? CURRENCIES[rowIndex % CURRENCIES.length] : context.currency;
        case 'unit_of_measure':
            return context.unit;
        case 'unit_of_measure_iso':
            return UNIT_ISO_CODES[context.unit];
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
            return `${(hash % 180) + 1} ${catalogSample('street_name', hash) ?? ''}`.trim();
        case 'data_enrichment_city':
            return DATA_ENRICHMENT_LOCATIONS[rowIndex % DATA_ENRICHMENT_LOCATIONS.length].city;
        case 'data_enrichment_country':
            return DATA_ENRICHMENT_LOCATIONS[rowIndex % DATA_ENRICHMENT_LOCATIONS.length].country;
        case 'data_enrichment_postal_code':
            return DATA_ENRICHMENT_LOCATIONS[rowIndex % DATA_ENRICHMENT_LOCATIONS.length].postalCode;
        case 'data_enrichment_region':
            return DATA_ENRICHMENT_LOCATIONS[rowIndex % DATA_ENRICHMENT_LOCATIONS.length].region;
        case 'data_enrichment_street_address':
            return DATA_ENRICHMENT_LOCATIONS[rowIndex % DATA_ENRICHMENT_LOCATIONS.length].streetAddress;
        case 'org_name':
            return completeString([context.organization, ...context.dataset.organizations], property.maxLength);
        case 'product_name':
            return context.product;
        case 'equipment_name':
            return EQUIPMENT_NAMES[hash % EQUIPMENT_NAMES.length];
        case 'description':
        case 'long_text':
        case 'notes':
        case 'comment':
        case 'remark':
            return completeString(context.dataset.descriptions, property.maxLength, hash);
        case 'sales_item_proposal_description':
            return completeString(
                [`${context.product} proposal`, ...(CATALOG_ROLE_SAMPLES[role] ?? [])],
                property.maxLength
            );
        case 'data_enrichment_ethnicity':
            return catalogSample(role, rowIndex);
        case 'indicator':
            return rowIndex % 2 === 0 ? '' : 'X';
        case 'measurement_dimension':
            return MEASUREMENT_DIMENSIONS[hash % MEASUREMENT_DIMENSIONS.length];
        case 'source_name':
            return PRICE_SOURCES[hash % PRICE_SOURCES.length];
        case 'account_description':
            return ACCOUNT_DESCRIPTIONS[hash % ACCOUNT_DESCRIPTIONS.length];
        case 'language':
        case 'manufacturer':
            return catalogSample(role, hash);
        case 'timezone':
            return property.maxLength !== undefined && property.maxLength <= 6
                ? catalogSample('timezone_short', hash)
                : catalogSample('timezone_long', hash);
        case 'ethnicity':
            return ETHNICITIES[hash % ETHNICITIES.length];
        case 'temperature_unit':
            return catalogSample(role, hash);
        case 'pressure_unit':
            return catalogSample(role, hash);
        case 'iban': {
            const country = context.ibanCountry;
            if (!country) {
                return undefined;
            }
            let bban = `37040044${fixedDigits(hash, 10)}`;
            if (country === 'IE') {
                bban = `BOFI900017${fixedDigits(hash, 8)}`;
            } else if (country === 'IT') {
                bban = `X0542811101${fixedDigits(hash, 12)}`;
            } else if (country === 'CZ') {
                bban = `0800${fixedDigits(hash, 16)}`;
            }
            const digits = `${bban}${country}00`.replace(/[A-Z]/gu, (letter) => String(letter.charCodeAt(0) - 55));
            return `${country}${String(98n - (BigInt(digits) % 97n)).padStart(2, '0')}${bban}`;
        }
        case 'bic':
            return catalogSample(role, hash);
        case 'bank_account_internal_id':
            return fixedDigits(hash, Math.min(property.maxLength ?? 10, 10));
        case 'bank_statement_id':
            return fixedDigits(hash, Math.min(property.maxLength ?? 5, 5));
        case 'bank_statement_page':
            return String((rowIndex % 99) + 1);
        case 'bank_statement_short_id':
            return fixedDigits(20_260_001 + rowIndex, Math.min(property.maxLength ?? 8, 8));
        case 'payment_file_id':
            return `PAY${fixedDigits(hash, 8)}`;
        case 'bank_name':
            return BANK_NAMES[hash % BANK_NAMES.length];
        case 'count':
            return String((hash % Math.min(500, 10 ** Math.min(property.maxLength ?? 3, 3) - 1)) + 1);
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
        case 'congressional_district':
            return DATA_ENRICHMENT_LOCATIONS[rowIndex % DATA_ENRICHMENT_LOCATIONS.length].district;
        default:
            return undefined;
    }
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
        // Truncation can discard the changing suffix and collapse distinct keys.
        // Let the facet-aware key allocator handle values that do not fit intact.
        if (property.isKey && property.maxLength !== undefined && stringValue.length > property.maxLength) {
            return undefined;
        }
        return truncate(stringValue, property.maxLength);
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
                ? FIELD_CONTROL_VALUES[hash % FIELD_CONTROL_VALUES.length]
                : undefined;
        case 'decimal_places':
            return property.primitiveType === 'int' ? hash % 7 : undefined;
        case 'exponent':
            return boundedNumericValue(property, hash, -6, 6);
        case 'dimension_exponent': {
            const exponent = (hash % 7) - 3;
            return boundedNumericValue(property, 0, exponent, exponent);
        }
        case 'count':
            return boundedNumericValue(property, hash, 1, 500);
        case 'conversion_factor':
            return boundedNumericValue(property, hash, 1, 100);
        case 'conversion_offset':
            return boundedNumericValue(property, hash, -10, 10);
        case 'monetary_amount':
            return boundedNumericValue(property, hash, 100, 9_099.99);
        case 'price':
            return boundedNumericValue(property, hash, 5, 500);
        case 'duration':
            return boundedNumericValue(property, hash, 1, 15);
        case 'quantity':
            return boundedNumericValue(property, hash, 1, 90.99);
        case 'distance':
            return boundedNumericValue(property, hash, 1, 5000);
        case 'rating':
            return boundedNumericValue(property, hash, 1, 5);
        case 'percentage':
            return boundedNumericValue(property, hash, 0, 100);
        case 'interest_rate':
            return boundedNumericValue(property, hash, 0, 20);
        case 'risk_class':
            return boundedNumericValue(property, 0, 1 + (hash % 5), 1 + (hash % 5));
        case 'temperature':
            return boundedNumericValue(property, hash, -30, 50);
        case 'pressure':
            return boundedNumericValue(property, hash, 0.5, 20);
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
                date.setUTCDate(date.getUTCDate() + 30 + (hash % 90));
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
        case 'time':
            return property.primitiveType === 'time'
                ? `${String(hash % 24).padStart(2, '0')}:${String(Math.floor(hash / 24) % 60).padStart(2, '0')}:00`
                : undefined;
        default:
            return undefined;
    }
}
