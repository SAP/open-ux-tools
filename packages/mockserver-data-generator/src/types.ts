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

export interface MockDataGeneratorOptions {
    rowsPerEntity?: number | Readonly<Record<string, number>>;
    seed?: number;
    locale?: string;
    mode?: 'auto' | 'deterministic' | 'learned';
    /** Maximum duration of one entity-level SFT inference. */
    sftTimeoutMs?: number;
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

export interface SemanticClassification {
    role: string;
    confidence: number;
    source: 'classifier' | 'metadata' | 'lexical-fallback' | 'unknown';
    routeThreshold?: number;
    predictionSetSize?: number;
    top?: ReadonlyArray<Readonly<{ role: string; confidence: number }>>;
}

export interface SemanticClassifier {
    readonly fingerprint: string;
    classify(input: SemanticClassifierInput, signal: AbortSignal): Promise<SemanticClassification>;
}

export interface SftFieldRequest {
    name: string;
    primitiveType: string;
    semanticRole?: string;
    nullable: boolean;
    maxLength?: number;
}

export interface SftGenerationInput {
    service: MockDataServiceIdentity;
    entityName: string;
    fields: ReadonlyArray<SftFieldRequest>;
    rowCount: number;
    seed: number;
    locale?: string;
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

export interface MockDataGeneratorRuntime {
    classifier?: SemanticClassifier;
    sft?: SftGenerator;
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
}

export interface SftFieldStatistics {
    name: string;
    eligibleSlots: number;
    acceptedSlots: number;
}

export interface SftAssignmentStatistics {
    resource: string;
    entity: string;
    rowCount: number;
    parsed: boolean;
    fields: ReadonlyArray<SftFieldStatistics>;
}

export interface SftGenerationStatistics {
    attempts: number;
    parsedResponses: number;
    eligibleSlots: number;
    acceptedSlots: number;
    assignments: ReadonlyArray<SftAssignmentStatistics>;
}

export interface MockDataGeneratorStatistics {
    sft: SftGenerationStatistics;
}

export interface MockDataGeneratorResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
    capabilities: MockDataGeneratorCapabilities;
    fingerprints: MockDataGeneratorFingerprints;
    statistics: MockDataGeneratorStatistics;
}
