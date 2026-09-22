import type { SchemaGraph } from '../schema/graph.js';
import type { ExistingMockData, MockDataGeneratorDiagnostic, SyntheticScenario } from '../types.js';
import { propertyValueIsValid } from './constraints.js';

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
            const domains = new Map<string, ReadonlyArray<string | number | boolean>>();
            for (const owner of entity.properties) {
                const collection = owner.links?.valueListCollection;
                const initial = collection ? existingData[collection]?.initialRows : undefined;
                if (!initial?.present || (initial.source !== 'json' && !initial.enumerable)) {
                    continue;
                }
                if (initial.rows?.length === 0) {
                    diagnostics.push({
                        code: 'SEMANTIC_DOMAIN_CONFLICT',
                        severity: 'warning',
                        target: `${entity.entitySetName}.${owner.name}`,
                        message: `Authored value-list collection ${collection} is present but empty; no scalar domain was bound.`
                    });
                    continue;
                }
                for (const mapping of owner.links?.valueListMappings ?? []) {
                    const parameter = owner.links?.valueListParameters?.find(
                        ({ localProperty, valueListProperty }) =>
                            localProperty === mapping.localProperty && valueListProperty === mapping.valueListProperty
                    );
                    if (parameter && parameter.direction !== 'In' && parameter.direction !== 'InOut') {
                        continue;
                    }
                    const property = entity.properties.find(({ name }) => name === mapping.localProperty);
                    if (!property) {
                        continue;
                    }
                    // Relationship assignment is resolved as a tuple later. Do not turn a
                    // potentially conflicting value help into an unconditional scalar facet.
                    if (
                        graph.relationships.some(
                            (relationship) =>
                                (relationship.fromEntitySet === entity.entitySetName &&
                                    relationship.mappings.some(
                                        ({ sourceProperty }) => sourceProperty === property.name
                                    )) ||
                                (relationship.toEntitySet === entity.entitySetName &&
                                    relationship.mappings.some(
                                        ({ targetProperty }) => targetProperty === property.name
                                    ))
                        )
                    ) {
                        const related = graph.relationships.filter(
                            (relationship) =>
                                relationship.fromEntitySet === entity.entitySetName &&
                                relationship.mappings.some(({ sourceProperty }) => sourceProperty === property.name)
                        );
                        if (
                            related.some((relationship) => {
                                const targetRows = existingData[relationship.toEntitySet]?.initialRows;
                                return (
                                    targetRows?.present === true &&
                                    (targetRows.source === 'json' || targetRows.enumerable) &&
                                    targetRows.rows.some((targetRow) =>
                                        relationship.mappings.some(
                                            ({ sourceProperty, targetProperty }) =>
                                                sourceProperty === property.name &&
                                                !initial.rows.some(
                                                    (candidate) =>
                                                        candidate[mapping.valueListProperty] ===
                                                        targetRow[targetProperty]
                                                )
                                        )
                                    )
                                );
                            })
                        ) {
                            diagnostics.push({
                                code: 'SEMANTIC_DOMAIN_CONFLICT',
                                severity: 'warning',
                                target: `${entity.entitySetName}.${property.name}`,
                                message: 'Authored value-list tuples cannot satisfy protected relationship assignments.'
                            });
                        }
                        continue;
                    }
                    const previous = domains.get(property.name) ?? property.enumValues;
                    const candidates = initial.rows
                        .map((row) => row[mapping.valueListProperty])
                        .filter(
                            (value): value is string | number | boolean =>
                                (typeof value === 'string' ||
                                    typeof value === 'number' ||
                                    typeof value === 'boolean') &&
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
            }
            return {
                ...entity,
                properties: entity.properties.map((property) =>
                    domains.has(property.name) ? { ...property, enumValues: domains.get(property.name) } : property
                )
            };
        })
    };
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
        throw new TypeError('A synthetic scenario requires an identity, version and field domains.');
    }
    const remaining = new Set(Object.keys(scenario.domains));
    if (scenario.ibanCountry !== undefined && !['DE', 'IE', 'IT', 'CZ'].includes(scenario.ibanCountry)) {
        throw new TypeError('Unsupported synthetic IBAN jurisdiction.');
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
            throw new TypeError('Synthetic coherence rules must reference a known resource and supported rules.');
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
                throw new TypeError(`Invalid synthetic domain for ${target}`);
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
                throw new TypeError(`Synthetic domain violates field constraints for ${target}`);
            }
            diagnostics.push({
                code: 'SYNTHETIC_SCENARIO_APPLIED',
                severity: 'info',
                target,
                message: 'The field uses an explicitly configured synthetic domain, not an application-derived domain.'
            });
            const domain = values.filter(
                (value): value is string | number | boolean =>
                    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            );
            return { ...property, enumValues: [...new Set(domain)] };
        })
    }));
    if (remaining.size > 0) {
        throw new TypeError('Synthetic scenario references unknown fields.');
    }
    return { ...graph, entities };
}
