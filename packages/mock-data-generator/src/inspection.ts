import type { SchemaGraph } from './schema/graph.js';
import { semanticPropertyKey } from './semantics/classifier.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT } from './semantics/field-context.js';
import { packagedRoleRegistry, semanticRoleDefinition } from './semantics/role-registry.js';
import { semanticRules } from './semantics/rule-store.js';
import { providerCapableRoles, semanticCatalogFingerprint } from './semantics/value-banks.js';
import type {
    ExistingInitialRows,
    MockDataGeneratorFieldDecisionInspection,
    MockDataGeneratorInspectionOptions,
    MockDataGeneratorInspectionV1,
    MockDataGeneratorResult,
    MockDataServiceRequest,
    SemanticClassification,
    ValueTier
} from './types.js';
import { canonicalJson, sha256 } from './hash.js';

function rowsForHash(initialRows: ExistingInitialRows): ReadonlyArray<unknown> | undefined {
    if (initialRows.source === 'json' || (initialRows.source === 'contributor' && initialRows.enumerable)) {
        return initialRows.rows;
    }
    return undefined;
}

function rawTop(
    classification: SemanticClassification | undefined
): ReadonlyArray<Readonly<{ role: string; confidence: number }>> {
    if (!classification) {
        return [];
    }
    return classification.top ?? [{ role: classification.role, confidence: classification.confidence }];
}

function providerState(acceptedRole: string | undefined): MockDataGeneratorFieldDecisionInspection['providerState'] {
    // A role with no value bank selects no provider, whatever the plan accepted.
    if (!acceptedRole || !providerCapableRoles().has(acceptedRole)) {
        return 'not-selected';
    }
    return 'available';
}

function domainValidationStatus(result: MockDataGeneratorResult): 'passed' | 'failed' | 'unverified' {
    if (
        result.diagnostics.some(({ code }) =>
            ['SEMANTIC_DOMAIN_CONFLICT', 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID'].includes(code)
        )
    ) {
        return 'failed';
    }
    return result.diagnostics.some(({ code }) =>
        [
            'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE',
            'SFT_SEMANTICS_UNVERIFIED',
            'SFT_CANDIDATE_RELEVANCE_UNVERIFIED',
            'SFT_PARTIAL_FALLBACK',
            'SYNTHETIC_DATASET_USED'
        ].includes(code)
    )
        ? 'unverified'
        : 'passed';
}

function decision(
    resource: string,
    entity: SchemaGraph['entities'][number],
    property: SchemaGraph['entities'][number]['properties'][number],
    rawClassification: SemanticClassification | undefined,
    detectedClassification: SemanticClassification | undefined,
    finalClassification: SemanticClassification | undefined,
    valueTier?: MockDataGeneratorFieldDecisionInspection['valueTier']
): MockDataGeneratorFieldDecisionInspection {
    const threshold = finalClassification?.routeThreshold ?? semanticRules().thresholds.statistics;
    let acceptedRole: string | undefined;
    if (
        finalClassification &&
        finalClassification.role !== 'unknown' &&
        (finalClassification.bestEffort === true || finalClassification.confidence >= threshold)
    ) {
        acceptedRole = finalClassification.role;
    }
    let abstentionReason: MockDataGeneratorFieldDecisionInspection['abstentionReason'];
    if (!acceptedRole) {
        if (finalClassification?.abstentionReason) {
            abstentionReason = finalClassification.abstentionReason;
        } else if (!finalClassification) {
            abstentionReason = 'no-candidate';
        } else if (finalClassification.role === 'unknown') {
            abstentionReason = 'classifier-unknown';
        } else {
            abstentionReason = 'below-threshold';
        }
    }
    const candidates = rawTop(rawClassification);
    const detectedRole =
        detectedClassification?.role && detectedClassification.role !== 'unknown'
            ? detectedClassification.role
            : undefined;
    return Object.freeze({
        resource,
        entity: entity.name,
        property: property.name,
        primitiveType: property.primitiveType,
        isKey: property.isKey,
        rawTop: Object.freeze(candidates.map((candidate) => Object.freeze({ ...candidate }))),
        ...(rawClassification?.source === 'classifier'
            ? {
                  classifierPrediction: Object.freeze({
                      role: rawClassification.role,
                      confidence: rawClassification.confidence,
                      ...(rawClassification.routeThreshold === undefined
                          ? {}
                          : { routeThreshold: rawClassification.routeThreshold }),
                      ...(rawClassification.predictionSetSize === undefined
                          ? {}
                          : { predictionSetSize: rawClassification.predictionSetSize }),
                      ...(rawClassification.predictionSet === undefined
                          ? {}
                          : { predictionSet: Object.freeze([...rawClassification.predictionSet]) })
                  })
              }
            : {}),
        ...(detectedRole ? { detectedRole, detectionSource: detectedClassification?.source } : {}),
        acceptedRole,
        abstentionReason,
        providerState: providerState(acceptedRole),
        ...(detectedRole && !acceptedRole && finalClassification?.abstentionReason
            ? { providerRejectionReason: finalClassification.abstentionReason }
            : {}),
        rejectedCandidates: Object.freeze(
            candidates
                .filter((candidate) => candidate.role !== acceptedRole)
                .map((candidate) => Object.freeze({ ...candidate }))
        ),
        ...(valueTier ? { valueTier } : {}),
        evidence: Object.freeze({
            ...(property.label ? { label: property.label } : {}),
            ...(property.description ? { description: property.description } : {}),
            ...(property.dataElement ? { dataElement: property.dataElement } : {}),
            ...(property.links ? { links: property.links } : {}),
            annotations: property.annotations,
            ...(rawClassification ? { rawCandidate: rawClassification } : {}),
            ...(finalClassification ? { finalCandidate: finalClassification } : {})
        })
    });
}

export interface ServiceInspectionExecution {
    locale?: string;
    artifactIdentity?: MockDataGeneratorInspectionV1['artifactIdentity'];
    syntheticInputs: MockDataGeneratorInspectionV1['syntheticInputs'];
    result: MockDataGeneratorResult;
    graph?: SchemaGraph;
    /** The request metadata as parsed, before application domains and scenarios were applied. */
    parsedGraph?: SchemaGraph;
    rawClassifications: ReadonlyMap<string, SemanticClassification>;
    /** Published cells per property (`semanticPropertyKey`) by writing tier. */
    fieldTiers?: ReadonlyMap<string, Readonly<{ tier: ValueTier; cells: number; modelCells: number }>>;
    detectedClassifications: ReadonlyMap<string, SemanticClassification>;
    classifications: ReadonlyMap<string, SemanticClassification>;
    pipeline: 'semantic-v2';
    timingsMs: Readonly<Record<string, number>>;
    rssBytes: Readonly<{ before: number; after: number }>;
}

/** The schema elements an inspection reports, as one row each. */
type UnsupportedSchemaElements = MockDataGeneratorInspectionV1['unsupportedSchemaElements'];

/**
 * Describe who owns the rows of every requested resource and of every resource the caller supplied as
 * context, without exposing the supplied values: only their source, count and hash.
 *
 * @param request the generation request
 * @param targets the requested resources by name
 * @returns one entry per requested resource, in request order, then the context-only resources by name
 */
function sourceOwnershipReport(
    request: MockDataServiceRequest,
    targets: ReadonlyMap<string, MockDataServiceRequest['targets'][number]>
): MockDataGeneratorInspectionV1['sourceOwnership'] {
    const resourceNames = [
        ...request.targets.map((target) => target.name),
        ...Object.keys(request.existingData)
            .filter((name) => !targets.has(name))
            .sort()
    ];
    return resourceNames.map((resource) => {
        const existing = request.existingData[resource];
        const initialRows = existing?.initialRows ?? ({ source: 'none', present: false } as const);
        const rows = rowsForHash(initialRows);
        return Object.freeze({
            resource,
            ...(targets.get(resource) ? { targetKind: targets.get(resource)?.kind } : {}),
            eligible: targets.has(resource),
            eligibilityReason: targets.has(resource) ? ('requested' as const) : ('context-only' as const),
            contributor: existing?.contributor ?? Object.freeze({ present: false as const }),
            initialRows: Object.freeze({
                source: initialRows.source,
                present: initialRows.present,
                rowCount: rows?.length ?? 0,
                ...(rows ? { sha256: sha256(canonicalJson(rows)) } : {})
            })
        });
    });
}

/**
 * The routing decision of every property of the generated schema.
 *
 * @param execution the finished generation
 * @returns one decision per property, in schema order; none when no schema was generated
 */
function fieldDecisionsReport(
    execution: ServiceInspectionExecution
): ReadonlyArray<MockDataGeneratorFieldDecisionInspection> {
    return (
        execution.graph?.entities.flatMap((entity) =>
            entity.properties.map((property) => {
                const key = semanticPropertyKey(entity.entitySetName, property.name);
                return decision(
                    entity.entitySetName,
                    entity,
                    property,
                    execution.rawClassifications.get(key),
                    execution.detectedClassifications.get(key),
                    execution.classifications.get(key),
                    execution.fieldTiers?.get(key)
                );
            })
        ) ?? []
    );
}

/**
 * The relationships of the generated schema with their provenance.
 *
 * @param execution the finished generation
 * @returns one entry per relationship, in schema order
 */
function relationshipsReport(execution: ServiceInspectionExecution): MockDataGeneratorInspectionV1['relationships'] {
    return (
        execution.graph?.relationships.map((relationship) =>
            Object.freeze({
                name: relationship.name,
                fromResource: relationship.fromEntitySet,
                toResource: relationship.toEntitySet,
                mappings: relationship.mappings,
                provenance: relationship.provenance ?? 'explicit',
                confidence: relationship.confidence ?? 1
            })
        ) ?? []
    );
}

/**
 * The properties the pipeline leaves out: structured properties and types without an inline JSON value.
 *
 * @param execution the finished generation
 * @returns per entity, its structured properties and then its omitted properties
 */
function unsupportedSchemaElementsReport(execution: ServiceInspectionExecution): UnsupportedSchemaElements {
    return (
        execution.graph?.entities.flatMap((entity) => [
            ...(entity.structuredProperties ?? []).map((property) =>
                Object.freeze({
                    kind: property.kind,
                    path: `${entity.entitySetName}.${property.name}`,
                    reason: 'Structured property generation is not supported by this pipeline.'
                })
            ),
            ...(entity.omittedProperties ?? []).map((property) =>
                Object.freeze({
                    kind: 'unsupported-type',
                    path: `${entity.entitySetName}.${property.name}`,
                    reason: `${property.declaredType} has no generatable inline JSON value; generated rows omit it.`
                })
            )
        ]) ?? []
    );
}

/**
 * Count how the fields of the requested resources were routed.
 *
 * @param targets the requested resource names
 * @param result the generation result
 * @param fieldDecisions the routing decision of every property
 * @param unsupportedSchemaElements the properties the pipeline leaves out
 * @returns the coverage counts
 */
function coverageReport(
    targets: ReadonlyMap<string, unknown>,
    result: MockDataGeneratorResult,
    fieldDecisions: ReadonlyArray<MockDataGeneratorFieldDecisionInspection>,
    unsupportedSchemaElements: UnsupportedSchemaElements
): MockDataGeneratorInspectionV1['coverage'] {
    return Object.freeze({
        eligibleFields:
            fieldDecisions.filter(({ resource }) => targets.has(resource)).length +
            unsupportedSchemaElements.filter(({ path }) => targets.has(path.split('.')[0])).length,
        routedFields: fieldDecisions.filter(({ resource, acceptedRole }) => targets.has(resource) && acceptedRole)
            .length,
        formatValidatedFields: fieldDecisions.filter(
            ({ resource, acceptedRole }) =>
                (result.resources[resource]?.length ?? 0) > 0 &&
                acceptedRole &&
                semanticRoleDefinition(acceptedRole)?.validator !== 'structural'
        ).length,
        structuralOnlyFields: fieldDecisions.filter(
            ({ resource, acceptedRole }) =>
                targets.has(resource) &&
                acceptedRole &&
                semanticRoleDefinition(acceptedRole)?.validator === 'structural'
        ).length,
        unsupportedFields:
            fieldDecisions.filter(({ resource, acceptedRole }) => targets.has(resource) && !acceptedRole).length +
            unsupportedSchemaElements.filter(({ path }) => targets.has(path.split('.')[0])).length
    });
}

/**
 * The invariants the result was checked against and whether each held.
 *
 * @param result the generation result
 * @returns the invariants, in report order
 */
function invariantsReport(result: MockDataGeneratorResult): MockDataGeneratorInspectionV1['invariants'] {
    return Object.freeze([
        Object.freeze({ name: 'generated-result' as const, passed: true as const }),
        Object.freeze({ name: 'relationships' as const, passed: true as const }),
        ...[
            Object.freeze({ name: 'semantic-formats' as const, passed: true }),
            Object.freeze({
                name: 'temporal-ordering' as const,
                passed: !result.diagnostics.some(({ code }) => code.startsWith('TEMPORAL_CONSTRAINT_')),
                status: result.diagnostics.some(({ code }) => code.startsWith('TEMPORAL_CONSTRAINT_'))
                    ? ('failed' as const)
                    : ('passed' as const)
            }),
            Object.freeze({
                name: 'semantic-domains' as const,
                passed: domainValidationStatus(result) === 'passed',
                status: domainValidationStatus(result)
            })
        ]
    ]);
}

/**
 * Build a versioned local report without exposing authored values.
 *
 * @param request the generation request
 * @param execution the finished generation and what it planned
 * @param options what the report includes
 * @returns the frozen inspection report
 */
export function buildServiceInspection(
    request: MockDataServiceRequest,
    execution: ServiceInspectionExecution,
    options: MockDataGeneratorInspectionOptions
): MockDataGeneratorInspectionV1 {
    const targets = new Map(request.targets.map((target) => [target.name, target]));
    const sourceOwnership = sourceOwnershipReport(request, targets);
    const fieldDecisions = fieldDecisionsReport(execution);
    const relationships = relationshipsReport(execution);
    const generatedSummary = Object.entries(execution.result.resources).map(([resource, rows]) =>
        Object.freeze({ resource, rowCount: rows.length, sha256: sha256(canonicalJson(rows)) })
    );
    const unsupportedSchemaElements = unsupportedSchemaElementsReport(execution);
    const generatorsUsed = [
        `${execution.pipeline}-deterministic`,
        ...(execution.result.statistics.sft.attempts > 0 ? [`${execution.pipeline}-sft`] : [])
    ];

    return Object.freeze({
        version: 1,
        ...(execution.locale ? { locale: execution.locale } : {}),
        artifactIdentity: execution.artifactIdentity,
        syntheticInputs: execution.syntheticInputs,
        executionMode:
            execution.result.capabilities.classifier === 'unavailable' &&
            execution.result.capabilities.sft === 'unavailable'
                ? 'deterministic-inspection'
                : 'learned-inspection',
        coverage: coverageReport(targets, execution.result, fieldDecisions, unsupportedSchemaElements),
        pipeline: execution.pipeline,
        hashes: Object.freeze({
            request: execution.result.fingerprints.request,
            metadata: sha256(request.metadata.content)
        }),
        fingerprints: Object.freeze({
            ...execution.result.fingerprints,
            pipeline: execution.pipeline,
            registry: packagedRoleRegistry().fingerprint,
            catalog: semanticCatalogFingerprint(),
            serializer: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
        }),
        sourceOwnership: Object.freeze(sourceOwnership),
        unsupportedSchemaElements: Object.freeze(unsupportedSchemaElements),
        fieldDecisions: Object.freeze(fieldDecisions),
        relationships: Object.freeze(relationships),
        generatorsUsed: Object.freeze(generatorsUsed),
        generatedSummary: Object.freeze(generatedSummary),
        ...(options.includeGeneratedValues ? { generatedValues: execution.result.resources } : {}),
        invariants: invariantsReport(execution.result),
        diagnostics: execution.result.diagnostics,
        statistics: execution.result.statistics,
        ...(execution.result.tiers ? { tiers: execution.result.tiers } : {}),
        ...(execution.result.typedFloor ? { typedFloor: execution.result.typedFloor } : {}),
        metrics: Object.freeze({
            timingsMs: execution.timingsMs,
            rssBytes: execution.rssBytes
        })
    });
}
