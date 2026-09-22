import type { SchemaEntity, SchemaGraph, SchemaProperty, SchemaValueListParameter } from '../schema/graph.js';
import type {
    ExistingMockData,
    MockDataGeneratorDiagnostic,
    MockDataRow,
    SemanticClassification,
    SyntheticScenario
} from '../types.js';
import { propertyValueIsValid } from './constraints.js';
import { authoredDomainValues, valueListDisplayLinks } from './value-list-context.js';
import { generationRelationships } from './deterministic.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { semanticRoleDefinition } from '../semantics/role-registry.js';
import { PROVIDER_CAPABLE_ROLES } from '../semantics/value-banks.js';

const APPLICATION_DOMAIN_ROLES = new Set([
    'company_code',
    'cost_center',
    'house_bank',
    'gl_account',
    'chart_of_accounts',
    'plant',
    'storage_location',
    'sales_organization',
    'sales_division',
    'distribution_channel',
    'payment_terms',
    'control_code',
    'approval_status',
    'status',
    'fiscal_period',
    'tax_code',
    'bank_account_type',
    'bank_statement_type',
    'bank_statement_format',
    'payment_transaction_group',
    'service_document_type',
    'sales_document_type',
    'service_document_item_category',
    'object_type',
    'technical_object_type',
    'product_category',
    'publication_type',
    'genre',
    'credit_rating',
    'risk_class',
    'confidence_level',
    'data_enrichment_business_status'
]);

/**
 * Validate provider output independently of its catalog entries.
 *
 * @param role
 * @param property
 * @param value
 */
export function semanticValueIsValid(role: string, property: SchemaProperty, value: unknown): boolean {
    if (!propertyValueIsValid(property, value)) {
        return false;
    }
    if (value === null) {
        return property.nullable;
    }
    const validator = semanticRoleDefinition(role)?.validator;
    if (validator === 'structural') {
        return true;
    }
    if (typeof value !== 'string') {
        return false;
    }
    switch (validator) {
        case 'email':
            return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(value);
        case 'phone':
            return /^\+?[\d ()-]{7,25}$/u.test(value);
        case 'url': {
            try {
                const url = new URL(value);
                return ['http:', 'https:'].includes(url.protocol) && !!url.hostname;
            } catch {
                return false;
            }
        }
        case 'country':
            return /^[A-Z]{2,3}$/u.test(value);
        case 'currency':
            return /^[A-Z]{3}$/u.test(value);
        case 'bic':
            return /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/u.test(value);
        case 'iban': {
            if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/u.test(value)) {
                return false;
            }
            const lengths: Readonly<Record<string, number>> = { DE: 22, IE: 22, IT: 27, CZ: 24 };
            if (lengths[value.slice(0, 2)] !== undefined && value.length !== lengths[value.slice(0, 2)]) {
                return false;
            }
            const digits = (value.slice(4) + value.slice(0, 4)).replace(/[A-Z]/gu, (letter) =>
                String(letter.charCodeAt(0) - 55)
            );
            return BigInt(digits) % 97n === 1n;
        }
        default:
            return false;
    }
}

/**
 * The decision for a field whose recognized role cannot be served. When the classifier's prototype
 * head accepted a concept for the field, the field is filled from that concept's bank instead of the
 * typed floor; otherwise it abstains with the given reason.
 *
 * @param candidate the recognized decision being demoted
 * @param property the field
 * @param reason abstention reason when no concept applies
 * @returns the replacement decision
 */
function demotedDecision(
    candidate: SemanticClassification,
    property: SchemaProperty,
    reason: NonNullable<SemanticClassification['abstentionReason']>
): SemanticClassification {
    if (candidate.concept && !property.isKey && property.enumValues === undefined) {
        return Object.freeze({
            role: 'unknown',
            confidence: candidate.concept.similarity,
            source: 'concept',
            concept: candidate.concept
        });
    }
    return { role: 'unknown', source: 'unknown', confidence: 0, abstentionReason: reason };
}

/**
 * Compile routing into fields with feasible providers and validators.
 *
 * @param graph
 * @param classifications
 * @param diagnostics
 * @param scenario
 * @param existingData
 */
export function compileSemanticPlan(
    graph: SchemaGraph,
    classifications: ReadonlyMap<string, SemanticClassification>,
    diagnostics: MockDataGeneratorDiagnostic[],
    scenario?: SyntheticScenario,
    existingData: Readonly<Record<string, ExistingMockData>> = {}
): ReadonlyMap<string, SemanticClassification> {
    const plan = new Map(classifications);
    const minimumLengths: Readonly<Record<string, number>> = {
        email: 8,
        iban: ({ DE: 22, IE: 22, IT: 27, CZ: 24 } as const)[scenario?.ibanCountry ?? 'DE'],
        bic: 8,
        country: 2,
        currency: 3,
        url: 14,
        phone: 16
    };
    for (const entity of graph.entities) {
        const unevidencedLinkedFields = new Set<string>();
        if (entity.codeList === undefined) {
            for (const code of entity.properties) {
                if (!code.links?.text) {
                    continue;
                }
                const codeDecision = classifications.get(semanticPropertyKey(entity.entitySetName, code.name));
                const codeDefinition = codeDecision && semanticRoleDefinition(codeDecision.role);
                const textDecision = classifications.get(semanticPropertyKey(entity.entitySetName, code.links.text));
                const textDefinition = textDecision && semanticRoleDefinition(textDecision.role);
                const isValueHelpDomain =
                    code.links.valueListCollection !== undefined ||
                    graph.entities.some((owner) =>
                        owner.properties.some(
                            (field) =>
                                field.links?.valueListCollection === entity.entitySetName &&
                                field.links.valueListMappings?.some(
                                    ({ valueListProperty }) => valueListProperty === code.name
                                )
                        )
                    );
                if (!isValueHelpDomain && codeDefinition?.family !== 'status') {
                    continue;
                }
                if (codeDefinition?.family !== 'status' && textDefinition?.family !== 'narrative') {
                    continue;
                }
                const validator = codeDefinition?.validator;
                if (validator !== undefined && validator !== 'structural') {
                    continue;
                }
                if (authoredDomainValues(graph, entity, code, existingData).length === 0) {
                    unevidencedLinkedFields.add(code.name);
                }
                const text = entity.properties.find(({ name }) => name === code.links?.text);
                if (text && authoredDomainValues(graph, entity, text, existingData).length === 0) {
                    unevidencedLinkedFields.add(text.name);
                }
            }
        }
        for (const property of entity.properties) {
            const key = semanticPropertyKey(entity.entitySetName, property.name);
            const candidate = plan.get(key);
            if (!candidate || candidate.role === 'unknown') {
                continue;
            }
            const definition = semanticRoleDefinition(candidate.role);
            if (definition && property.enumValues?.length) {
                if (!property.enumValues.every((value) => semanticValueIsValid(candidate.role, property, value))) {
                    plan.set(key, {
                        role: 'unknown',
                        source: 'unknown',
                        confidence: 0,
                        abstentionReason: 'unsupported-domain'
                    });
                    diagnostics.push({
                        code: 'SEMANTIC_ROLE_DOMAIN_CONFLICT',
                        severity: 'warning',
                        target: key,
                        message:
                            'The declared domain conflicts with the inferred format. Preserve its values without claiming semantic coverage.'
                    });
                }
                continue;
            }
            if (unevidencedLinkedFields.has(property.name)) {
                plan.set(key, demotedDecision(candidate, property, 'unsupported-domain'));
                diagnostics.push({
                    code: 'SEMANTIC_DOMAIN_UNAVAILABLE',
                    severity: 'warning',
                    target: key,
                    message:
                        'A linked code/text meaning has no application domain or independent format provider; a generic role cannot validate it.'
                });
                continue;
            }
            if (
                (APPLICATION_DOMAIN_ROLES.has(candidate.role) ||
                    (candidate.role === 'iban' && !scenario?.ibanCountry)) &&
                !property.enumValues?.length &&
                authoredDomainValues(graph, entity, property, existingData).length === 0
            ) {
                plan.set(key, demotedDecision(candidate, property, 'unsupported-domain'));
                diagnostics.push({
                    code: 'SEMANTIC_DOMAIN_UNAVAILABLE',
                    severity: 'warning',
                    target: key,
                    message:
                        'Application-specific semantics require a declared domain; generated placeholders are not semantic coverage.'
                });
                continue;
            }
            const minimum = definition ? minimumLengths[definition.validator] : undefined;
            // A role with no value bank produces nothing of its own, so accepting it would report
            // semantic coverage for a cell that silently falls through to the typed floor. A
            // declared or authored domain supplies the values instead, and keeps the role honest.
            const producesNothing =
                !PROVIDER_CAPABLE_ROLES.has(candidate.role) &&
                !property.enumValues?.length &&
                authoredDomainValues(graph, entity, property, existingData).length === 0;
            if (
                !definition ||
                producesNothing ||
                (minimum !== undefined && property.maxLength !== undefined && property.maxLength < minimum)
            ) {
                plan.set(key, demotedDecision(candidate, property, 'incompatible-facets'));
                diagnostics.push({
                    code: 'SEMANTIC_PROVIDER_UNAVAILABLE',
                    severity: 'warning',
                    target: key,
                    message:
                        'No semantic provider can satisfy the field constraints; structural fallback is not semantic coverage.'
                });
            }
        }
    }
    return plan;
}

/** The fields whose values supply a bound field, keyed by the bound field's semantic key. */
type SupplierBindings = Map<string, Readonly<{ property: SchemaProperty; sources: string[] }>>;

/**
 * Record that another field supplies the value of a bound field.
 *
 * @param bindings - Receives the binding.
 * @param entitySetName - Entity set of the bound field.
 * @param property - Bound field, when declared.
 * @param source - Semantic key of the supplying field.
 */
function bindSupplier(
    bindings: SupplierBindings,
    entitySetName: string,
    property: SchemaProperty | undefined,
    source: string
): void {
    if (!property) {
        return;
    }
    const key = semanticPropertyKey(entitySetName, property.name);
    const binding = bindings.get(key) ?? { property, sources: [] };
    binding.sources.push(source);
    bindings.set(key, binding);
}

/**
 * Value-list parameters as declared, or the plain mappings read as InOut parameters.
 *
 * @param property - Field that carries the value list.
 * @returns The effective parameters.
 */
function effectiveValueListParameters(property: SchemaProperty): ReadonlyArray<SchemaValueListParameter> {
    const declared = property.links?.valueListParameters ?? [];
    return declared.length > 0
        ? declared
        : (property.links?.valueListMappings ?? []).map(({ localProperty, valueListProperty }) => ({
              direction: 'InOut' as const,
              localProperty,
              valueListProperty
          }));
}

/**
 * Bind the local fields a value list writes, and their display texts, to the value-help fields.
 *
 * @param bindings - Receives the bindings.
 * @param entity - Entity that owns the value-list field.
 * @param owner - Field that carries the value list.
 * @param valueList - Value-help entity.
 */
function bindValueList(
    bindings: SupplierBindings,
    entity: SchemaEntity,
    owner: SchemaProperty,
    valueList: SchemaEntity
): void {
    const properties = new Map(entity.properties.map((property) => [property.name, property]));
    const parameters = effectiveValueListParameters(owner);
    for (const { direction, localProperty, valueListProperty } of parameters) {
        const written = direction === 'InOut' || direction === 'Out';
        if (written && localProperty && valueList.properties.some(({ name }) => name === valueListProperty)) {
            bindSupplier(
                bindings,
                entity.entitySetName,
                properties.get(localProperty),
                `${valueList.entitySetName}.${valueListProperty}`
            );
        }
    }
    for (const link of valueListDisplayLinks(owner, parameters, properties, valueList)) {
        bindSupplier(
            bindings,
            entity.entitySetName,
            link.localProperty,
            `${valueList.entitySetName}.${link.targetTextProperty.name}`
        );
    }
}

/**
 * Collect every field whose value another field supplies: foreign keys, value-list parameters and
 * their display texts, and declared text companions, which no field supplies with a format.
 *
 * @param graph - Service schema.
 * @returns The bound fields with the semantic keys of their suppliers.
 */
function supplierBindings(graph: SchemaGraph): SupplierBindings {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const bindings: SupplierBindings = new Map();
    for (const relationship of generationRelationships(graph)) {
        const source = entities.get(relationship.fromEntitySet);
        for (const { sourceProperty, targetProperty } of relationship.mappings) {
            bindSupplier(
                bindings,
                relationship.fromEntitySet,
                source?.properties.find(({ name }) => name === sourceProperty),
                semanticPropertyKey(relationship.toEntitySet, targetProperty)
            );
        }
    }
    for (const entity of graph.entities) {
        for (const property of entity.properties) {
            const valueList = entities.get(property.links?.valueListCollection ?? '');
            if (valueList) {
                bindValueList(bindings, entity, property, valueList);
            }
        }
    }
    bindTextCompanions(bindings, graph);
    return bindings;
}

/**
 * Bind every declared text companion that no value list supplies. It holds a description written
 * from its code, so no field supplies it with a format.
 *
 * @param bindings - Receives the bindings; existing value-list bindings are kept.
 * @param graph - Service schema.
 */
function bindTextCompanions(bindings: SupplierBindings, graph: SchemaGraph): void {
    for (const entity of graph.entities) {
        for (const code of entity.properties) {
            const text = entity.properties.find(({ name }) => name === code.links?.text);
            const key = text ? semanticPropertyKey(entity.entitySetName, text.name) : undefined;
            if (text && key && !bindings.has(key)) {
                bindings.set(key, { property: text, sources: [] });
            }
        }
    }
}

/**
 * Withdraw every role that rows the caller supplied contradict. Supplied rows are published as they
 * are, so a role claims their values too: a field whose supplied values fail the role's check — a
 * placeholder such as `Co1` in a country column, or a value outside the declared facets — cannot
 * claim the role for the column.
 *
 * @param graph - Service schema.
 * @param result - Semantic plan, updated in place.
 * @param existingData - Rows the caller supplied, by entity set.
 * @param diagnostics - Receives one warning per withdrawn role.
 */
function demoteContradictedSemanticRoles(
    graph: SchemaGraph,
    result: Map<string, SemanticClassification>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    diagnostics: MockDataGeneratorDiagnostic[]
): void {
    for (const entity of graph.entities) {
        const initialRows = existingData[entity.entitySetName]?.initialRows;
        const rows = initialRows && 'rows' in initialRows ? initialRows.rows : [];
        if (rows.length === 0) {
            continue;
        }
        for (const property of entity.properties) {
            const key = semanticPropertyKey(entity.entitySetName, property.name);
            const candidate = result.get(key);
            if (
                !candidate ||
                candidate.role === 'unknown' ||
                rows.every(
                    (row) =>
                        !(property.name in row) || semanticValueIsValid(candidate.role, property, row[property.name])
                )
            ) {
                continue;
            }
            result.set(key, demotedDecision(candidate, property, 'unsupported-domain'));
            diagnostics.push({
                code: 'SEMANTIC_DOMAIN_UNAVAILABLE',
                severity: 'warning',
                target: key,
                message: 'Supplied rows hold values outside the inferred format; the inferred format is not claimed.'
            });
        }
    }
}

/**
 * Withdraw a format-validated role from a field whose values another field supplies. A foreign key
 * copies the referenced key, and a value-help parameter or its text companion takes the value-help
 * row, so the field can only keep a role such as email or country when the supplying field is
 * planned with the same role. Otherwise the supplied values would fail the role's format check.
 * Any other declared text companion holds a description of its code, which no format accepts.
 * Roles that rows the caller supplied contradict are withdrawn first, so a field bound to them
 * follows.
 *
 * @param graph - Service schema.
 * @param plan - Compiled semantic plan.
 * @param diagnostics - Receives one warning per withdrawn role.
 * @param existingData - Rows the caller supplied, by entity set.
 * @returns The plan with contradicted roles and bound roles withdrawn where the supplying field disagrees.
 */
export function demoteBoundSemanticRoles(
    graph: SchemaGraph,
    plan: ReadonlyMap<string, SemanticClassification>,
    diagnostics: MockDataGeneratorDiagnostic[],
    existingData: Readonly<Record<string, ExistingMockData>> = {}
): ReadonlyMap<string, SemanticClassification> {
    const bindings = supplierBindings(graph);
    const result = new Map(plan);
    demoteContradictedSemanticRoles(graph, result, existingData, diagnostics);
    const holds = (role: string, sources: ReadonlyArray<string>): boolean => {
        const validator = semanticRoleDefinition(role)?.validator;
        return (
            validator === undefined ||
            validator === 'structural' ||
            (sources.length > 0 && sources.every((source) => result.get(source)?.role === role))
        );
    };
    // A withdrawn role can invalidate a field it supplies, so repeat until no role changes.
    let changed = true;
    while (changed) {
        changed = false;
        for (const [key, { property, sources }] of bindings) {
            const candidate = result.get(key);
            if (!candidate || holds(candidate.role, sources)) {
                continue;
            }
            result.set(key, demotedDecision(candidate, property, 'unsupported-domain'));
            diagnostics.push({
                code: 'SEMANTIC_DOMAIN_UNAVAILABLE',
                severity: 'warning',
                target: key,
                message:
                    'A related field supplies this value without the same format; the inferred format is not claimed.'
            });
            changed = true;
        }
    }
    return result;
}

/**
 * Check selected provider values after generation, repair or cache loading.
 *
 * @param graph
 * @param resources
 * @param roles
 */
export function assertSemanticValues(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    roles: Readonly<Record<string, string>>
): void {
    for (const entity of graph.entities) {
        for (const property of entity.properties) {
            const role = roles[semanticPropertyKey(entity.entitySetName, property.name)];
            if (
                role &&
                (resources[entity.entitySetName] ?? []).some(
                    (row) => !semanticValueIsValid(role, property, row[property.name])
                )
            ) {
                throw new TypeError(`Semantic validation failed for ${entity.entitySetName}.${property.name}`);
            }
        }
    }
}
