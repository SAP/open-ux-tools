export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue };
export type MockDataRow = Readonly<Record<string, JsonValue>>;

export interface MockDataMetadata {
    format: 'edmx' | 'csn';
    content: string;
}

export interface MockDataServiceIdentity {
    urlPath: string;
    alias?: string;
    odataVersion: '2.0' | '4.0';
}

export interface MockDataTarget {
    name: string;
    kind: 'entity-set' | 'singleton';
}

export type ExistingInitialRows =
    | { source: 'none'; present: false }
    | { source: 'json'; present: true; rows: ReadonlyArray<MockDataRow> }
    | { source: 'contributor'; present: true; enumerable: false }
    | { source: 'contributor'; present: true; enumerable: true; rows: ReadonlyArray<MockDataRow> };

export interface ExistingMockData {
    contributor: { present: false } | { present: true; hasInitialData: boolean };
    initialRows: ExistingInitialRows;
}

export interface MockDataServiceRequest {
    metadata: MockDataMetadata;
    service: MockDataServiceIdentity;
    targets: ReadonlyArray<MockDataTarget>;
    existingData: Readonly<Record<string, ExistingMockData>>;
    signal?: AbortSignal;
}

/** Replaceable synthetic text samples; these are not authoritative business data. */
export interface SyntheticSampleDataset {
    id: string;
    version: string;
    firstNames: readonly string[];
    lastNames: readonly string[];
    organizations: readonly string[];
    descriptions: readonly string[];
    /** Optional replacements for descriptive sample roles, not business-code domains. */
    roleSamples?: Readonly<Record<string, readonly string[]>>;
}

/** Explicit fictional domains, addressed by EntitySet.Property. */
export type SyntheticCoherenceRule =
    | 'temporal'
    | 'status'
    | 'units'
    | 'monetary'
    | 'balance'
    | 'conversion'
    | 'lifecycle'
    | 'processing-status'
    | 'country-phone';

export interface SyntheticScenario {
    id: string;
    version: string;
    domains: Readonly<Record<string, ReadonlyArray<string | number | boolean>>>;
    /** Optional, explicitly selected simulation rules for named resources. */
    coherence?: Readonly<Record<string, readonly SyntheticCoherenceRule[]>>;
    /** Explicit before/after constraints override inferred temporal assumptions for each named resource. */
    temporalConstraints?: ReadonlyArray<Readonly<{ resource: string; before: string; after: string }>>;
    /** Jurisdiction for synthetic IBAN generation, never inferred from an address. */
    ibanCountry?: 'DE' | 'IE' | 'IT' | 'CZ';
}

export interface MockDataGeneratorOptions {
    sampleDataset?: SyntheticSampleDataset;
    syntheticScenario?: SyntheticScenario;
    rowsPerEntity?: number | Readonly<Record<string, number>>;
    seed?: number;
    locale?: string;
    mode?: 'auto' | 'deterministic' | 'learned';
    pipeline?: 'legacy' | 'semantic-v2';
    /** Maximum duration of one entity-level SFT inference. */
    sftTimeoutMs?: number;
    /** Total local-LLM budget shared across service entities; defaults to 20 seconds. */
    sftBudgetMs?: number;
    /**
     * Rows per entity the fine-tuned model writes; the remaining rows reuse those values field by
     * field (coupled fields together). Every row when absent.
     */
    sftModelRows?: number;
    /** Entity sets the fine-tuned tier fills first, in this order, such as those an app displays. */
    sftPriorityTargets?: ReadonlyArray<string>;
}

export interface SemanticClassifierInput {
    entityName: string;
    propertyName: string;
    primitiveType: string;
    label?: string;
    description?: string;
    annotations: ReadonlyArray<Readonly<{ term: string; value?: JsonValue }>>;
    dataElement?: string;
}

export interface FieldContextV3 extends SemanticClassifierInput {
    inputFormat: 'v3';
    nullable: boolean;
    isKey: boolean;
    facets: Readonly<{
        maxLength?: number;
        precision?: number;
        scale?: number;
        numericMinimum?: number;
        numericMaximum?: number;
    }>;
    linkedMetadataPaths: ReadonlyArray<string>;
    relationshipParticipation: ReadonlyArray<
        Readonly<{
            relationship: string;
            direction: 'source' | 'target';
            property: string;
        }>
    >;
    neighbors: ReadonlyArray<string>;
}

/**
 * A field concept of the classifier's prototype head (head B) and its value bank. Concepts cover the
 * many business meanings that have no semantic role, such as a purchasing group or a controlling area.
 */
export interface ConceptBank {
    readonly id: string;
    readonly name: string;
    readonly valueKind: 'code' | 'code-text' | 'name' | 'text' | 'identifier' | 'number' | 'decimal';
    /** Primitive types the concept was observed with; only these can take its values. */
    readonly types: ReadonlyArray<string>;
    readonly values?: ReadonlyArray<string>;
    readonly pairs?: ReadonlyArray<Readonly<{ code: string; text: string }>>;
    readonly range?: Readonly<{ min: number; max: number; scale: number }>;
    /**
     * Minimum similarity for this concept: how close its own real examples sit to its prototype, so a
     * diffuse concept demands a closer match than a tight one.
     */
    readonly minimumSimilarity?: number;
    /** How close the concept's own train examples sit to its prototype; input to the acceptance layer. */
    readonly cohesion?: Readonly<{ p10: number; p25: number; p50: number; examples: number }>;
}

/** The closest concept of the prototype head, reported only when it clears the head's thresholds. */
export interface ConceptMatch {
    readonly id: string;
    /** Cosine similarity between the field vector and the concept prototype. */
    readonly similarity: number;
    /** Similarity gap to the runner-up concept. */
    readonly margin: number;
}

export interface SemanticClassification {
    role: string;
    confidence: number;
    source: 'classifier' | 'metadata' | 'lexical-fallback' | 'concept' | 'unknown';
    /** Prototype-head match; decides the field only when no role is accepted. */
    concept?: ConceptMatch;
    routeThreshold?: number;
    predictionSetSize?: number;
    predictionSet?: ReadonlyArray<string>;
    top?: ReadonlyArray<Readonly<{ role: string; confidence: number }>>;
    abstentionReason?: MockDataGeneratorAbstentionReason;
}

export interface SemanticClassifier {
    readonly fingerprint: string;
    readonly inputFormat?: 'v1' | 'v2' | 'v3';
    classify(input: SemanticClassifierInput, signal: AbortSignal): Promise<SemanticClassification>;
    classifyBatch?(
        inputs: ReadonlyArray<SemanticClassifierInput>,
        signal: AbortSignal
    ): Promise<ReadonlyArray<SemanticClassification>>;
    /** The value bank of a prototype-head concept, when the classifier carries one. */
    conceptBank?(id: string): ConceptBank | undefined;
}

export interface SftFieldRequest {
    name: string;
    primitiveType: string;
    isKey?: boolean;
    label?: string;
    precision?: number;
    scale?: number;
    semanticRole?: string;
    description?: string;
    nullable: boolean;
    maxLength?: number;
    /** Original schema facet, independent of the bounded generation grammar. */
    declaredMaxLength?: number;
    allowedDomain?: ReadonlyArray<JsonValue>;
    /** Schema-declared value-help property targets; not generated value pools. */
    valueHelpTargets?: ReadonlyArray<string>;
    /** Explicit relationship targets expressed as entity.property. */
    foreignKeyTargets?: ReadonlyArray<string>;
    /** Schema properties that reference this field. */
    referencedBy?: ReadonlyArray<string>;
    /** Schema-declared currency or unit companion field. */
    currencyOrUnitField?: string;
    /** Inclusive range of an integer type (for example Edm.Byte 0..255). */
    minimum?: number;
    maximum?: number;
}

/** A proposed descriptive value and its schema context for independent relevance checking. */
export interface SftCandidateRelevancePair {
    service: MockDataServiceIdentity;
    resource: string;
    entity: string;
    field: SftFieldRequest;
    value: string;
    linkedCode: Readonly<{ property: string; value: string }>;
    textLink: Readonly<{ codeProperty: string; textProperty: string }>;
    relatedResources: ReadonlyArray<string>;
}

export interface SftCandidateRelevanceVerifier {
    readonly fingerprint: string;
    verifyBatch(pairs: ReadonlyArray<SftCandidateRelevancePair>, signal: AbortSignal): Promise<ReadonlyArray<boolean>>;
}

export interface SftGenerationInput {
    /** Cooperative local budget. Parent cancellation always takes precedence. */
    budgetMs?: number;
    contractVersion?: 1 | 2;
    service: MockDataServiceIdentity;
    entityName: string;
    fields: ReadonlyArray<SftFieldRequest>;
    rowCount: number;
    seed: number;
    locale?: string;
    fixedRows?: ReadonlyArray<MockDataRow>;
    siblingGroup?: string;
    acceptedRoles?: Readonly<Record<string, string>>;
    /**
     * Fields that must be proposed in one call and accepted together (a generated code with its
     * text, a linked text with its code). The remaining fields may be split across calls.
     */
    coupledFieldGroups?: ReadonlyArray<ReadonlyArray<string>>;
}

export interface SftGenerationOutput {
    rows: ReadonlyArray<MockDataRow>;
    diagnostics?: ReadonlyArray<MockDataGeneratorDiagnostic>;
    statistics?: Readonly<{
        attempts: number;
        parsedResponses: number;
    }>;
}

export interface SftGenerator {
    readonly fingerprint: string;
    generate(input: SftGenerationInput, signal: AbortSignal): Promise<SftGenerationOutput>;
    dispose?(): Promise<void> | void;
}

export type MockDataGenerationTier = 'T0' | 'T1' | 'T2' | 'T3';

export type MockDataGenerationProgressPhase = 'start' | 'complete';

export interface MockDataGenerationProgress {
    tier: MockDataGenerationTier;
    phase: MockDataGenerationProgressPhase;
    resource?: string;
    fields?: ReadonlyArray<string>;
    rowCount?: number;
    acceptedSlots?: number;
    /** Unfilled candidate slots retained by deterministic T3 fallback. */
    fallbackSlots?: number;
    durationMs?: number;
}

export interface MockDataGeneratorRuntime {
    classifier?: SemanticClassifier;
    sft?: SftGenerator;
    candidateVerifier?: SftCandidateRelevanceVerifier;
    onProgress?(event: MockDataGenerationProgress): void;
}

export interface MockDataGeneratorDiagnostic {
    code: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    target?: string;
}

export interface MockDataGeneratorCapabilities {
    mode: 'deterministic' | 'semantic' | 'hybrid';
    classifier: 'ready' | 'unavailable' | 'degraded';
    sft: 'ready' | 'unavailable' | 'degraded';
}

export interface MockDataGeneratorFingerprints {
    request: string;
    classifier?: string;
    sft?: string;
    relevance?: string;
}

export interface SftFieldStatistics {
    name: string;
    eligibleSlots: number;
    acceptedSlots: number;
    /** Rows whose candidate for this field failed its constraints or the placeholder checks. */
    invalidSlots?: number;
}

/**
 * How one resource's model attempt ended.
 * - `accepted`: every eligible slot received a model value.
 * - `partial`: some slots received a model value.
 * - `rejected`: the model answered, but no candidate passed validation.
 * - `unverified`: a linked-text or generated-domain candidate was declined by the relevance check.
 * - `timeout` / `failed`: the model call timed out or failed.
 */
export type SftResourceOutcome = 'accepted' | 'partial' | 'rejected' | 'unverified' | 'timeout' | 'failed';

export interface SftAssignmentStatistics {
    resource: string;
    entity: string;
    rowCount: number;
    parsed: boolean;
    fields: ReadonlyArray<SftFieldStatistics>;
    outcome?: SftResourceOutcome;
    /** Rows for which the model returned no complete candidate. */
    rowsWithoutCandidate?: number;
}

/** A resource with fields for the model that was not attempted. */
export interface SftSkippedResource {
    resource: string;
    /** `budget`: the service budget could not fund another attempt; `circuit-open`: skipped after a runtime failure. */
    reason: 'budget' | 'circuit-open';
    rowCount: number;
    fields: ReadonlyArray<string>;
}

export interface SftGenerationStatistics {
    attempts: number;
    parsedResponses: number;
    eligibleSlots: number;
    acceptedSlots: number;
    /** Candidate value slots rejected across attempts; retries can make this exceed eligibleSlots. */
    rejectedSlots: number;
    /** Final eligible slots not filled by an accepted model value. */
    fallbackSlots: number;
    assignments: ReadonlyArray<SftAssignmentStatistics>;
    /** Resources with fields for the model that were left to the deterministic tiers without an attempt. */
    skippedResources?: ReadonlyArray<SftSkippedResource>;
}

export interface MockDataGeneratorStatistics {
    sft: SftGenerationStatistics;
}

/** Field decisions are counted once by detection source; provider binding is a separate subset. */
export interface MockDataGeneratorRoutingStatistics {
    totalFields: number;
    metadataAccepted: number;
    classifierAccepted: number;
    lexicalAccepted: number;
    /** Fields decided by the classifier's prototype head and filled from a concept bank. */
    conceptAccepted: number;
    abstained: number;
    providerBound: number;
    detectedButUnbound: number;
}

/**
 * Which tier wrote a generated cell. Counted per value slot (row times property), so the totals
 * answer how much of the published dataset each tier is responsible for.
 */
export const VALUE_TIER = {
    /** T0: rows the caller supplied, kept as they were. */
    authored: 'authored',
    /** T0: a value the schema itself enumerates: a declared enumeration, or either value of a boolean. */
    declared: 'declared',
    /** T1: a value bank selected by a recognised semantic role. */
    recognised: 'recognised',
    /** T2: a value proposed by the local language model and accepted. */
    model: 'model',
    /** T3: the typed floor, which respects the declared shape and cannot decline. */
    typed: 'typed',
    /** Foreign keys written by relational assignment rather than by a tier. */
    structural: 'structural'
} as const;

export type ValueTier = (typeof VALUE_TIER)[keyof typeof VALUE_TIER];

/**
 * Why cells ended on the typed floor. `keys` belong there — a generated identifier has nothing to
 * recognise — so only `addressable` measures missing coverage. `booleans` is kept for existing
 * consumers and is zero: a non-key boolean's type enumerates its values, so it counts as declared,
 * and a boolean key counts as a key.
 */
export type MockDataGeneratorTypedFloorCauses = Readonly<{
    keys: number;
    booleans: number;
    protocol: number;
    addressable: number;
}>;

/** Generated value slots by writing tier; `slots` is the sum of all six counts. */
export type MockDataGeneratorTierStatistics = Readonly<Record<ValueTier, number>> & Readonly<{ slots: number }>;

export interface MockDataGeneratorResult {
    semanticRoles?: Readonly<Record<string, string>>;
    semanticPlanFingerprint?: string;
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
    capabilities: MockDataGeneratorCapabilities;
    fingerprints: MockDataGeneratorFingerprints;
    statistics: MockDataGeneratorStatistics;
    routing?: MockDataGeneratorRoutingStatistics;
    tiers?: MockDataGeneratorTierStatistics;
    typedFloor?: MockDataGeneratorTypedFloorCauses;
}

export interface MockDataGeneratorInspectionOptions {
    /** Include generated rows in the explicitly requested local report. */
    includeGeneratedValues?: boolean;
}

export interface MockDataSourceOwnershipInspection {
    resource: string;
    targetKind?: MockDataTarget['kind'];
    eligible: boolean;
    eligibilityReason: 'requested' | 'context-only';
    contributor: ExistingMockData['contributor'];
    initialRows: Readonly<{
        source: ExistingInitialRows['source'];
        present: boolean;
        rowCount: number;
        sha256?: string;
    }>;
}

export type MockDataGeneratorAbstentionReason =
    | 'no-candidate'
    | 'classifier-unknown'
    | 'below-threshold'
    | 'conflicting-candidates'
    | 'unsupported-role'
    | 'incompatible-type'
    | 'key-policy'
    | 'lexical-gate'
    | 'technical-field'
    | 'incompatible-facets'
    | 'unsupported-domain';

export interface MockDataGeneratorFieldDecisionInspection {
    resource: string;
    entity: string;
    property: string;
    primitiveType: string;
    isKey: boolean;
    rawTop: ReadonlyArray<Readonly<{ role: string; confidence: number }>>;
    /** Raw model decision, including abstentions, before metadata arbitration and provider binding. */
    classifierPrediction?: Readonly<{
        role: string;
        confidence: number;
        routeThreshold?: number;
        predictionSetSize?: number;
        predictionSet?: ReadonlyArray<string>;
    }>;
    /** Role accepted by arbitration, independent of whether a value provider can serve it. */
    detectedRole?: string;
    detectionSource?: SemanticClassification['source'];
    acceptedRole?: string;
    abstentionReason?: MockDataGeneratorAbstentionReason;
    providerState: 'available' | 'legacy-unverified' | 'not-selected';
    providerRejectionReason?: MockDataGeneratorAbstentionReason;
    rejectedCandidates: ReadonlyArray<Readonly<{ role: string; confidence: number }>>;
    /**
     * Published cells of this property by the tier that wrote them: `modelCells` came from the
     * fine-tuned tier and the remaining cells from `tier`. Absent for resources that were not generated.
     */
    valueTier?: Readonly<{ tier: ValueTier; cells: number; modelCells: number }>;
    evidence: Readonly<{
        label?: string;
        description?: string;
        dataElement?: string;
        links?: Readonly<{
            text?: string;
            valueListCollection?: string;
            valueListMappings?: ReadonlyArray<Readonly<{ localProperty: string; valueListProperty: string }>>;
        }>;
        annotations: SemanticClassifierInput['annotations'];
        rawCandidate?: SemanticClassification;
        finalCandidate?: SemanticClassification;
    }>;
}

export interface MockDataGeneratorRelationshipInspection {
    name: string;
    fromResource: string;
    toResource: string;
    mappings: ReadonlyArray<Readonly<{ sourceProperty: string; targetProperty: string }>>;
    provenance: 'explicit' | 'inferred';
    confidence: number;
}

export interface MockDataGeneratorInvariantInspection {
    name: 'generated-result' | 'relationships' | 'semantic-formats' | 'semantic-domains' | 'temporal-ordering';
    passed: boolean;
    status?: 'passed' | 'failed' | 'unverified' | 'not-applicable';
}

export interface MockDataGeneratorInspectionV1 {
    version: 1;
    locale?: string;
    artifactIdentity?: Readonly<{
        classifier?: Readonly<{ fingerprint: string; inputFormat: 'v1' | 'v2' | 'v3' | 'unspecified' }>;
        sft?: Readonly<{ fingerprint: string }>;
    }>;
    syntheticInputs: Readonly<{
        dataset: Readonly<{ id: string; version: string; sha256: string }>;
        scenario?: Readonly<{ id: string; version: string; sha256: string }>;
    }>;
    executionMode: 'deterministic-inspection' | 'learned-inspection';
    coverage: Readonly<{
        eligibleFields: number;
        routedFields: number;
        formatValidatedFields: number;
        structuralOnlyFields: number;
        unsupportedFields: number;
    }>;
    pipeline: 'legacy' | 'semantic-v2';
    hashes: Readonly<{ request: string; metadata: string }>;
    fingerprints: Readonly<Record<string, string>>;
    sourceOwnership: ReadonlyArray<MockDataSourceOwnershipInspection>;
    unsupportedSchemaElements: ReadonlyArray<Readonly<{ kind: string; path: string; reason: string }>>;
    fieldDecisions: ReadonlyArray<MockDataGeneratorFieldDecisionInspection>;
    relationships: ReadonlyArray<MockDataGeneratorRelationshipInspection>;
    generatorsUsed: ReadonlyArray<string>;
    generatedSummary: ReadonlyArray<Readonly<{ resource: string; rowCount: number; sha256: string }>>;
    generatedValues?: MockDataGeneratorResult['resources'];
    invariants: ReadonlyArray<MockDataGeneratorInvariantInspection>;
    diagnostics: MockDataGeneratorResult['diagnostics'];
    /** The generation's fine-tuned tier statistics, value slots by writing tier and typed-floor causes. */
    statistics?: MockDataGeneratorStatistics;
    tiers?: MockDataGeneratorTierStatistics;
    typedFloor?: MockDataGeneratorTypedFloorCauses;
    metrics: Readonly<{
        timingsMs: Readonly<Record<string, number>>;
        rssBytes: Readonly<{ before: number; after: number }>;
    }>;
}
