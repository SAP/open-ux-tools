import type { JsonValue } from '../types.js';
import type { SchemaProperty } from '../schema/graph.js';

const FIRST_NAMES = ['Amelia', 'Lucas', 'Sofia', 'Noah', 'Maya', 'Elias', 'Nora', 'Daniel'] as const;
const LAST_NAMES = ['Fischer', 'Murphy', 'Rossi', 'Novak', 'Silva', 'Weber', 'Martin', 'Keller'] as const;
const LOCATIONS = [
    { city: 'Berlin', country: 'DE', countryName: 'Germany', region: 'BE', postalCode: '10115' },
    { city: 'Dublin', country: 'IE', countryName: 'Ireland', region: 'L', postalCode: 'D02' },
    { city: 'Milan', country: 'IT', countryName: 'Italy', region: 'MI', postalCode: '20121' },
    { city: 'Prague', country: 'CZ', countryName: 'Czechia', region: 'PR', postalCode: '11000' }
] as const;
const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF'] as const;
const UNITS = ['EA', 'KG', 'L', 'H', 'PC'] as const;
const ORGANIZATIONS = ['Northwind Trading', 'Alpine Supply', 'Blue River Industries', 'Summit Services'] as const;
const PRODUCTS = ['Industrial Pump', 'Safety Valve', 'Service Package', 'Control Module'] as const;
const STATUSES = ['Open', 'In Progress', 'Approved', 'Completed'] as const;

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

function stringRoleValue(role: string, context: SemanticRowContext, hash: number): string | undefined {
    switch (role) {
        case 'person_first_name':
            return context.firstName;
        case 'person_last_name':
            return context.lastName;
        case 'person_full_name':
            return `${context.firstName} ${context.lastName}`;
        case 'email':
            return `${context.firstName.toLowerCase()}.${context.lastName.toLowerCase()}@example.com`;
        case 'phone':
            return `+353 1 ${String((hash % 9_000_000) + 1_000_000)}`;
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
            return STATUSES[hash % STATUSES.length];
        case 'language':
            return ['EN', 'DE', 'FR', 'IT'][hash % 4];
        case 'timezone':
            return ['Europe/Dublin', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'][hash % 4];
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
    const stringValue = stringRoleValue(role, context, hash);
    if (stringValue !== undefined && property.primitiveType === 'string') {
        return truncate(stringValue, property.maxLength);
    }
    switch (role) {
        case 'monetary_amount':
            return property.primitiveType === 'decimal' || property.primitiveType === 'int'
                ? Number((((hash % 900_000) + 10_000) / 100).toFixed(property.scale ?? 2))
                : undefined;
        case 'quantity':
            return property.primitiveType === 'decimal' || property.primitiveType === 'int'
                ? Number((((hash % 9_000) + 100) / 100).toFixed(property.scale ?? 2))
                : undefined;
        case 'percentage':
            return property.primitiveType === 'decimal' || property.primitiveType === 'int'
                ? Number(((hash % 10_001) / 100).toFixed(property.scale ?? 2))
                : undefined;
        case 'year':
            return property.primitiveType === 'int' ? context.startDate.getUTCFullYear() : undefined;
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
