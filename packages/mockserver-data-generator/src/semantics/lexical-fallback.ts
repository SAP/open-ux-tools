import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { SemanticClassification } from '../types.js';
import { semanticPropertyKey } from './classifier.js';
import { semanticRoleForSapDataElement } from './sap-data-elements.js';

function tokens(name: string): ReadonlyArray<string> {
    return name
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
    if (has(words, 'currency', 'waers')) {
        return 'currency';
    }
    if (has(words, 'chart') && has(words, 'account', 'accounts')) {
        return 'chart_of_accounts';
    }
    if (last === 'equipment' || (has(words, 'technical') && has(words, 'object'))) {
        return 'equipment_id';
    }
    if (has(words, 'amount', 'price', 'total', 'net', 'gross')) {
        return 'monetary_amount';
    }
    if (has(words, 'quantity', 'qty')) {
        return 'quantity';
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
        return last === 'name' ? 'country_name' : 'country';
    }
    if (has(words, 'city', 'town')) {
        return 'city';
    }
    if (has(words, 'region', 'state', 'province')) {
        return 'region';
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
    if (has(words, 'description')) {
        return 'description';
    }
    if (has(words, 'comment', 'remark', 'notes')) {
        return last ?? 'notes';
    }
    if (has(words, 'status')) {
        return 'order_status';
    }
    if (has(words, 'language', 'locale')) {
        return 'language';
    }
    if (has(words, 'timezone')) {
        return 'timezone';
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
            if (explicitRole) {
                resolved.set(key, Object.freeze({ role: explicitRole, confidence: 1, source: 'metadata' as const }));
                continue;
            }
            const classification = learned.get(key);
            if (
                classification &&
                classification.role !== 'unknown' &&
                classification.confidence >= (classification.routeThreshold ?? 0.5)
            ) {
                resolved.set(key, classification);
                continue;
            }
            const role = lexicalRole(property);
            if (role) {
                resolved.set(key, Object.freeze({ role, confidence: 0.8, source: 'lexical-fallback' as const }));
            } else if (classification) {
                resolved.set(key, classification);
            }
        }
    }
    return resolved;
}
