import { createHash } from 'node:crypto';
import type { SchemaGraph } from './schema/graph.js';
import { semanticPropertyKey } from './semantics/classifier.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT } from './semantics/field-context.js';
import { SEMANTIC_ROLE_REGISTRY_FINGERPRINT, semanticRoleDefinition } from './semantics/role-registry.js';
import { PROVIDER_CAPABLE_ROLES, SEMANTIC_CATALOG_FINGERPRINT } from './semantics/value-banks.js';
import type {
    ExistingInitialRows,
    MockDataGeneratorFieldDecisionInspection,
    MockDataGeneratorInspectionOptions,
    MockDataGeneratorInspectionV1,
    MockDataGeneratorResult,
    MockDataServiceRequest,
    SemanticClassification
} from './types.js';

function canonicalJson(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

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

function providerState(
    acceptedRole: string | undefined,
    pipeline: ServiceInspectionExecution['pipeline']
): MockDataGeneratorFieldDecisionInspection['providerState'] {
    // A role with no value bank selects no provider, whatever the plan accepted.
    if (!acceptedRole || (pipeline === 'semantic-v2' && !PROVIDER_CAPABLE_ROLES.has(acceptedRole))) {
        return 'not-selected';
    }
    return pipeline === 'semantic-v2' ? 'available' : 'legacy-unverified';
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
    pipeline: ServiceInspectionExecution['pipeline']
): MockDataGeneratorFieldDecisionInspection {
    const threshold = finalClassification?.routeThreshold ?? 0.5;
    let acceptedRole: string | undefined;
    if (finalClassification && finalClassification.role !== 'unknown' && finalClassification.confidence >= threshold) {
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
        providerState: providerState(acceptedRole, pipeline),
        ...(detectedRole && !acceptedRole && finalClassification?.abstentionReason
            ? { providerRejectionReason: finalClassification.abstentionReason }
            : {}),
        rejectedCandidates: Object.freeze(
            candidates
                .filter((candidate) => candidate.role !== acceptedRole)
                .map((candidate) => Object.freeze({ ...candidate }))
        ),
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
    rawClassifications: ReadonlyMap<string, SemanticClassification>;
    detectedClassifications: ReadonlyMap<string, SemanticClassification>;
    classifications: ReadonlyMap<string, SemanticClassification>;
    pipeline: 'legacy' | 'semantic-v2';
    timingsMs: Readonly<Record<string, number>>;
    rssBytes: Readonly<{ before: number; after: number }>;
}

/**
 * Build a versioned local report without exposing authored values.
 *
 * @param request
 * @param execution
 * @param options
 */
export function buildServiceInspection(
    request: MockDataServiceRequest,
    execution: ServiceInspectionExecution,
    options: MockDataGeneratorInspectionOptions
): MockDataGeneratorInspectionV1 {
    const targets = new Map(request.targets.map((target) => [target.name, target]));
    const resourceNames = [
        ...request.targets.map((target) => target.name),
        ...Object.keys(request.existingData)
            .filter((name) => !targets.has(name))
            .sort()
    ];
    const sourceOwnership = resourceNames.map((resource) => {
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
    const fieldDecisions =
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
                    execution.pipeline
                );
            })
        ) ?? [];
    const relationships =
        execution.graph?.relationships.map((relationship) =>
            Object.freeze({
                name: relationship.name,
                fromResource: relationship.fromEntitySet,
                toResource: relationship.toEntitySet,
                mappings: relationship.mappings,
                provenance: relationship.provenance ?? 'explicit',
                confidence: relationship.confidence ?? 1
            })
        ) ?? [];
    const generatedSummary = Object.entries(execution.result.resources).map(([resource, rows]) =>
        Object.freeze({ resource, rowCount: rows.length, sha256: sha256(canonicalJson(rows)) })
    );
    const unsupportedSchemaElements =
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
        ]) ?? [];
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
        coverage: Object.freeze({
            eligibleFields:
                fieldDecisions.filter(({ resource }) => targets.has(resource)).length +
                unsupportedSchemaElements.filter(({ path }) => targets.has(path.split('.')[0])).length,
            routedFields: fieldDecisions.filter(({ resource, acceptedRole }) => targets.has(resource) && acceptedRole)
                .length,
            formatValidatedFields: fieldDecisions.filter(
                ({ resource, acceptedRole }) =>
                    execution.pipeline === 'semantic-v2' &&
                    (execution.result.resources[resource]?.length ?? 0) > 0 &&
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
        }),
        pipeline: execution.pipeline,
        hashes: Object.freeze({
            request: execution.result.fingerprints.request,
            metadata: sha256(request.metadata.content)
        }),
        fingerprints: Object.freeze({
            ...execution.result.fingerprints,
            pipeline: execution.pipeline,
            registry: execution.pipeline === 'semantic-v2' ? SEMANTIC_ROLE_REGISTRY_FINGERPRINT : 'legacy-unversioned',
            catalog: execution.pipeline === 'semantic-v2' ? SEMANTIC_CATALOG_FINGERPRINT : 'legacy-unversioned',
            serializer: execution.pipeline === 'semantic-v2' ? FIELD_CONTEXT_SERIALIZER_FINGERPRINT : 'v2'
        }),
        sourceOwnership: Object.freeze(sourceOwnership),
        unsupportedSchemaElements: Object.freeze(unsupportedSchemaElements),
        fieldDecisions: Object.freeze(fieldDecisions),
        relationships: Object.freeze(relationships),
        generatorsUsed: Object.freeze(generatorsUsed),
        generatedSummary: Object.freeze(generatedSummary),
        ...(options.includeGeneratedValues ? { generatedValues: execution.result.resources } : {}),
        invariants: Object.freeze([
            Object.freeze({ name: 'generated-result' as const, passed: true as const }),
            Object.freeze({ name: 'relationships' as const, passed: true as const }),
            ...(execution.pipeline === 'semantic-v2'
                ? [
                      Object.freeze({ name: 'semantic-formats' as const, passed: true }),
                      Object.freeze({
                          name: 'temporal-ordering' as const,
                          passed: !execution.result.diagnostics.some(({ code }) =>
                              code.startsWith('TEMPORAL_CONSTRAINT_')
                          ),
                          status: execution.result.diagnostics.some(({ code }) =>
                              code.startsWith('TEMPORAL_CONSTRAINT_')
                          )
                              ? ('failed' as const)
                              : ('passed' as const)
                      }),
                      Object.freeze({
                          name: 'semantic-domains' as const,
                          passed: domainValidationStatus(execution.result) === 'passed',
                          status: domainValidationStatus(execution.result)
                      })
                  ]
                : [])
        ]),
        diagnostics: execution.result.diagnostics,
        metrics: Object.freeze({
            timingsMs: execution.timingsMs,
            rssBytes: execution.rssBytes
        })
    });
}
