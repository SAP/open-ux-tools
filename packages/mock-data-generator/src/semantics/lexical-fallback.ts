import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { SemanticClassification } from '../types.js';
import { capCodeListField } from './cap-code-lists.js';
import { semanticPropertyKey } from './classifier.js';
import { semanticRoleCompatibility, semanticRoleDefinition } from './role-registry.js';
import { semanticRoleForSapDataElement } from './sap-data-elements.js';

function tokens(name: string): ReadonlyArray<string> {
    return name
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
}

function has(words: ReadonlySet<string>, ...candidates: ReadonlyArray<string>): boolean {
    return candidates.some((candidate) => words.has(candidate));
}

const EXPLICIT_TERM_ROLES: ReadonlyArray<readonly [string, string]> = [
    ['.isemailaddress', 'email'],
    ['.isphonenumber', 'phone'],
    ['.isurl', 'url'],
    ['.iscurrency', 'currency'],
    ['.isocurrency', 'monetary_amount']
];

const SAP_SEMANTIC_ROLES = new Map<string, string>([
    ['email', 'email'],
    ['email-address', 'email'],
    ['tel', 'phone'],
    ['telephone', 'phone'],
    ['phone', 'phone'],
    ['url', 'url'],
    ['uri', 'url'],
    ['currency', 'currency'],
    ['currency-code', 'currency'],
    ['iso-currency', 'currency'],
    ['unit', 'unit_of_measure'],
    ['unit-of-measure', 'unit_of_measure'],
    ['amount', 'monetary_amount']
]);

const AUTHORITATIVE_TECHNICAL_ROLES = new Set([
    'account_description',
    'approval_status',
    'bank_account_type',
    'bank_account_internal_id',
    'bank_name',
    'bank_statement_format',
    'bank_statement_id',
    'bank_statement_page',
    'bank_statement_short_id',
    'bank_statement_type',
    'business_network_id',
    'company_code',
    'confidence_level',
    'congressional_district',
    'count',
    'credit_rating',
    'customer_purchase_order',
    'distribution_channel',
    'document_id',
    'document_item',
    'dimension_exponent',
    'duration_unit',
    'employee_id',
    'equipment_name',
    'genre',
    'gl_account',
    'guid_text',
    'house_bank',
    'indicator',
    'length_unit',
    'mobile_phone',
    'object_type',
    'org_name',
    'payment_file_id',
    'payment_terms',
    'payment_transaction_group',
    'plant',
    'publication_type',
    'risk_class',
    'sales_document_type',
    'sales_division',
    'sales_item_proposal_description',
    'sales_organization',
    'service_document_item_category',
    'service_document_type',
    'service_organization',
    'service_team',
    'source_name',
    'storage_location',
    'technical_object_type',
    'unit_of_measure_iso',
    'unique_item_identifier',
    'unique_item_identifier_structure_type'
]);

const LEXICAL_FALLBACK_BLOCKED_ROLES = new Set(['approval_status', 'status', 'data_enrichment_business_status']);

// Framework bookkeeping fields carry no business meaning: CAP draft administration
// (`IsActiveEntity`, `HasDraftEntity`, `DraftAdministrativeData_DraftUUID`, `DraftEntity*`) and
// Fiori action-control flags (`*_ac`). The review guideline labels them `unknown`; routing them
// as booleans, timestamps or users would generate business values for technical columns.
const TECHNICAL_FIELD_PATTERN = /^(?:Is|Has)(?:Active|Draft)Entity$|^Draft(?:AdministrativeData|Entity|UUID)|_ac$/iu;

/**
 * Whether a property is framework bookkeeping rather than business data.
 *
 * @param propertyName
 */
export function isTechnicalField(propertyName: string): boolean {
    return TECHNICAL_FIELD_PATTERN.test(propertyName);
}

function lexicalRoleForText(text: string, primitiveType: SchemaProperty['primitiveType']): string | undefined {
    const fieldTokens = tokens(text);
    const words = new Set(fieldTokens);
    const last = fieldTokens.at(-1);
    const numeric = primitiveType === 'int' || primitiveType === 'decimal';

    // Validated 2026-09-21 against a three-judge majority over 311 adjudicated fields
    // (guideline v3): manufacturer 63/63, distance 80/80, rating 17/17. The exclusions are the
    // neighbours the panel labelled differently — a manufacturer's URL, a distance's unit, a
    // hierarchy depth, a credit grade, a rating's caption.
    if (
        primitiveType === 'string' &&
        has(words, 'manufacturer', 'producer') &&
        !has(words, 'url', 'uri', 'link', 'id', 'code', 'number', 'no', 'country', 'date', 'part')
    ) {
        return 'manufacturer';
    }
    if (numeric && has(words, 'mileage', 'distance', 'odometer') && !has(words, 'unit', 'uom', 'root', 'hierarchy')) {
        return 'distance';
    }
    if (
        numeric &&
        has(words, 'rating', 'stars') &&
        !has(words, 'credit', 'risk', 'text', 'description', 'comment', 'count')
    ) {
        return 'rating';
    }

    if (has(words, 'email', 'mail')) {
        return 'email';
    }
    if (has(words, 'mobile')) {
        return 'mobile_phone';
    }
    if (has(words, 'phone', 'telephone')) {
        return 'phone';
    }
    if (has(words, 'url', 'uri', 'website', 'homepage')) {
        return 'url';
    }
    if (has(words, 'firstname', 'given') || (has(words, 'first') && has(words, 'name'))) {
        return 'person_first_name';
    }
    if (has(words, 'lastname', 'surname', 'family') || (has(words, 'last') && has(words, 'name'))) {
        return 'person_last_name';
    }
    if (has(words, 'fullname') || (has(words, 'full', 'display') && has(words, 'name'))) {
        return 'person_full_name';
    }
    if (has(words, 'artist') && has(words, 'name')) {
        return 'person_full_name';
    }
    if (has(words, 'account') && has(words, 'holder')) {
        return 'org_name';
    }
    if (has(words, 'bank') && has(words, 'account') && has(words, 'additional') && has(words, 'name')) {
        return 'account_description';
    }
    if (has(words, 'bank') && has(words, 'account') && has(words, 'internal') && has(words, 'id')) {
        return 'bank_account_internal_id';
    }
    if (has(words, 'bank') && has(words, 'account') && has(words, 'type')) {
        return 'bank_account_type';
    }
    if (has(words, 'bank') && has(words, 'data') && has(words, 'storage') && has(words, 'application')) {
        return 'bank_statement_type';
    }
    if (has(words, 'statement') && has(words, 'format')) {
        return 'bank_statement_format';
    }
    if (has(words, 'bank') && has(words, 'statement') && has(words, 'page') && has(words, 'number')) {
        return 'bank_statement_page';
    }
    if (has(words, 'bank') && has(words, 'statement') && has(words, 'short') && has(words, 'id', 'key')) {
        return 'bank_statement_short_id';
    }
    if (has(words, 'bank') && has(words, 'statement') && has(words, 'type')) {
        return 'bank_statement_type';
    }
    if (
        has(words, 'bank') &&
        has(words, 'statement') &&
        !has(words, 'page', 'format', 'short', 'type', 'item', 'items', 'record', 'records')
    ) {
        return 'bank_statement_id';
    }
    if (has(words, 'house') && has(words, 'bank') && !has(words, 'name', 'text', 'description', 'account')) {
        return 'house_bank';
    }
    if (has(words, 'bank') && has(words, 'name')) {
        return 'bank_name';
    }
    if (has(words, 'incoming', 'payment') && has(words, 'file')) {
        return 'payment_file_id';
    }
    if (has(words, 'payment', 'pmnt') && has(words, 'transaction', 'tran') && has(words, 'group')) {
        return 'payment_transaction_group';
    }
    if (has(words, 'sending') && has(words, 'bank')) {
        return 'bank_name';
    }
    if (has(words, 'company') && has(words, 'code') && !has(words, 'name', 'text', 'description')) {
        return 'company_code';
    }
    if (has(words, 'storage') && has(words, 'location')) {
        return 'storage_location';
    }
    if (
        has(words, 'tech', 'technical') &&
        has(words, 'obj', 'object') &&
        (has(words, 'type') || (has(words, 'equip') && has(words, 'funcnl', 'functional')))
    ) {
        return 'technical_object_type';
    }
    if (has(words, 'equipment') && has(words, 'name', 'description', 'text')) {
        return 'equipment_name';
    }
    if (has(words, 'tech', 'technical') && has(words, 'object') && has(words, 'name', 'description', 'text')) {
        return 'equipment_name';
    }
    if (
        has(words, 'unique') &&
        has(words, 'item') &&
        has(words, 'id', 'identifier') &&
        has(words, 'plant') &&
        has(words, 'resp', 'responsible')
    ) {
        return 'plant';
    }
    if (
        has(words, 'unique') &&
        has(words, 'item') &&
        has(words, 'id', 'identifier') &&
        has(words, 'struc', 'structure') &&
        has(words, 'type')
    ) {
        return 'unique_item_identifier_structure_type';
    }
    if (has(words, 'unique') && has(words, 'item') && has(words, 'id', 'identifier')) {
        return 'unique_item_identifier';
    }
    if (has(words, 'distribution') && has(words, 'channel')) {
        return 'distribution_channel';
    }
    if (has(words, 'division') && !has(words, 'description', 'name', 'text')) {
        return 'sales_division';
    }
    if (has(words, 'sales') && has(words, 'organization', 'organisation') && has(words, 'description', 'name')) {
        return 'org_name';
    }
    if (has(words, 'sales') && has(words, 'organization', 'organisation') && !has(words, 'fc')) {
        return 'sales_organization';
    }
    if (has(words, 'payment') && has(words, 'terms')) {
        return 'payment_terms';
    }
    if (has(words, 'employee') && !has(words, 'name', 'description')) {
        return 'employee_id';
    }
    if (
        has(words, 'service') &&
        has(words, 'organization', 'organisation') &&
        !has(words, 'name', 'text', 'description')
    ) {
        return 'service_organization';
    }
    if (has(words, 'service') && has(words, 'team')) {
        return 'service_team';
    }
    if (primitiveType === 'string' && has(words, 'is', 'has') && has(words, 'open', 'error')) {
        return 'indicator';
    }
    if (has(words, 'purchase') && has(words, 'order') && has(words, 'customer')) {
        return 'customer_purchase_order';
    }
    if (has(words, 'service') && has(words, 'doc', 'document') && has(words, 'item') && has(words, 'category')) {
        return 'service_document_item_category';
    }
    if (has(words, 'service') && has(words, 'document') && has(words, 'item') && has(words, 'object', 'type')) {
        return 'object_type';
    }
    if (
        primitiveType === 'string' &&
        has(words, 'service') &&
        has(words, 'document') &&
        has(words, 'item') &&
        !has(
            words,
            'name',
            'text',
            'description',
            'status',
            'uuid',
            'guid',
            'char',
            'open',
            'error',
            'amount',
            'net',
            'gross',
            'quantity',
            'qty',
            'category'
        )
    ) {
        return 'document_item';
    }
    if (has(words, 'service') && has(words, 'document') && has(words, 'type')) {
        return 'service_document_type';
    }
    if (
        has(words, 'service') &&
        has(words, 'document') &&
        !has(
            words,
            'name',
            'text',
            'description',
            'status',
            'uuid',
            'guid',
            'char',
            'item',
            'items',
            'open',
            'error',
            'amount',
            'net',
            'gross',
            'quantity',
            'qty',
            'category'
        )
    ) {
        return 'document_id';
    }
    if (has(words, 'proposal') && !has(words, 'name', 'text', 'description', 'type', 'status')) {
        return 'document_id';
    }
    if (has(words, 'sales') && has(words, 'item') && has(words, 'proposal') && has(words, 'description')) {
        return 'sales_item_proposal_description';
    }
    if (has(words, 'sales') && has(words, 'document') && has(words, 'type')) {
        return 'sales_document_type';
    }
    if (has(words, 'object') && has(words, 'type')) {
        return 'object_type';
    }
    if (has(words, 'publication') && has(words, 'type')) {
        return 'publication_type';
    }
    if (has(words, 'genre')) {
        return 'genre';
    }
    if (has(words, 'title') && has(words, 'length')) {
        return primitiveType === 'string' ? 'duration_unit' : 'duration';
    }
    if (primitiveType === 'string' && has(words, 'length') && has(words, 'unit')) {
        return 'length_unit';
    }
    if (has(words, 'alias') || fieldTokens.some((token) => /^alias\d+$/u.test(token))) {
        return 'org_name';
    }
    if (has(words, 'an') && has(words, 'number')) {
        return 'business_network_id';
    }
    if (has(words, 'ultimate') && has(words, 'name')) {
        return 'org_name';
    }
    if (has(words, 'congressional') && has(words, 'district')) {
        return 'congressional_district';
    }
    if (has(words, 'credit') && has(words, 'rating')) {
        return 'credit_rating';
    }
    if (primitiveType === 'string' && has(words, 'confidence')) {
        return 'confidence_level';
    }
    if (fieldTokens.some((token) => token === 'css' || token.endsWith('css')) && has(words, 'class')) {
        return 'risk_class';
    }
    if (has(words, 'formatted') && has(words, 'name')) {
        return 'person_full_name';
    }
    if (has(words, 'timezone') || (has(words, 'time') && has(words, 'zone'))) {
        return 'timezone';
    }
    if (has(words, 'ethnicity', 'ethnic')) {
        return 'ethnicity';
    }
    if (primitiveType === 'string' && has(words, 'source') && has(words, 'name')) {
        return 'source_name';
    }
    if (primitiveType === 'string' && has(words, 'account') && has(words, 'text', 'description')) {
        return 'account_description';
    }
    if (primitiveType === 'string' && has(words, 'uuid', 'guid')) {
        return 'guid_text';
    }
    if (primitiveType === 'string' && has(words, 'batch')) {
        return 'batch';
    }
    if (primitiveType === 'string' && has(words, 'plant')) {
        return 'plant';
    }
    if (primitiveType === 'string' && has(words, 'gl') && has(words, 'account')) {
        return 'gl_account';
    }
    if (primitiveType === 'string' && has(words, 'account') && has(words, 'number')) {
        return 'numeric_identifier';
    }
    if (
        primitiveType === 'string' &&
        !has(words, 'status', 'name', 'text', 'description', 'address') &&
        ((has(words, 'document') && has(words, 'item')) || has(words, 'order'))
    ) {
        return 'numeric_identifier';
    }
    if (
        primitiveType === 'string' &&
        !has(words, 'name', 'text', 'description', 'address', 'status') &&
        has(words, 'customer', 'supplier', 'payer', 'party', 'owner')
    ) {
        return 'numeric_identifier';
    }
    if (primitiveType === 'string' && has(words, 'identifier', 'reference') && has(words, 'id', 'number', 'key')) {
        return 'business_identifier';
    }
    if (has(words, 'currency', 'waers')) {
        return 'currency';
    }
    if (has(words, 'chart') && has(words, 'account', 'accounts')) {
        return 'chart_of_accounts';
    }
    if (last === 'equipment' || (has(words, 'technical') && has(words, 'object'))) {
        return 'equipment_id';
    }
    if (has(words, 'interest') && has(words, 'rate')) {
        return 'interest_rate';
    }
    if (has(words, 'price')) {
        return 'price';
    }
    if (has(words, 'amount', 'total', 'net', 'gross', 'fee', 'charge', 'cost')) {
        return 'monetary_amount';
    }
    if (has(words, 'quantity', 'qty')) {
        return 'quantity';
    }
    if (primitiveType === 'string' && has(words, 'unit') && has(words, 'iso') && has(words, 'code')) {
        return 'unit_of_measure_iso';
    }
    if (has(words, 'dimension')) {
        return 'measurement_dimension';
    }
    if (has(words, 'additive') && has(words, 'constant', 'value')) {
        return 'conversion_offset';
    }
    if (has(words, 'conversion', 'cnvrsn') && has(words, 'numerator', 'denominator')) {
        return 'conversion_factor';
    }
    if (has(words, 'decimal', 'decimals', 'dcmls') && has(words, 'place', 'places', 'number', 'nmbr', 'rounding')) {
        return 'decimal_places';
    }
    if (has(words, 'exponent')) {
        return 'exponent';
    }
    if (primitiveType === 'string' && has(words, 'temperature') && has(words, 'unit')) {
        return 'temperature_unit';
    }
    if (primitiveType === 'string' && has(words, 'pressure') && has(words, 'unit')) {
        return 'pressure_unit';
    }
    if (
        (primitiveType === 'int' || primitiveType === 'decimal') &&
        has(words, 'unit') &&
        has(words, 'measure') &&
        has(words, 'pressure', 'length', 'mass', 'temperature', 'time')
    ) {
        return 'dimension_exponent';
    }
    if (has(words, 'temperature')) {
        return 'temperature';
    }
    if (has(words, 'pressure')) {
        return 'pressure';
    }
    if (
        (primitiveType === 'int' || primitiveType === 'string') &&
        (has(words, 'count') || (has(words, 'number', 'no', 'nmbr') && has(words, 'item', 'items')))
    ) {
        return 'count';
    }
    if (has(words, 'unit', 'uom') || (last === 'measure' && primitiveType === 'string')) {
        return 'unit_of_measure';
    }
    if (has(words, 'percentage', 'percent', 'rate') && primitiveType === 'decimal') {
        return 'percentage';
    }
    if (has(words, 'start', 'begin', 'from') && has(words, 'date', 'time')) {
        return 'start_date';
    }
    if (has(words, 'end', 'until', 'to') && has(words, 'date', 'time')) {
        return 'end_date';
    }
    if (has(words, 'date')) {
        return 'date';
    }
    if (has(words, 'datetime', 'timestamp')) {
        return 'datetime';
    }
    if (has(words, 'time')) {
        return 'time';
    }
    if (has(words, 'country')) {
        return has(words, 'name', 'text', 'description') ? 'country_name' : 'country';
    }
    if (has(words, 'city', 'town')) {
        return 'city';
    }
    if (has(words, 'region', 'state', 'province')) {
        return has(words, 'name', 'text', 'description') ? 'region_name' : 'region';
    }
    if (has(words, 'postal', 'postcode', 'zipcode') || (has(words, 'zip') && has(words, 'code'))) {
        return 'postal_code';
    }
    if (has(words, 'street') || (has(words, 'address') && !has(words, 'email'))) {
        return 'street_address';
    }
    if (has(words, 'company', 'organization', 'organisation', 'supplier', 'vendor') && has(words, 'name')) {
        return 'org_name';
    }
    if (has(words, 'product', 'material') && has(words, 'name')) {
        return 'product_name';
    }
    // `descr` is the abbreviation, not a different concept: of 100 adjudicated fields whose name
    // carries it, 98 were labelled `description` and none carried a conflicting positive role.
    if (has(words, 'description', 'descr')) {
        return 'description';
    }
    if (has(words, 'comment', 'remark', 'notes')) {
        return last ?? 'notes';
    }
    if (has(words, 'status')) {
        if (has(words, 'approval')) {
            return 'approval_status';
        }
        if (primitiveType === 'string' && has(words, 'error') && text.toLowerCase().includes('has')) {
            return 'indicator';
        }
        return 'status';
    }
    if (has(words, 'language', 'locale')) {
        return 'language';
    }
    if (has(words, 'year')) {
        return 'year';
    }
    return undefined;
}

/**
 * Prefer a business-facing label over the technical property name.
 *
 * @param property - Canonical schema property.
 * @returns A conservative lexical role, when one is recognized.
 */
function lexicalRole(property: SchemaProperty): string | undefined {
    if (property.primitiveType === 'bool') {
        return 'boolean_flag';
    }
    const propertyTokens = tokens(property.name);
    const propertyWords = new Set(propertyTokens);
    const technicalRole = lexicalRoleForText(property.name, property.primitiveType);
    if (property.name.toLowerCase().endsWith('_fc') || (has(propertyWords, 'field') && has(propertyWords, 'control'))) {
        return property.primitiveType === 'string' ? 'control_code' : 'field_control';
    }
    if (
        technicalRole &&
        (AUTHORITATIVE_TECHNICAL_ROLES.has(technicalRole) ||
            (propertyTokens.includes('text') && ['country_name', 'region_name'].includes(technicalRole)))
    ) {
        return technicalRole;
    }
    if (
        property.primitiveType === 'string' &&
        (property.maxLength ?? Number.POSITIVE_INFINITY) <= 2 &&
        propertyTokens.at(-1) === 'control'
    ) {
        return 'control_code';
    }
    if (
        has(propertyWords, 'created', 'changed', 'modified', 'updated') &&
        has(propertyWords, 'by', 'user') &&
        !has(propertyWords, 'name', 'description', 'fullname')
    ) {
        return 'audit_user';
    }
    if (
        property.primitiveType === 'string' &&
        has(propertyWords, 'error') &&
        property.name.toLowerCase().includes('has')
    ) {
        return 'indicator';
    }
    const roles = new Set(
        [property.name, property.label, property.description]
            .filter((evidence): evidence is string => Boolean(evidence))
            .map((evidence) => lexicalRoleForText(evidence, property.primitiveType))
            .filter((role): role is string => role !== undefined)
    );
    return roles.size === 1 ? roles.values().next().value : undefined;
}

function dataEnrichmentRole(entity: SchemaGraph['entities'][number], property: SchemaProperty): string | undefined {
    const names = entity.properties.map(({ name }) => name.toLowerCase());
    const hasDataEnrichmentFields =
        names.includes('deconfidence') &&
        names.some((name) => name.startsWith('decertified') || name === 'decongressionaldistrict');
    if (!hasDataEnrichmentFields) {
        return undefined;
    }
    switch (property.name.toLowerCase()) {
        case 'debusinessstatus':
            return 'data_enrichment_business_status';
        case 'decertifiedethnicity':
        case 'dediversityethnicity':
            return 'data_enrichment_ethnicity';
        case 'decity':
            return 'data_enrichment_city';
        case 'decountry':
            return 'data_enrichment_country';
        case 'depostalcode':
            return 'data_enrichment_postal_code';
        case 'destate':
            return 'data_enrichment_region';
        case 'destreetaddress':
            return 'data_enrichment_street_address';
        default:
            return undefined;
    }
}

function preferredLexicalRole(property: SchemaProperty): string | undefined {
    for (const evidence of [property.label, property.description, property.name]) {
        if (evidence) {
            const role = lexicalRoleForText(evidence, property.primitiveType);
            if (role) {
                return role;
            }
        }
    }
    return undefined;
}

function specializedUnitRole(
    property: SchemaProperty
): 'duration_unit' | 'length_unit' | 'temperature_unit' | 'pressure_unit' | undefined {
    const roles = new Set(
        [property.name, property.label, property.description]
            .filter((evidence): evidence is string => Boolean(evidence))
            .map((evidence) => lexicalRoleForText(evidence, property.primitiveType))
            .map((role) => {
                if (role === 'duration_unit' || role === 'length_unit') {
                    return role;
                }
                if (role === 'temperature' || role === 'temperature_unit') {
                    return 'temperature_unit';
                }
                if (role === 'pressure' || role === 'pressure_unit') {
                    return 'pressure_unit';
                }
                return undefined;
            })
            .filter(
                (role): role is 'duration_unit' | 'length_unit' | 'temperature_unit' | 'pressure_unit' =>
                    role !== undefined
            )
    );
    return roles.size === 1 ? roles.values().next().value : undefined;
}

/**
 * Resolve only authoritative semantic markers whose meaning is unambiguous.
 *
 * @param property - Canonical schema property.
 * @param entity - Owning entity, when code-list metadata is available.
 * @returns The explicit metadata role, when one is present.
 */
function explicitMetadataRole(property: SchemaProperty, entity?: SchemaGraph['entities'][number]): string | undefined {
    const codeListField = entity ? capCodeListField(entity, property) : undefined;
    if (codeListField && 'role' in codeListField) {
        return codeListField.role;
    }
    const textOwner = entity?.properties.find((candidate) => candidate.links?.text === property.name);
    if (textOwner) {
        const ownerWords = new Set(tokens(textOwner.name));
        if (entity?.codeList === 'currency' || has(ownerWords, 'currency', 'waers')) {
            return 'currency_name';
        }
        if (has(ownerWords, 'country', 'nation')) {
            return 'country_name';
        }
    }
    const links = property.links;
    if (links?.currency && (property.primitiveType === 'decimal' || property.primitiveType === 'int')) {
        return 'monetary_amount';
    }
    if (entity?.codeList === 'currency' && (links?.scale || links?.standardCode)) {
        return 'currency';
    }
    for (const annotation of property.annotations) {
        if (annotation.value === false || annotation.value === 'false') {
            continue;
        }
        const term = annotation.term.toLowerCase();
        if (
            (term === 'sap:display-format' || term.endsWith('.displayformat')) &&
            typeof annotation.value === 'string' &&
            annotation.value.toLowerCase() === 'nonnegative'
        ) {
            return 'numeric_identifier';
        }
        const termRole = EXPLICIT_TERM_ROLES.find(([suffix]) => term.endsWith(suffix))?.[1];
        if (termRole) {
            return termRole;
        }
        if (term.endsWith('.unit') && term.includes('measures')) {
            return 'quantity';
        }
        if (term === 'sap:semantics' && typeof annotation.value === 'string') {
            const sapSemanticRole = SAP_SEMANTIC_ROLES.get(annotation.value.toLowerCase());
            if (sapSemanticRole) {
                return sapSemanticRole;
            }
        }
    }
    return semanticRoleForSapDataElement(property.dataElement);
}

function refinedMetadataRole(property: SchemaProperty, explicitRole: string): string {
    const lexicalRefinement = preferredLexicalRole(property);
    if (explicitRole === 'unit_of_measure') {
        return specializedUnitRole(property) ?? explicitRole;
    }
    if (explicitRole === 'monetary_amount' && lexicalRefinement === 'price') {
        return lexicalRefinement;
    }
    if (explicitRole === 'phone' && lexicalRefinement === 'mobile_phone') {
        return lexicalRefinement;
    }
    if (explicitRole === 'quantity' && lexicalRefinement === 'duration') {
        return lexicalRefinement;
    }
    return explicitRole;
}

function acceptedClassification(
    role: string,
    source: SemanticClassification['source'],
    candidate?: SemanticClassification
): SemanticClassification {
    return Object.freeze({
        ...(candidate ?? { confidence: source === 'metadata' ? 1 : 0.8 }),
        role,
        source,
        routeThreshold: source === 'classifier' ? (candidate?.routeThreshold ?? 0.9) : 0,
        abstentionReason: undefined
    });
}

function abstention(
    candidate: SemanticClassification | undefined,
    reason: NonNullable<SemanticClassification['abstentionReason']>
): SemanticClassification {
    return Object.freeze({
        role: 'unknown',
        confidence: candidate?.confidence ?? 0,
        source: 'unknown',
        ...(candidate?.routeThreshold === undefined ? {} : { routeThreshold: candidate.routeThreshold }),
        ...(candidate?.predictionSetSize === undefined ? {} : { predictionSetSize: candidate.predictionSetSize }),
        ...(candidate?.top === undefined ? {} : { top: candidate.top }),
        abstentionReason: reason
    });
}

function hasOrganizationDisplayEvidence(entity: SchemaGraph['entities'][number], property: SchemaProperty): boolean {
    const propertyWords = new Set(tokens(property.name));
    const entityWords = new Set(tokens(`${entity.name} ${entity.entitySetName}`));
    const organizationWords = ['agency', 'organization', 'organisation', 'company', 'supplier', 'vendor'];
    const owner = entity.properties.find((candidate) => candidate.links?.text === property.name);
    return (
        (property.primitiveType === 'string' &&
            has(propertyWords, ...organizationWords) &&
            has(propertyWords, 'name', 'text', 'display')) ||
        (property.primitiveType === 'string' &&
            has(entityWords, ...organizationWords) &&
            has(propertyWords, 'name', 'text', 'display')) ||
        Boolean(owner && has(new Set(tokens(owner.name)), ...organizationWords) && property.primitiveType === 'string')
    );
}

function lexicalFallbackIsSafe(
    entity: SchemaGraph['entities'][number],
    property: SchemaProperty,
    role: string
): boolean {
    if (LEXICAL_FALLBACK_BLOCKED_ROLES.has(role)) {
        return false;
    }
    if (semanticRoleDefinition(role)?.lexicalPrecisionGate === true) {
        return true;
    }
    // `time` is kept out of name-only routing, but a column the schema declares as a time of day
    // is not name-only evidence: the declared type and the name agree independently. Decided here
    // rather than in the registry, which would invalidate the packaged classifier head.
    if (role === 'time' && property.primitiveType === 'time') {
        return true;
    }
    // RAP generates `<field>_fc` field-control properties; the suffix is a framework convention, not a
    // naming guess, so an integer `_fc` column is the field-control state of its field.
    if (role === 'field_control' && property.primitiveType === 'int' && property.name.toLowerCase().endsWith('_fc')) {
        return true;
    }
    return role === 'org_name' && hasOrganizationDisplayEvidence(entity, property);
}

export function semanticRoleCandidate(
    entity: SchemaGraph['entities'][number],
    property: SchemaProperty
): string | undefined {
    const words = new Set(tokens(property.name));
    if (has(words, 'iban')) {
        return 'iban';
    }
    if (has(words, 'bic', 'swift')) {
        return 'bic';
    }
    if (has(words, 'bank') && has(words, 'internal') && has(words, 'id')) {
        return 'bank_account_internal_id';
    }
    if (has(words, 'country') && has(words, 'name', 'text', 'description')) {
        return 'country_name';
    }
    const textOwner = entity.properties.find((candidate) => candidate.links?.text === property.name);
    if (textOwner) {
        const ownerWords = new Set(tokens(textOwner.name));
        if (entity.codeList === 'currency' || has(ownerWords, 'currency', 'waers')) {
            return 'currency_name';
        }
        if (has(ownerWords, 'country', 'nation')) {
            return 'country_name';
        }
    }
    if (property.primitiveType === 'string' && lexicalRole(property) === 'numeric_identifier') {
        return 'numeric_identifier';
    }
    if (
        property.primitiveType === 'string' &&
        has(words, 'id', 'identifier', 'key', 'reference', 'ref') &&
        !has(words, 'name', 'text', 'description', 'status')
    ) {
        return 'business_identifier';
    }
    if (hasOrganizationDisplayEvidence(entity, property)) {
        return 'org_name';
    }
    // Generic display labels are weaker evidence than an explicit technical semantic name.
    if (/^(?:description|text|name)$/iu.test(property.label ?? '')) {
        const technical = lexicalRoleForText(property.name, property.primitiveType);
        if (
            technical &&
            ['person_full_name', 'person_first_name', 'person_last_name', 'region_name'].includes(technical)
        ) {
            return technical;
        }
    }
    return dataEnrichmentRole(entity, property) ?? lexicalRole(property) ?? preferredLexicalRole(property);
}

/**
 * Resolve semantic-v2 candidates conservatively without changing legacy precedence.
 *
 * @param graph
 * @param learned
 */
export function arbitrateSemanticClassifications(
    graph: SchemaGraph,
    learned: ReadonlyMap<string, SemanticClassification>
): ReadonlyMap<string, SemanticClassification> {
    const resolved = new Map<string, SemanticClassification>();
    for (const entity of graph.entities) {
        for (const property of entity.properties) {
            const key = semanticPropertyKey(entity.entitySetName, property.name);
            const metadataRole = explicitMetadataRole(property, entity);
            if (metadataRole) {
                const refinedRole = refinedMetadataRole(property, metadataRole);
                const compatibility = semanticRoleCompatibility(refinedRole, property);
                resolved.set(
                    key,
                    compatibility === 'compatible'
                        ? acceptedClassification(refinedRole, 'metadata')
                        : abstention(undefined, compatibility)
                );
                continue;
            }

            const classifier = learned.get(key);
            // CAP code-list companions (a currency symbol, an ISO numeric code, a language name) have a
            // fixed meaning but no semantic role; the code-list provider fills them from the row's code.
            if (isTechnicalField(property.name) || capCodeListField(entity, property) !== undefined) {
                resolved.set(key, abstention(classifier, 'technical-field'));
                continue;
            }
            const lexicalRole = semanticRoleCandidate(entity, property);
            const classifierCompatibility = classifier
                ? semanticRoleCompatibility(classifier.role, property)
                : undefined;
            const lexicalCompatibility = lexicalRole ? semanticRoleCompatibility(lexicalRole, property) : undefined;
            const classifierRole = classifierCompatibility === 'compatible' ? classifier?.role : undefined;
            const compatibleLexicalRole = lexicalCompatibility === 'compatible' ? lexicalRole : undefined;
            const lexicalFallbackAllowed =
                compatibleLexicalRole !== undefined && lexicalFallbackIsSafe(entity, property, compatibleLexicalRole);
            const classifierAbstained =
                classifier?.role === 'unknown' ||
                classifier?.role === 'REVIEW_ME' ||
                classifier?.top?.[0]?.role === 'unknown' ||
                classifier?.top?.[0]?.role === 'REVIEW_ME';
            if (classifierAbstained) {
                resolved.set(
                    key,
                    lexicalFallbackAllowed
                        ? acceptedClassification(compatibleLexicalRole as string, 'lexical-fallback')
                        : abstention(classifier, 'classifier-unknown')
                );
                continue;
            }

            if (classifierRole && classifier) {
                // A calibrated head carries its own per-role and per-family route threshold
                // (conformal calibration plus support floors); the registry default only
                // governs decisions that arrive without one.
                const threshold =
                    classifier.routeThreshold ?? semanticRoleDefinition(classifierRole)?.routeThreshold ?? 0.9;
                const outsideSet = classifier.predictionSetSize !== undefined && classifier.predictionSetSize !== 1;
                const contradictsSet =
                    classifier.predictionSet !== undefined &&
                    (classifier.predictionSet.length !== 1 || classifier.predictionSet[0] !== classifierRole);
                if (classifier.confidence < threshold || outsideSet || contradictsSet) {
                    const abstentionReason =
                        classifier.confidence < threshold ? 'below-threshold' : 'conflicting-candidates';
                    resolved.set(
                        key,
                        lexicalFallbackAllowed
                            ? acceptedClassification(compatibleLexicalRole as string, 'lexical-fallback')
                            : abstention(classifier, abstentionReason)
                    );
                    continue;
                }
            }

            if (classifierRole && compatibleLexicalRole && classifier) {
                if (classifierRole === compatibleLexicalRole) {
                    resolved.set(key, acceptedClassification(classifierRole, 'classifier', classifier));
                    continue;
                }
                const definition = semanticRoleDefinition(classifierRole);
                const conflictThreshold = Math.max(
                    classifier.routeThreshold ?? definition?.routeThreshold ?? 0.9,
                    definition?.conflictThreshold ?? 0.95
                );
                if (classifier.predictionSetSize === 1 && classifier.confidence >= conflictThreshold) {
                    resolved.set(key, acceptedClassification(classifierRole, 'classifier', classifier));
                } else {
                    resolved.set(
                        key,
                        lexicalFallbackAllowed
                            ? acceptedClassification(compatibleLexicalRole as string, 'lexical-fallback')
                            : abstention(classifier, 'conflicting-candidates')
                    );
                }
                continue;
            }

            if (classifierRole && classifier) {
                // The confidence and prediction-set gates above have already passed.
                resolved.set(key, acceptedClassification(classifierRole, 'classifier', classifier));
                continue;
            }

            if (compatibleLexicalRole) {
                resolved.set(
                    key,
                    lexicalFallbackAllowed
                        ? acceptedClassification(compatibleLexicalRole, 'lexical-fallback')
                        : abstention(classifier, 'lexical-gate')
                );
                continue;
            }

            if (classifier && classifierCompatibility && classifierCompatibility !== 'compatible') {
                resolved.set(key, abstention(classifier, classifierCompatibility));
            } else if (lexicalRole && lexicalCompatibility && lexicalCompatibility !== 'compatible') {
                resolved.set(key, abstention(classifier, lexicalCompatibility));
            } else {
                resolved.set(key, abstention(classifier, 'no-candidate'));
            }
        }
    }
    acceptConcepts(graph, learned, resolved);
    return resolved;
}

// Only these abstentions mean "no role fits"; metadata conflicts, key policy, framework fields and
// domain gates keep their decision.
const CONCEPT_ELIGIBLE_ABSTENTIONS = new Set<SemanticClassification['abstentionReason']>([
    'no-candidate',
    'classifier-unknown',
    'below-threshold',
    'conflicting-candidates',
    'incompatible-type',
    'lexical-gate'
]);

/**
 * Give a field that no role accepted the concept of the classifier's prototype head (head B), when
 * the field is an ordinary value column of an application entity set: never a key, a flag, a UUID, a
 * framework field or a column of a SAP Gateway protocol set.
 *
 * @param graph schema graph
 * @param learned classifier decisions, which carry the prototype-head match
 * @param resolved arbitrated decisions, updated in place
 */
function acceptConcepts(
    graph: SchemaGraph,
    learned: ReadonlyMap<string, SemanticClassification>,
    resolved: Map<string, SemanticClassification>
): void {
    for (const entity of graph.entities) {
        if (entity.entitySetName.startsWith('SAP__')) {
            continue;
        }
        for (const property of entity.properties) {
            const key = semanticPropertyKey(entity.entitySetName, property.name);
            const decision = resolved.get(key);
            const concept = learned.get(key)?.concept;
            // A recognized role keeps its decision but carries the concept as a fallback, used when the
            // semantic plan later finds that no provider can serve the role.
            if (concept !== undefined && decision !== undefined && decision.role !== 'unknown' && !decision.concept) {
                resolved.set(key, Object.freeze({ ...decision, concept }));
                continue;
            }
            if (
                concept === undefined ||
                decision?.role !== 'unknown' ||
                !CONCEPT_ELIGIBLE_ABSTENTIONS.has(decision.abstentionReason) ||
                property.isKey ||
                property.enumValues !== undefined ||
                (property.primitiveType !== 'string' &&
                    property.primitiveType !== 'int' &&
                    property.primitiveType !== 'decimal')
            ) {
                continue;
            }
            resolved.set(
                key,
                Object.freeze({ role: 'unknown', confidence: concept.similarity, source: 'concept', concept })
            );
        }
    }
}

/**
 * Resolve conservative metadata/name roles, using learned output only above its calibrated routing threshold.
 *
 * @param graph
 * @param learned
 */
export function resolveSemanticClassifications(
    graph: SchemaGraph,
    learned: ReadonlyMap<string, SemanticClassification>
): ReadonlyMap<string, SemanticClassification> {
    const resolved = new Map<string, SemanticClassification>();
    for (const entity of graph.entities) {
        for (const property of entity.properties) {
            const key = semanticPropertyKey(entity.entitySetName, property.name);
            const explicitRole = explicitMetadataRole(property, entity);
            const role = dataEnrichmentRole(entity, property) ?? lexicalRole(property);
            const classification = learned.get(key);
            if (explicitRole) {
                const refinedRole = refinedMetadataRole(property, explicitRole);
                resolved.set(key, Object.freeze({ role: refinedRole, confidence: 1, source: 'metadata' as const }));
                continue;
            }
            if (role) {
                resolved.set(key, Object.freeze({ role, confidence: 0.8, source: 'lexical-fallback' as const }));
                continue;
            }
            if (
                classification &&
                classification.role !== 'unknown' &&
                classification.confidence >= (classification.routeThreshold ?? 0.5)
            ) {
                resolved.set(key, classification);
                continue;
            }
            const fallbackRole = preferredLexicalRole(property);
            if (fallbackRole) {
                resolved.set(
                    key,
                    Object.freeze({ role: fallbackRole, confidence: 0.7, source: 'lexical-fallback' as const })
                );
                continue;
            }
            if (classification) {
                resolved.set(key, classification);
            }
        }
    }
    return resolved;
}
