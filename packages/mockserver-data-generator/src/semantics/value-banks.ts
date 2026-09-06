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
        phonePrefix: '+49 30',
        mobilePrefix: '+49 151'
    },
    {
        city: 'Dublin',
        country: 'IE',
        countryName: 'Ireland',
        region: 'L',
        regionName: 'Leinster',
        postalCode: 'D02',
        phonePrefix: '+353 1',
        mobilePrefix: '+353 85'
    },
    {
        city: 'Milan',
        country: 'IT',
        countryName: 'Italy',
        region: 'MI',
        regionName: 'Lombardy',
        postalCode: '20121',
        phonePrefix: '+39 02',
        mobilePrefix: '+39 320'
    },
    {
        city: 'Prague',
        country: 'CZ',
        countryName: 'Czechia',
        region: 'PR',
        regionName: 'Prague',
        postalCode: '11000',
        phonePrefix: '+420 2',
        mobilePrefix: '+420 60'
    }
] as const;
const DATA_ENRICHMENT_LOCATIONS = [
    {
        city: 'San Francisco',
        country: 'US',
        district: 'CA-11',
        postalCode: '94105',
        region: 'CA',
        streetAddress: '135 Market Street'
    },
    {
        city: 'Austin',
        country: 'US',
        district: 'TX-35',
        postalCode: '78701',
        region: 'TX',
        streetAddress: '210 Congress Avenue'
    },
    {
        city: 'New York',
        country: 'US',
        district: 'NY-12',
        postalCode: '10017',
        region: 'NY',
        streetAddress: '350 Madison Avenue'
    },
    {
        city: 'Chicago',
        country: 'US',
        district: 'IL-05',
        postalCode: '60606',
        region: 'IL',
        streetAddress: '200 West Adams Street'
    }
] as const;
const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF'] as const;
const UNITS = ['EA', 'KG', 'L', 'H', 'PC'] as const;
const UNIT_ISO_CODES: Readonly<Record<(typeof UNITS)[number], string>> = {
    EA: 'EA',
    KG: 'KGM',
    L: 'LTR',
    H: 'HUR',
    PC: 'PCE'
};
const ORGANIZATIONS = ['Northwind Trading', 'Alpine Supply', 'Blue River Industries', 'Summit Services'] as const;
const PRODUCTS = ['Industrial Pump', 'Safety Valve', 'Service Package', 'Control Module'] as const;
const EQUIPMENT_NAMES = ['Hydraulic Pump', 'Safety Valve', 'Control Module', 'Heat Exchanger'] as const;
const STATUSES = ['Open', 'In Progress', 'Approved', 'Completed'] as const;
const CHARTS_OF_ACCOUNTS = ['YCOA', 'INT', 'CAUS', 'IFRS'] as const;
const CONTROL_CODES = ['01', '02', '03', '04'] as const;
const PLANTS = ['1010', '1110', '1710', '3010'] as const;
const ETHNICITIES = ['Asian', 'Black', 'Hispanic or Latino', 'Indigenous', 'Not Specified'] as const;
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
const BANK_NAMES = ['Deutsche Bank', 'JPMorgan Chase', 'Barclays Bank', 'Bank of Ireland'] as const;
const BANK_STATEMENT_TYPES = ['EBS', 'MANL', 'API', 'FILE'] as const;
const GL_ACCOUNTS = ['0000113100', '0000400000', '0000550000', '0000610000'] as const;
const HOUSE_BANKS = ['DE01', 'US01', 'GB01', 'IE01'] as const;
const SHORT_ORGANIZATIONS = ['Northwind Trading', 'Alpine Supply', 'Summit Services'] as const;
const SHORT_DESCRIPTIONS = ['Pump inspection', 'Valve repair', 'Module service', 'Safety check'] as const;

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

function completeString(candidates: ReadonlyArray<string>, maximumLength: number | undefined): string {
    return (
        candidates.find((candidate) => maximumLength === undefined || candidate.length <= maximumLength) ??
        truncate(candidates.at(-1) ?? 'Value', maximumLength)
    );
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
        case 'audit_user':
            return `${context.firstName.at(0) ?? 'U'}${context.lastName}`.toUpperCase().replace(/[^A-Z0-9_]/gu, '');
        case 'chart_of_accounts':
            return CHARTS_OF_ACCOUNTS[hash % CHARTS_OF_ACCOUNTS.length];
        case 'equipment_id':
            return `EQ${String(hash % 10_000_000_000).padStart(10, '0')}`;
        case 'numeric_identifier':
            return repeatedDigits(hash, Math.min(property.maxLength ?? 10, 18));
        case 'business_identifier':
            return `ID${hash.toString(36).toUpperCase().padStart(8, '0')}`;
        case 'business_network_id':
            return `AN${fixedDigits(hash, 10)}`;
        case 'unique_item_identifier':
            return `UII-${2021 + (hash % 6)}-${fixedDigits(hash, 6)}`;
        case 'unique_item_identifier_structure_type':
            return ['GS1', 'EPC', 'UID'][hash % 3];
        case 'guid_text':
            return stableHex(hash, rowIndex, property.maxLength ?? 32);
        case 'customer_purchase_order':
            return `PO-${context.startDate.getUTCFullYear()}-${fixedDigits(hash, 6)}`;
        case 'service_document_item_category':
            return ['SRVP', 'SVCP', 'SVCT'][hash % 3];
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
        case 'mobile_phone':
            return `${context.location.mobilePrefix} ${String((hash % 9_000_000) + 1_000_000)}`;
        case 'url':
            return `https://example.com/${context.organization.toLowerCase().replace(/\s+/g, '-')}`;
        case 'currency':
            return context.currency;
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
            return `${(hash % 180) + 1} Market Street`;
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
            return completeString([context.organization, ...SHORT_ORGANIZATIONS, 'Alpine Co.'], property.maxLength);
        case 'product_name':
            return context.product;
        case 'equipment_name':
            return EQUIPMENT_NAMES[hash % EQUIPMENT_NAMES.length];
        case 'product_category':
            return ['Hardware', 'Services', 'Software', 'Supplies'][hash % 4];
        case 'description':
        case 'long_text':
        case 'notes':
        case 'comment':
        case 'remark':
            return completeString(
                [SHORT_DESCRIPTIONS[hash % SHORT_DESCRIPTIONS.length], 'Service item', 'Service'],
                property.maxLength
            );
        case 'sales_item_proposal_description':
            return completeString([`${context.product} proposal`, 'Product proposal', 'Proposal'], property.maxLength);
        case 'order_status':
            return property.maxLength !== undefined && property.maxLength < 11
                ? STATUS_CODES[hash % STATUS_CODES.length]
                : STATUSES[hash % STATUSES.length];
        case 'indicator':
            return rowIndex % 2 === 0 ? '' : 'X';
        case 'measurement_dimension':
            return MEASUREMENT_DIMENSIONS[hash % MEASUREMENT_DIMENSIONS.length];
        case 'source_name':
            return PRICE_SOURCES[hash % PRICE_SOURCES.length];
        case 'account_description':
            return ACCOUNT_DESCRIPTIONS[hash % ACCOUNT_DESCRIPTIONS.length];
        case 'language':
            return ['EN', 'DE', 'FR', 'IT'][hash % 4];
        case 'timezone':
            return property.maxLength !== undefined && property.maxLength <= 6
                ? ['UTC', 'CET', 'EST', 'JST'][hash % 4]
                : ['Europe/Dublin', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'][hash % 4];
        case 'ethnicity':
            return ETHNICITIES[hash % ETHNICITIES.length];
        case 'confidence_level':
            return ['High', 'Medium', 'Low'][hash % 3];
        case 'temperature_unit':
            return ['C', 'F', 'K'][hash % 3];
        case 'pressure_unit':
            return ['BAR', 'PSI', 'PA', 'KPA'][hash % 4];
        case 'iban':
            return `DE${String((hash % 90) + 10)}37040044${String(hash).padStart(10, '0').slice(-10)}`;
        case 'bic':
            return ['DEUTDEFF', 'BOFIIE2D', 'CHASUS33', 'BARCGB22'][hash % 4];
        case 'bank_account_type':
            return ['Checking', 'Savings', 'Money Market', 'Current'][hash % 4];
        case 'bank_account_internal_id':
            return fixedDigits(hash, Math.min(property.maxLength ?? 10, 10));
        case 'bank_statement_id':
            return fixedDigits(hash, Math.min(property.maxLength ?? 5, 5));
        case 'bank_statement_page':
            return String((rowIndex % 99) + 1);
        case 'bank_statement_short_id':
            return fixedDigits(20_260_001 + rowIndex, Math.min(property.maxLength ?? 8, 8));
        case 'bank_statement_type':
            return BANK_STATEMENT_TYPES[hash % BANK_STATEMENT_TYPES.length];
        case 'bank_statement_format':
            return 'MT';
        case 'payment_file_id':
            return `PAY${fixedDigits(hash, 8)}`;
        case 'payment_transaction_group':
            return ['INBOUND', 'OUTBOUND', 'TRANSFER'][hash % 3];
        case 'bank_name':
            return BANK_NAMES[hash % BANK_NAMES.length];
        case 'gl_account':
            return GL_ACCOUNTS[hash % GL_ACCOUNTS.length];
        case 'house_bank':
            return HOUSE_BANKS[hash % HOUSE_BANKS.length];
        case 'count':
            return String((hash % Math.min(500, 10 ** Math.min(property.maxLength ?? 3, 3) - 1)) + 1);
        case 'company_code':
            return ['1000', '1010', '1710', '3000'][hash % 4];
        case 'storage_location':
            return ['0001', '0002', 'A001', 'B001'][hash % 4];
        case 'technical_object_type':
            return ['Equipment', 'Functional Location'][hash % 2];
        case 'distribution_channel':
            return ['10', '20', '30'][hash % 3];
        case 'sales_organization':
            return ['1000', '1010', '1710', '3000'][hash % 4];
        case 'payment_terms':
            return ['0001', '0002', 'Z030', 'Z060'][hash % 4];
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
        case 'object_type':
            return ['BUS2000116', 'BUS2000120'][hash % 2];
        case 'service_document_type':
            return ['SRVO', 'SVC1', 'SVO1'][hash % 3];
        case 'sales_document_type':
            return ['OR', 'QT', 'SIP'][hash % 3];
        case 'publication_type':
            return ['MAG', 'JRN', 'BOK'][hash % 3];
        case 'genre':
            return ['POP', 'ROC', 'JAZ', 'CLS'][hash % 4];
        case 'duration_unit':
            return ['MIN', 'S'][hash % 2];
        case 'length_unit':
            return ['M', 'CM', 'MM', 'KM'][hash % 4];
        case 'congressional_district':
            return DATA_ENRICHMENT_LOCATIONS[rowIndex % DATA_ENRICHMENT_LOCATIONS.length].district;
        case 'credit_rating':
            return ['AAA', 'AA', 'A', 'BBB'][hash % 4];
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
    hash: number,
    rowIndex = 0
): JsonValue | undefined {
    if (!role) {
        return undefined;
    }
    const stringValue = stringRoleValue(role, property, context, hash, rowIndex);
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
        case 'order_status':
            return property.primitiveType === 'decimal' || property.primitiveType === 'int'
                ? hash % STATUSES.length
                : undefined;
        case 'monetary_amount':
            return boundedNumericValue(property, hash, 100, 9_099.99);
        case 'price':
            return boundedNumericValue(property, hash, 5, 500);
        case 'duration':
            return boundedNumericValue(property, hash, 1, 15);
        case 'quantity':
            return boundedNumericValue(property, hash, 1, 90.99);
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
