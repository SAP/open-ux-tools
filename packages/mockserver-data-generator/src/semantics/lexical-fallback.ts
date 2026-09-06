import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { SemanticClassification } from '../types.js';
import { semanticPropertyKey } from './classifier.js';
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
    'congressional_district',
    'count',
    'credit_rating',
    'distribution_channel',
    'document_id',
    'document_item',
    'duration_unit',
    'employee_id',
    'genre',
    'gl_account',
    'house_bank',
    'indicator',
    'length_unit',
    'object_type',
    'org_name',
    'payment_file_id',
    'payment_terms',
    'payment_transaction_group',
    'publication_type',
    'risk_class',
    'sales_document_type',
    'sales_organization',
    'service_document_type',
    'service_organization',
    'service_team',
    'source_name',
    'storage_location',
    'technical_object_type',
    'unique_item_identifier'
]);

function lexicalRoleForText(text: string, primitiveType: SchemaProperty['primitiveType']): string | undefined {
    const fieldTokens = tokens(text);
    const words = new Set(fieldTokens);
    const last = fieldTokens.at(-1);

    if (has(words, 'email', 'mail')) {
        return 'email';
    }
    if (has(words, 'phone', 'telephone', 'mobile')) {
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
    if (has(words, 'unique') && has(words, 'item') && has(words, 'id', 'identifier')) {
        return 'unique_item_identifier';
    }
    if (has(words, 'distribution') && has(words, 'channel')) {
        return 'distribution_channel';
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
    if (has(words, 'service') && has(words, 'document') && has(words, 'item') && has(words, 'object', 'type')) {
        return 'object_type';
    }
    if (
        has(words, 'service') &&
        has(words, 'document') &&
        has(words, 'item') &&
        !has(words, 'name', 'text', 'description', 'status', 'uuid', 'guid', 'char', 'open', 'error')
    ) {
        return 'document_item';
    }
    if (has(words, 'service') && has(words, 'document') && has(words, 'type')) {
        return 'service_document_type';
    }
    if (
        has(words, 'service') &&
        has(words, 'document') &&
        !has(words, 'name', 'text', 'description', 'status', 'uuid', 'guid', 'char')
    ) {
        return 'document_id';
    }
    if (has(words, 'proposal') && !has(words, 'name', 'text', 'description', 'type', 'status')) {
        return 'document_id';
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
    if (has(words, 'alias')) {
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
    if (has(words, 'amount', 'total', 'net', 'gross')) {
        return 'monetary_amount';
    }
    if (has(words, 'quantity', 'qty')) {
        return 'quantity';
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
    if (has(words, 'company', 'organization', 'organisation', 'supplier', 'vendor', 'customer') && has(words, 'name')) {
        return 'org_name';
    }
    if (has(words, 'product', 'material') && has(words, 'name')) {
        return 'product_name';
    }
    if (has(words, 'description')) {
        return 'description';
    }
    if (has(words, 'comment', 'remark', 'notes')) {
        return last ?? 'notes';
    }
    if (has(words, 'status')) {
        if (primitiveType === 'string' && has(words, 'error') && text.toLowerCase().includes('has')) {
            return 'indicator';
        }
        return 'order_status';
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
 * @returns The explicit metadata role, when one is present.
 */
function explicitMetadataRole(property: SchemaProperty): string | undefined {
    for (const annotation of property.annotations) {
        if (annotation.value === false || annotation.value === 'false') {
            continue;
        }
        const term = annotation.term.toLowerCase();
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
    if (explicitRole === 'quantity' && lexicalRefinement === 'duration') {
        return lexicalRefinement;
    }
    return explicitRole;
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
            const explicitRole = explicitMetadataRole(property);
            const role = lexicalRole(property);
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
