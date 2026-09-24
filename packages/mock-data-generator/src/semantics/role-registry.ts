import { createHash } from 'node:crypto';
import type { PrimitiveType, SchemaProperty } from '../schema/graph.js';
import { CURRENCIES, LOCATIONS, UNITS, UNIT_ISO_CODES } from './sample-catalog.js';

export interface SemanticRoleDefinition {
    family: string;
    compatiblePrimitiveTypes: readonly PrimitiveType[];
    keyPolicy: 'allowed' | 'forbidden';
    provider: 'deterministic';
    validator: 'structural' | 'email' | 'phone' | 'url' | 'iban' | 'bic' | 'country' | 'currency';
    coherenceGroup: 'none' | 'person' | 'contact' | 'location' | 'bank' | 'measure' | 'temporal' | 'organization';
    sftEligible: boolean;
    lexicalPrecisionGate: boolean;
    routeThreshold: number;
    conflictThreshold: number;
    keyCardinality?: number;
    minimumKeyLength?: number;
}

const STRING = {
    compatiblePrimitiveTypes: ['string'],
    keyPolicy: 'allowed',
    provider: 'deterministic',
    validator: 'structural',
    coherenceGroup: 'none',
    sftEligible: false,
    lexicalPrecisionGate: false,
    routeThreshold: 0.9,
    conflictThreshold: 0.95
} as const;
const NAME = { ...STRING, keyPolicy: 'forbidden', coherenceGroup: 'person' } as const;
const TEXT = { ...STRING, keyPolicy: 'forbidden', sftEligible: true } as const;
// Lexical fallback stays enabled per role unless the name-based rule contradicted the adjudicated
// train/calibration labels with a different positive role (2026-09-18 audit, `T/baselines`):
// numeric_identifier, region, unit_of_measure, company_code, payment_terms, bank_statement_id,
// storage_location and bank_name fired on status, text, address or location fields and override
// the gate to `false` below. Rules whose only misses were panel abstentions (for example generic
// identifier wording the panel left `unknown`) keep routing: they carry generation value such as
// coherent key domains, which the panel labels do not measure.
const CODE = { ...STRING, lexicalPrecisionGate: true } as const;
const LOCATION = { ...STRING, keyPolicy: 'forbidden', coherenceGroup: 'location' } as const;
const BANK = { ...STRING, coherenceGroup: 'bank' } as const;
const NUMERIC = {
    ...STRING,
    compatiblePrimitiveTypes: ['int', 'decimal'],
    keyPolicy: 'forbidden'
} as const;
const DATE = {
    ...STRING,
    compatiblePrimitiveTypes: ['date', 'datetime', 'datetimeoffset'],
    keyPolicy: 'forbidden',
    coherenceGroup: 'temporal',
    lexicalPrecisionGate: true
} as const;

export const SEMANTIC_ROLE_REGISTRY = {
    account_description: { ...TEXT, family: 'finance' },
    approval_status: { ...CODE, family: 'status' },
    audit_user: { ...NAME, family: 'identity' },
    bank_account_internal_id: { ...BANK, family: 'finance' },
    bank_account_type: { ...CODE, family: 'finance' },
    bank_name: { ...NAME, family: 'finance', coherenceGroup: 'bank', lexicalPrecisionGate: false },
    bank_statement_format: { ...CODE, family: 'finance' },
    bank_statement_id: { ...CODE, family: 'finance', lexicalPrecisionGate: false },
    bank_statement_page: { ...CODE, family: 'finance' },
    bank_statement_short_id: { ...CODE, family: 'finance' },
    bank_statement_type: { ...CODE, family: 'finance' },
    batch: { ...CODE, family: 'identifier' },
    bic: {
        ...BANK,
        family: 'finance',
        validator: 'bic',
        lexicalPrecisionGate: true,
        keyCardinality: 4,
        minimumKeyLength: 8
    },
    boolean_flag: {
        ...STRING,
        family: 'boolean',
        compatiblePrimitiveTypes: ['bool'],
        keyPolicy: 'forbidden'
    },
    business_identifier: { ...CODE, family: 'identifier' },
    business_network_id: { ...CODE, family: 'identifier' },
    business_partner_id: { ...CODE, family: 'identifier' },
    chart_of_accounts: { ...CODE, family: 'finance' },
    city: { ...LOCATION, family: 'location' },
    comment: { ...TEXT, family: 'narrative' },
    company_code: {
        ...CODE,
        lexicalPrecisionGate: false,
        family: 'organization',
        coherenceGroup: 'organization',
        keyCardinality: 4,
        minimumKeyLength: 4
    },
    confidence_level: { ...CODE, family: 'status' },
    congressional_district: { ...LOCATION, family: 'location' },
    control_code: { ...CODE, family: 'technical' },
    cost_center: { ...CODE, family: 'finance' },
    conversion_factor: { ...NUMERIC, family: 'measure' },
    conversion_offset: { ...NUMERIC, family: 'measure' },
    count: {
        ...NUMERIC,
        family: 'measure',
        compatiblePrimitiveTypes: ['string', 'int', 'decimal'],
        coherenceGroup: 'measure'
    },
    country: {
        ...CODE,
        family: 'location',
        validator: 'country',
        coherenceGroup: 'location',
        conflictThreshold: 0.99,
        // One catalog location per country, so the key domain is exactly the location bank.
        keyCardinality: LOCATIONS.length,
        minimumKeyLength: 2
    },
    country_name: { ...LOCATION, family: 'location', lexicalPrecisionGate: true },
    currency_name: {
        ...NAME,
        family: 'finance',
        coherenceGroup: 'measure',
        lexicalPrecisionGate: true
    },
    credit_rating: { ...CODE, family: 'risk' },
    currency: {
        ...CODE,
        family: 'finance',
        validator: 'currency',
        coherenceGroup: 'measure',
        keyCardinality: CURRENCIES.length,
        minimumKeyLength: 3
    },
    customer_purchase_order: { ...CODE, family: 'identifier' },
    customer_id: { ...CODE, family: 'identifier' },
    date: { ...DATE, family: 'temporal', compatiblePrimitiveTypes: ['date'] },
    data_enrichment_business_status: { ...CODE, family: 'status' },
    data_enrichment_city: { ...LOCATION, family: 'location' },
    data_enrichment_country: { ...LOCATION, family: 'location' },
    data_enrichment_ethnicity: { ...STRING, family: 'identity', keyPolicy: 'forbidden' },
    data_enrichment_postal_code: { ...LOCATION, family: 'location' },
    data_enrichment_region: { ...LOCATION, family: 'location' },
    data_enrichment_street_address: { ...LOCATION, family: 'location' },
    decimal_places: { ...NUMERIC, family: 'measure', compatiblePrimitiveTypes: ['int'] },
    description: { ...TEXT, family: 'narrative' },
    datetime: { ...DATE, family: 'temporal', compatiblePrimitiveTypes: ['datetime', 'datetimeoffset'] },
    dimension_exponent: { ...NUMERIC, family: 'measure' },
    distribution_channel: { ...CODE, family: 'organization' },
    document_id: { ...CODE, family: 'identifier' },
    document_item: { ...CODE, family: 'identifier' },
    distance: { ...NUMERIC, family: 'measure', lexicalPrecisionGate: true },
    duration: { ...NUMERIC, family: 'measure', coherenceGroup: 'measure' },
    duration_unit: { ...CODE, family: 'measure', coherenceGroup: 'measure' },
    email: {
        ...STRING,
        family: 'contact',
        keyPolicy: 'forbidden',
        validator: 'email',
        coherenceGroup: 'contact',
        lexicalPrecisionGate: true
    },
    employee_id: { ...CODE, family: 'identifier' },
    end_date: { ...DATE, family: 'temporal' },
    equipment_id: { ...CODE, family: 'identifier' },
    equipment_name: { ...NAME, family: 'asset' },
    ethnicity: { ...STRING, family: 'identity', keyPolicy: 'forbidden' },
    exponent: { ...NUMERIC, family: 'measure' },
    field_control: { ...NUMERIC, family: 'technical', compatiblePrimitiveTypes: ['int'] },
    fiscal_period: { ...CODE, family: 'temporal' },
    genre: { ...CODE, family: 'classification' },
    gl_account: { ...CODE, family: 'finance' },
    guid_text: { ...CODE, family: 'identifier' },
    house_bank: {
        ...CODE,
        family: 'finance',
        coherenceGroup: 'bank',
        keyCardinality: 4,
        minimumKeyLength: 4
    },
    iban: { ...BANK, family: 'finance', validator: 'iban', lexicalPrecisionGate: true },
    indicator: { ...CODE, family: 'boolean' },
    interest_rate: { ...NUMERIC, family: 'finance' },
    language: { ...CODE, family: 'locale' },
    length_unit: { ...CODE, family: 'measure', coherenceGroup: 'measure' },
    long_text: { ...TEXT, family: 'narrative' },
    material_no: { ...CODE, family: 'identifier' },
    measurement_dimension: { ...CODE, family: 'measure' },
    mobile_phone: {
        ...STRING,
        family: 'contact',
        keyPolicy: 'forbidden',
        validator: 'phone',
        coherenceGroup: 'contact',
        lexicalPrecisionGate: true
    },
    monetary_amount: { ...NUMERIC, family: 'finance', coherenceGroup: 'measure' },
    notes: { ...TEXT, family: 'narrative' },
    numeric_identifier: { ...CODE, family: 'identifier', lexicalPrecisionGate: false },
    object_type: { ...CODE, family: 'classification' },
    status: {
        ...CODE,
        family: 'status',
        compatiblePrimitiveTypes: ['string', 'int', 'decimal'],
        keyPolicy: 'forbidden'
    },
    org_name: { ...NAME, family: 'organization', coherenceGroup: 'organization' },
    // Added 2026-09-21 from a three-judge adjudication of 311 fields (guideline v3). Routed by name
    // rules only: the head carries no calibration evidence for them. Each rule was validated against
    // the panel majority before the gate was opened (`T/baselines/2026-09-21-phase-e-roles.json`).
    manufacturer: { ...NAME, family: 'organization', coherenceGroup: 'organization', lexicalPrecisionGate: true },
    payment_file_id: { ...CODE, family: 'identifier' },
    payment_terms: { ...CODE, family: 'finance', lexicalPrecisionGate: false },
    payment_transaction_group: {
        ...CODE,
        family: 'finance',
        keyCardinality: 3,
        minimumKeyLength: 8
    },
    percentage: { ...NUMERIC, family: 'measure' },
    person_first_name: { ...NAME, family: 'identity', lexicalPrecisionGate: true },
    person_full_name: { ...NAME, family: 'identity', lexicalPrecisionGate: true },
    person_last_name: { ...NAME, family: 'identity', lexicalPrecisionGate: true },
    phone: {
        ...STRING,
        family: 'contact',
        keyPolicy: 'forbidden',
        validator: 'phone',
        coherenceGroup: 'contact',
        lexicalPrecisionGate: true
    },
    plant: { ...CODE, family: 'organization' },
    postal_code: { ...LOCATION, family: 'location' },
    pressure: { ...NUMERIC, family: 'measure', coherenceGroup: 'measure' },
    pressure_unit: { ...CODE, family: 'measure', coherenceGroup: 'measure' },
    price: { ...NUMERIC, family: 'finance', coherenceGroup: 'measure' },
    product_category: { ...CODE, family: 'product' },
    product_name: { ...NAME, family: 'product' },
    publication_type: { ...CODE, family: 'classification' },
    purchase_order_no: { ...CODE, family: 'identifier' },
    quantity: { ...NUMERIC, family: 'measure', coherenceGroup: 'measure' },
    rating: { ...NUMERIC, family: 'measure', lexicalPrecisionGate: true },
    region: { ...LOCATION, family: 'location', lexicalPrecisionGate: false },
    region_name: { ...LOCATION, family: 'location', lexicalPrecisionGate: true },
    remark: { ...TEXT, family: 'narrative' },
    risk_class: { ...NUMERIC, family: 'risk' },
    sales_division: { ...CODE, family: 'organization' },
    sales_doc_no: { ...CODE, family: 'identifier' },
    sales_document_type: { ...CODE, family: 'classification' },
    sales_item_proposal_description: { ...TEXT, family: 'narrative' },
    sales_organization: { ...CODE, family: 'organization', coherenceGroup: 'organization' },
    service_document_item_category: { ...CODE, family: 'classification' },
    service_document_type: { ...CODE, family: 'classification' },
    service_organization: { ...CODE, family: 'organization', coherenceGroup: 'organization' },
    service_team: { ...CODE, family: 'organization', coherenceGroup: 'organization' },
    source_name: { ...NAME, family: 'organization' },
    start_date: { ...DATE, family: 'temporal' },
    storage_location: { ...CODE, family: 'organization', lexicalPrecisionGate: false },
    street_address: { ...LOCATION, family: 'location' },
    technical_object_type: { ...CODE, family: 'classification' },
    temperature: { ...NUMERIC, family: 'measure', coherenceGroup: 'measure' },
    temperature_unit: { ...CODE, family: 'measure', coherenceGroup: 'measure' },
    tax_code: { ...CODE, family: 'finance' },
    time: { ...STRING, family: 'temporal', compatiblePrimitiveTypes: ['time'], coherenceGroup: 'temporal' },
    timezone: { ...CODE, family: 'locale' },
    unique_item_identifier: { ...CODE, family: 'identifier' },
    unique_item_identifier_structure_type: { ...CODE, family: 'classification' },
    unit_of_measure: {
        ...CODE,
        lexicalPrecisionGate: false,
        family: 'measure',
        coherenceGroup: 'measure',
        keyCardinality: UNITS.length,
        minimumKeyLength: 2
    },
    unit_of_measure_iso: {
        ...CODE,
        family: 'measure',
        coherenceGroup: 'measure',
        keyCardinality: new Set(Object.values(UNIT_ISO_CODES)).size,
        minimumKeyLength: 3
    },
    url: {
        ...STRING,
        family: 'contact',
        keyPolicy: 'forbidden',
        validator: 'url'
    },
    vendor_id: { ...CODE, family: 'identifier' },
    year: {
        ...CODE,
        family: 'temporal',
        compatiblePrimitiveTypes: ['string', 'int'],
        coherenceGroup: 'temporal'
    }
} as const satisfies Record<string, SemanticRoleDefinition>;

export type SemanticRole = keyof typeof SEMANTIC_ROLE_REGISTRY;

export const SEMANTIC_ROLE_REGISTRY_FINGERPRINT = createHash('sha256')
    .update(JSON.stringify(SEMANTIC_ROLE_REGISTRY))
    .digest('hex');

export function semanticRoleDefinition(role: string): SemanticRoleDefinition | undefined {
    return Object.prototype.hasOwnProperty.call(SEMANTIC_ROLE_REGISTRY, role)
        ? SEMANTIC_ROLE_REGISTRY[role as SemanticRole]
        : undefined;
}

export function semanticRoleCompatibility(
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

export type StringDateFormat = 'yyyymmdd' | 'iso-date' | 'yyyymmddhhmmss' | 'iso-datetime';

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
    if (length === undefined || length >= 19) {
        return 'iso-datetime';
    }
    const formats: Readonly<Record<number, StringDateFormat>> = { 8: 'yyyymmdd', 10: 'iso-date', 14: 'yyyymmddhhmmss' };
    return formats[length];
}

/**
 * Role compatibility that also lets a classifier-accepted date role fill a non-key string column whose
 * length implies a date format. The role registry itself, which the classifier head pins, is unchanged.
 *
 * @param role the classifier's role
 * @param property the column
 * @returns the compatibility
 */
export function classifierRoleCompatibility(
    role: string,
    property: Pick<SchemaProperty, 'primitiveType' | 'isKey' | 'maxLength'>
): ReturnType<typeof semanticRoleCompatibility> {
    const compatibility = semanticRoleCompatibility(role, property);
    if (
        compatibility === 'incompatible-type' &&
        STRING_DATE_ROLES.has(role) &&
        !property.isKey &&
        stringDateFormat(property) !== undefined
    ) {
        return 'compatible';
    }
    return compatibility;
}

export function semanticRoleKeyCardinality(
    role: string | undefined,
    property: Pick<SchemaProperty, 'maxLength'>
): number | undefined {
    if (!role) {
        return undefined;
    }
    const definition = semanticRoleDefinition(role);
    if (
        definition?.keyCardinality === undefined ||
        (definition.minimumKeyLength !== undefined &&
            property.maxLength !== undefined &&
            property.maxLength < definition.minimumKeyLength)
    ) {
        return undefined;
    }
    return definition.keyCardinality;
}
