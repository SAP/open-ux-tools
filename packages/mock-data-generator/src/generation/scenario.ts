import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { ExistingMockData, JsonValue, MockDataGeneratorDiagnostic, SyntheticScenario } from '../types.js';
import { propertyValueIsValid } from './constraints.js';
import { isIbanCountry } from '../semantics/bank-store.js';
import { hasAuthoritativeRows } from './rows.js';
import type { AuthoritativeInitialRows } from './rows.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../errors.js';

/**
 * Bind finite domains from enumerable authored value helps before selecting providers.
 *
 * @param graph
 * @param existingData
 * @param diagnostics
 */
export function applyApplicationDomains(
    graph: SchemaGraph,
    existingData: Readonly<Record<string, ExistingMockData>>,
    diagnostics: MockDataGeneratorDiagnostic[]
): SchemaGraph {
    return {
        ...graph,
        entities: graph.entities.map((entity) => {
            const context: DomainBindingContext = {
                graph,
                entity,
                existingData,
                diagnostics,
                domains: new Map<string, ReadonlyArray<ScalarValue>>()
            };
            for (const owner of entity.properties) {
                bindOwnerDomains(context, owner);
            }
            const { domains } = context;
            return {
                ...entity,
                properties: entity.properties.map((property) =>
                    domains.has(property.name) ? { ...property, enumValues: domains.get(property.name) } : property
                )
            };
        })
    };
}

/** A scalar domain value. */
type ScalarValue = string | number | boolean;

/** What binding the authored value-help domains of one entity reads, reports to and fills. */
interface DomainBindingContext {
    graph: SchemaGraph;
    entity: SchemaEntity;
    existingData: Readonly<Record<string, ExistingMockData>>;
    diagnostics: MockDataGeneratorDiagnostic[];
    /** The bound domains of the entity, by property name. */
    domains: Map<string, ReadonlyArray<ScalarValue>>;
}

/** A value-list mapping of a value-help field. */
type ValueListMapping = Readonly<{ localProperty: string; valueListProperty: string }>;

/**
 * Bind the domains a field's authored, enumerable value-list collection supplies to the fields it maps.
 *
 * @param context the entity being bound
 * @param owner the field that declares the value list
 */
function bindOwnerDomains(context: DomainBindingContext, owner: SchemaProperty): void {
    const { entity, existingData, diagnostics } = context;
    const collection = owner.links?.valueListCollection;
    const initial = collection ? existingData[collection]?.initialRows : undefined;
    if (!hasAuthoritativeRows(initial)) {
        return;
    }
    if (initial.rows?.length === 0) {
        diagnostics.push({
            code: 'SEMANTIC_DOMAIN_CONFLICT',
            severity: 'warning',
            target: `${entity.entitySetName}.${owner.name}`,
            message: `Authored value-list collection ${collection} is present but empty; no scalar domain was bound.`
        });
        return;
    }
    for (const mapping of owner.links?.valueListMappings ?? []) {
        bindMappingDomain(context, owner, initial, mapping);
    }
}

/**
 * Bind the domain one value-list mapping supplies to its local field, unless the mapping only reads the field,
 * the field is unknown, or the field takes part in a relationship (whose tuples are resolved later).
 *
 * @param context the entity being bound
 * @param owner the field that declares the value list
 * @param initial the authored rows of the value-list collection
 * @param mapping the mapping
 */
function bindMappingDomain(
    context: DomainBindingContext,
    owner: SchemaProperty,
    initial: AuthoritativeInitialRows,
    mapping: ValueListMapping
): void {
    const { graph, entity, diagnostics, domains } = context;
    const parameter = owner.links?.valueListParameters?.find(
        ({ localProperty, valueListProperty }) =>
            localProperty === mapping.localProperty && valueListProperty === mapping.valueListProperty
    );
    if (parameter && parameter.direction !== 'In' && parameter.direction !== 'InOut') {
        return;
    }
    const property = entity.properties.find(({ name }) => name === mapping.localProperty);
    if (!property) {
        return;
    }
    // Relationship assignment is resolved as a tuple later. Do not turn a
    // potentially conflicting value help into an unconditional scalar facet.
    if (isRelationshipField(graph, entity, property)) {
        if (relationshipConflictsWithValueList(context, property, initial, mapping)) {
            diagnostics.push({
                code: 'SEMANTIC_DOMAIN_CONFLICT',
                severity: 'warning',
                target: `${entity.entitySetName}.${property.name}`,
                message: 'Authored value-list tuples cannot satisfy protected relationship assignments.'
            });
        }
        return;
    }
    const previous = domains.get(property.name) ?? property.enumValues;
    const candidates = initial.rows
        .map((row) => row[mapping.valueListProperty])
        .filter(
            (value): value is ScalarValue =>
                (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
                propertyValueIsValid(property, value) &&
                (!previous || previous.includes(value))
        );
    const values = [...new Set(candidates)];
    if (!values.length) {
        diagnostics.push({
            code: 'SEMANTIC_DOMAIN_CONFLICT',
            severity: 'warning',
            target: `${entity.entitySetName}.${property.name}`,
            message: 'Authored value-help rows provide no values compatible with the field constraints.'
        });
    } else {
        domains.set(property.name, values);
    }
}

/**
 * Whether a field is a source or target field of a relationship of its entity.
 *
 * @param graph schema graph
 * @param entity the entity
 * @param property the field
 * @returns true for a relationship field
 */
function isRelationshipField(graph: SchemaGraph, entity: SchemaEntity, property: SchemaProperty): boolean {
    return graph.relationships.some(
        (relationship) =>
            (relationship.fromEntitySet === entity.entitySetName &&
                relationship.mappings.some(({ sourceProperty }) => sourceProperty === property.name)) ||
            (relationship.toEntitySet === entity.entitySetName &&
                relationship.mappings.some(({ targetProperty }) => targetProperty === property.name))
    );
}

/**
 * Whether an authored target row of a relationship from the field holds a value the value list cannot supply.
 *
 * @param context the entity being bound
 * @param property the relationship source field
 * @param initial the authored rows of the value-list collection
 * @param mapping the value-list mapping of the field
 * @returns true when the value list conflicts with the relationship
 */
function relationshipConflictsWithValueList(
    context: DomainBindingContext,
    property: SchemaProperty,
    initial: AuthoritativeInitialRows,
    mapping: ValueListMapping
): boolean {
    const { graph, entity, existingData } = context;
    const listed = (value: JsonValue | undefined): boolean =>
        initial.rows.some((candidate) => candidate[mapping.valueListProperty] === value);
    const related = graph.relationships.filter(
        (relationship) =>
            relationship.fromEntitySet === entity.entitySetName &&
            relationship.mappings.some(({ sourceProperty }) => sourceProperty === property.name)
    );
    return related.some((relationship) => {
        const targetRows = existingData[relationship.toEntitySet]?.initialRows;
        return (
            hasAuthoritativeRows(targetRows) &&
            targetRows.rows.some((targetRow) =>
                relationship.mappings.some(
                    ({ sourceProperty, targetProperty }) =>
                        sourceProperty === property.name && !listed(targetRow[targetProperty])
                )
            )
        );
    });
}

/**
 * Apply explicit fictional domains only where application metadata supplies no domain.
 *
 * @param graph
 * @param scenario
 * @param diagnostics
 */
export function applySyntheticScenario(
    graph: SchemaGraph,
    scenario: SyntheticScenario | undefined,
    diagnostics: MockDataGeneratorDiagnostic[]
): SchemaGraph {
    if (!scenario) {
        return graph;
    }
    if (
        typeof scenario.id !== 'string' ||
        !scenario.id ||
        typeof scenario.version !== 'string' ||
        !scenario.version ||
        !scenario.domains ||
        typeof scenario.domains !== 'object' ||
        Array.isArray(scenario.domains)
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            'A synthetic scenario requires an identity, version and field domains.'
        );
    }
    const remaining = new Set(Object.keys(scenario.domains));
    if (scenario.ibanCountry !== undefined && !isIbanCountry(scenario.ibanCountry)) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, 'Unsupported synthetic IBAN jurisdiction.');
    }
    if (scenario.ibanCountry) {
        diagnostics.push({
            code: 'SYNTHETIC_IBAN_JURISDICTION',
            severity: 'info',
            message: `Synthetic IBAN provider jurisdiction: ${scenario.ibanCountry}. No bank identity or address relationship is implied.`
        });
    }
    for (const [resource, rules] of Object.entries(scenario.coherence ?? {})) {
        if (
            !graph.entities.some(({ entitySetName }) => entitySetName === resource) ||
            !Array.isArray(rules) ||
            !rules.every((rule) =>
                [
                    'temporal',
                    'status',
                    'units',
                    'monetary',
                    'balance',
                    'conversion',
                    'lifecycle',
                    'processing-status',
                    'country-phone'
                ].includes(rule)
            )
        ) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.REQUEST_INVALID,
                'Synthetic coherence rules must reference a known resource and supported rules.'
            );
        }
        for (const rule of rules) {
            diagnostics.push({
                code: 'SYNTHETIC_COHERENCE_RULE_CONFIGURED',
                severity: 'info',
                target: resource,
                message: `Explicit synthetic scenario rule configured: ${rule}. This is a simulation assumption, not application evidence.`
            });
        }
    }
    const entities = graph.entities.map((entity) => ({
        ...entity,
        properties: entity.properties.map((property) => {
            const target = `${entity.entitySetName}.${property.name}`;
            const values = scenario.domains[target];
            if (values === undefined) {
                return property;
            }
            remaining.delete(target);
            if (
                !Array.isArray(values) ||
                values.length === 0 ||
                !values.every((value) => ['string', 'number', 'boolean'].includes(typeof value))
            ) {
                throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, `Invalid synthetic domain for ${target}`);
            }
            const linked = entity.properties.some((candidate) =>
                candidate.links?.valueListMappings?.some(({ localProperty }) => localProperty === property.name)
            );
            const relationship = graph.relationships.some(
                (candidate) =>
                    (candidate.fromEntitySet === entity.entitySetName &&
                        candidate.mappings.some(({ sourceProperty }) => sourceProperty === property.name)) ||
                    (candidate.toEntitySet === entity.entitySetName &&
                        candidate.mappings.some(({ targetProperty }) => targetProperty === property.name))
            );
            if (property.enumValues || linked || relationship) {
                diagnostics.push({
                    code: 'SYNTHETIC_SCENARIO_SHADOWED',
                    severity: 'info',
                    target,
                    message: 'Application constraints take precedence over the configured synthetic domain.'
                });
                return property;
            }
            if (!values.every((value) => propertyValueIsValid(property, value))) {
                throw new MockGenError(
                    MOCKGEN_ERROR_CODE.REQUEST_INVALID,
                    `Synthetic domain violates field constraints for ${target}`
                );
            }
            diagnostics.push({
                code: 'SYNTHETIC_SCENARIO_APPLIED',
                severity: 'info',
                target,
                message: 'The field uses an explicitly configured synthetic domain, not an application-derived domain.'
            });
            const domain = values.filter(
                (value): value is ScalarValue =>
                    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            );
            return { ...property, enumValues: [...new Set(domain)] };
        })
    }));
    if (remaining.size > 0) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, 'Synthetic scenario references unknown fields.');
    }
    return { ...graph, entities };
}
