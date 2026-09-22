import { readFileSync } from 'node:fs';

interface LocationSample {
    city: string;
    country: string;
    countryName: string;
    region: string;
    regionName: string;
    postalCode: string;
    phonePrefix: string;
    phoneSubscriberDigits: number;
    mobilePrefix: string;
    mobileSubscriberDigits: number;
}

interface DataEnrichmentLocation {
    city: string;
    country: string;
    district: string;
    postalCode: string;
    region: string;
    streetAddress: string;
}

interface StatusSample {
    code: string;
    text: string;
}

interface UnitSample extends StatusSample {
    iso: string;
}

interface Catalog {
    id: string;
    version: string;
    locations: readonly LocationSample[];
    dataEnrichmentLocations: readonly DataEnrichmentLocation[];
    currencies: readonly string[];
    units: readonly string[];
    unitIsoCodes: Readonly<Record<string, string>>;
    statusSamples: readonly StatusSample[];
    unitSamples: readonly UnitSample[];
    products: readonly string[];
    equipmentNames: readonly string[];
    ethnicities: readonly string[];
    fieldControlValues: readonly number[];
    measurementDimensions: readonly string[];
    priceSources: readonly string[];
    accountDescriptions: readonly string[];
    bankNames: readonly string[];
    roleSamples: Readonly<Record<string, readonly string[]>>;
}

function loadCatalog(): Catalog {
    const value = JSON.parse(
        readFileSync(new URL('../../resources/datasets/synthetic-catalog.v2.json', import.meta.url), 'utf8')
    ) as unknown;
    if (
        !value ||
        typeof value !== 'object' ||
        !('id' in value) ||
        value.id !== 'offline-synthetic-catalog' ||
        !('version' in value) ||
        value.version !== '2'
    ) {
        throw new TypeError('The versioned synthetic catalog resource is invalid');
    }
    const catalog = value as Catalog;
    if (
        ![
            catalog.locations,
            catalog.dataEnrichmentLocations,
            catalog.currencies,
            catalog.units,
            catalog.statusSamples,
            catalog.unitSamples,
            catalog.products,
            catalog.equipmentNames,
            catalog.ethnicities,
            catalog.fieldControlValues,
            catalog.measurementDimensions,
            catalog.priceSources,
            catalog.accountDescriptions,
            catalog.bankNames
        ].every((entries) => Array.isArray(entries) && entries.length > 0) ||
        !catalog.unitIsoCodes ||
        typeof catalog.unitIsoCodes !== 'object' ||
        !catalog.roleSamples ||
        typeof catalog.roleSamples !== 'object' ||
        Object.values(catalog.roleSamples).some((samples) => !Array.isArray(samples) || samples.length === 0)
    ) {
        throw new TypeError('The versioned synthetic catalog is incomplete');
    }
    if (
        catalog.statusSamples.some(({ code, text }) => typeof code !== 'string' || typeof text !== 'string') ||
        catalog.unitSamples.some(
            ({ code, iso, text }) => typeof code !== 'string' || typeof iso !== 'string' || typeof text !== 'string'
        )
    ) {
        throw new TypeError('The versioned synthetic catalog contains invalid coherence samples');
    }
    return Object.freeze(catalog);
}

/** Replaceable offline samples; application evidence always overrides these examples. */
const CATALOG = loadCatalog();
export const LOCATIONS = CATALOG.locations;
export const DATA_ENRICHMENT_LOCATIONS = CATALOG.dataEnrichmentLocations;
export const CURRENCIES = CATALOG.currencies;
export const UNITS = CATALOG.units;
export const UNIT_ISO_CODES = CATALOG.unitIsoCodes;
export const STATUS_SAMPLES = CATALOG.statusSamples;
export const UNIT_SAMPLES = CATALOG.unitSamples;
export const PRODUCTS = CATALOG.products;
export const EQUIPMENT_NAMES = CATALOG.equipmentNames;
export const ETHNICITIES = CATALOG.ethnicities;
export const FIELD_CONTROL_VALUES = CATALOG.fieldControlValues;
export const MEASUREMENT_DIMENSIONS = CATALOG.measurementDimensions;
export const PRICE_SOURCES = CATALOG.priceSources;
export const ACCOUNT_DESCRIPTIONS = CATALOG.accountDescriptions;
export const BANK_NAMES = CATALOG.bankNames;
export const CATALOG_ROLE_SAMPLES = CATALOG.roleSamples;
