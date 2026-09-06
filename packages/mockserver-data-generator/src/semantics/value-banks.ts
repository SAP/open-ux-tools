import type { JsonValue } from '../types.js';
import type { SchemaProperty } from '../schema/graph.js';

const FIRST_NAMES = ['Amelia', 'Lucas', 'Sofia', 'Noah', 'Maya', 'Elias', 'Nora', 'Daniel'] as const;
const LAST_NAMES = ['Fischer', 'Murphy', 'Rossi', 'Novak', 'Silva', 'Weber', 'Martin', 'Keller'] as const;
const LOCATIONS = [
    {
        city: 'Berlin',
        country: 'DE',
        countryName: 'Germany',
        region: 'BE',
        regionName: 'Berlin',
        postalCode: '10115',
        phonePrefix: '+49 30'
    },
    {
        city: 'Dublin',
        country: 'IE',
        countryName: 'Ireland',
        region: 'L',
        regionName: 'Leinster',
        postalCode: 'D02',
        phonePrefix: '+353 1'
    },
    {
        city: 'Milan',
        country: 'IT',
        countryName: 'Italy',
        region: 'MI',
        regionName: 'Lombardy',
        postalCode: '20121',
        phonePrefix: '+39 02'
    },
    {
        city: 'Prague',
        country: 'CZ',
        countryName: 'Czechia',
        region: 'PR',
        regionName: 'Prague',
        postalCode: '11000',
        phonePrefix: '+420 2'
    }
] as const;
const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF'] as const;
const UNITS = ['EA', 'KG', 'L', 'H', 'PC'] as const;
const ORGANIZATIONS = ['Northwind Trading', 'Alpine Supply', 'Blue River Industries', 'Summit Services'] as const;
const PRODUCTS = ['Industrial Pump', 'Safety Valve', 'Service Package', 'Control Module'] as const;
const STATUSES = ['Open', 'In Progress', 'Approved', 'Completed'] as const;
const CHARTS_OF_ACCOUNTS = ['YCOA', 'INT', 'CAUS', 'IFRS'] as const;
const CONTROL_CODES = ['01', '02', '03', '04'] as const;
const PLANTS = ['1010', '1110', '1710', '3010'] as const;
const ETHNICITIES = [
    'Asian',
    'Black or African American',
    'Hispanic or Latino',
    'Native American',
    'Not Specified'
] as const;
const FIELD_CONTROL_VALUES = [0, 1, 3, 7] as const;
const STATUS_CODES = ['O', 'I', 'A', 'C'] as const;
const MEASUREMENT_DIMENSIONS = ['TIME', 'LENGTH', 'MASS', 'TEMP', 'PRESSURE'] as const;
const PRICE_SOURCES = ['Contract', 'Price List', 'Service Agreement', 'Manual'] as const;
const ACCOUNT_DESCRIPTIONS = [
    'Operating Account',
    'Payroll Account',
    'Clearing Account',
    'Collections Account'
] as const;

export interface SemanticRowContext {
    firstName: string;
    lastName: string;
    location: (typeof LOCATIONS)[number];
    currency: (typeof CURRENCIES)[number];
    unit: (typeof UNITS)[number];
    organization: (typeof ORGANIZATIONS)[number];
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

function repeatedHex(hash: number, maximumLength: number): string {
    const source = hash.toString(16).toUpperCase().padStart(8, '0');
    return source.repeat(Math.ceil(maximumLength / source.length)).slice(0, maximumLength);
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
 */
export function semanticRowContext(hash: number): SemanticRowContext {
    const startDate = new Date(Date.UTC(2021 + (hash % 5), hash % 12, (hash % 24) + 1));
    return Object.freeze({
        firstName: FIRST_NAMES[hash % FIRST_NAMES.length],
        lastName: LAST_NAMES[Math.floor(hash / FIRST_NAMES.length) % LAST_NAMES.length],
        location: LOCATIONS[hash % LOCATIONS.length],
        currency: CURRENCIES[hash % CURRENCIES.length],
        unit: UNITS[hash % UNITS.length],
        organization: ORGANIZATIONS[hash % ORGANIZATIONS.length],
        product: PRODUCTS[hash % PRODUCTS.length],
        startDate
    });
}

function stringRoleValue(
    role: string,
    property: SchemaProperty,
    context: SemanticRowContext,
    hash: number
): string | undefined {
    switch (role) {
        case 'person_first_name':
            return context.firstName;
        case 'person_last_name':
            return context.lastName;
        case 'person_full_name':
            return `${context.firstName} ${context.lastName}`;
        case 'audit_user':
            return `${context.firstName.at(0) ?? 'U'}${context.lastName}`.toUpperCase().replace(/[^A-Z0-9_]/gu, '');
        case 'chart_of_accounts':
            return CHARTS_OF_ACCOUNTS[hash % CHARTS_OF_ACCOUNTS.length];
        case 'equipment_id':
            return `EQ${String(hash % 10_000_000_000).padStart(10, '0')}`;
        case 'numeric_identifier':
            return repeatedDigits(hash, property.maxLength ?? 10);
        case 'business_identifier':
            return `ID${hash.toString(36).toUpperCase().padStart(8, '0')}`;
        case 'guid_text':
            return repeatedHex(hash, property.maxLength ?? 32);
        case 'control_code':
            return CONTROL_CODES[hash % CONTROL_CODES.length];
        case 'plant':
            return PLANTS[hash % PLANTS.length];
        case 'batch':
            return String(hash % 10_000_000_000).padStart(10, '0');
        case 'email':
            return `${context.firstName.toLowerCase()}.${context.lastName.toLowerCase()}@example.com`;
        case 'phone':
            return `${context.location.phonePrefix} ${String((hash % 9_000_000) + 1_000_000)}`;
        case 'url':
            return `https://example.com/${context.organization.toLowerCase().replace(/\s+/g, '-')}`;
        case 'currency':
            return context.currency;
        case 'unit_of_measure':
            return context.unit;
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
            return `${(hash % 180) + 1} Market Street`;
        case 'org_name':
            return context.organization;
        case 'product_name':
            return context.product;
        case 'product_category':
            return ['Hardware', 'Services', 'Software', 'Supplies'][hash % 4];
        case 'description':
        case 'long_text':
        case 'notes':
        case 'comment':
        case 'remark':
            return `${context.product} for ${context.organization}`;
        case 'order_status':
            return property.maxLength !== undefined && property.maxLength < 11
                ? STATUS_CODES[hash % STATUS_CODES.length]
                : STATUSES[hash % STATUSES.length];
        case 'indicator':
            return hash % 2 === 0 ? '' : 'X';
        case 'measurement_dimension':
            return MEASUREMENT_DIMENSIONS[hash % MEASUREMENT_DIMENSIONS.length];
        case 'source_name':
            return PRICE_SOURCES[hash % PRICE_SOURCES.length];
        case 'account_description':
            return ACCOUNT_DESCRIPTIONS[hash % ACCOUNT_DESCRIPTIONS.length];
        case 'language':
            return ['EN', 'DE', 'FR', 'IT'][hash % 4];
        case 'timezone':
            return ['Europe/Dublin', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'][hash % 4];
        case 'ethnicity':
            return ETHNICITIES[hash % ETHNICITIES.length];
        case 'temperature_unit':
            return ['C', 'F', 'K'][hash % 3];
        case 'pressure_unit':
            return ['BAR', 'PSI', 'PA', 'KPA'][hash % 4];
        case 'iban':
            return `DE${String((hash % 90) + 10)}37040044${String(hash).padStart(10, '0').slice(-10)}`;
        case 'bic':
            return ['DEUTDEFF', 'BOFIIE2D', 'CHASUS33', 'BARCGB22'][hash % 4];
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
 */
export function semanticValue(
    role: string | undefined,
    property: SchemaProperty,
    context: SemanticRowContext,
    hash: number
): JsonValue | undefined {
    if (!role) {
        return undefined;
    }
    const stringValue = stringRoleValue(role, property, context, hash);
    if (stringValue !== undefined && property.primitiveType === 'string') {
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
        case 'count':
            return boundedNumericValue(property, hash, 1, 500);
        case 'conversion_factor':
            return boundedNumericValue(property, hash, 1, 100);
        case 'conversion_offset':
            return boundedNumericValue(property, hash, -10, 10);
        case 'order_status':
            return property.primitiveType === 'decimal' || property.primitiveType === 'int'
                ? hash % STATUSES.length
                : undefined;
        case 'monetary_amount':
            return boundedNumericValue(property, hash, 100, 9_099.99);
        case 'price':
            return boundedNumericValue(property, hash, 5, 500);
        case 'quantity':
            return boundedNumericValue(property, hash, 1, 90.99);
        case 'percentage':
            return boundedNumericValue(property, hash, 0, 100);
        case 'interest_rate':
            return boundedNumericValue(property, hash, 0, 20);
        case 'temperature':
            return boundedNumericValue(property, hash, -30, 50);
        case 'pressure':
            return boundedNumericValue(property, hash, 0.5, 20);
        case 'start_date':
            return property.primitiveType === 'date' ? context.startDate.toISOString().slice(0, 10) : undefined;
        case 'end_date': {
            if (property.primitiveType !== 'date') {
                return undefined;
            }
            const endDate = new Date(context.startDate);
            endDate.setUTCDate(endDate.getUTCDate() + 30 + (hash % 90));
            return endDate.toISOString().slice(0, 10);
        }
        default:
            return undefined;
    }
}
