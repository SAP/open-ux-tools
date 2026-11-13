import type {
    MockDataGeneratorInspectionOptions,
    MockDataGeneratorInspectionV1,
    MockDataServiceRequest
} from './types.js';
import {
    createMockDataGenerator,
    type StandaloneGenerationOptions,
    type StandaloneGenerationResult
} from './standalone.js';

export { createMockDataGenerator, getMockDataGeneratorInfo } from './standalone.js';
export { generateProjectData } from './project-data.js';
export { MockGenError, MOCKGEN_ERROR_CODE } from './errors.js';
export type { MockGenErrorCode } from './errors.js';
export type {
    CreateMockDataGeneratorOptions,
    MockDataGenerator,
    MockDataGeneratorInfo,
    MockDataGeneratorInfoOptions,
    StandaloneGenerationOptions,
    StandaloneGenerationResult
} from './standalone.js';
export type { GenerateProjectDataInput, GeneratedProjectData } from './project-data.js';
export type {
    ExistingInitialRows,
    ExistingMockData,
    JsonPrimitive,
    JsonValue,
    MockDataGenerationProgress,
    MockDataGenerationProgressPhase,
    MockDataGenerationTier,
    MockDataGeneratorCapabilities,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorDiagnosticCode,
    MockDataGeneratorFingerprints,
    MockDataGeneratorInspectionOptions,
    MockDataGeneratorInspectionV1,
    MockDataGeneratorOptions,
    MockDataGeneratorResult,
    MockDataGeneratorRoutingStatistics,
    MockDataGeneratorStatistics,
    MockDataGeneratorTierStatistics,
    MockDataGeneratorTypedFloorCauses,
    MockDataMetadata,
    MockDataRow,
    MockDataServiceIdentity,
    MockDataServiceRequest,
    MockDataTarget,
    SyntheticCoherenceRule,
    SyntheticScenario,
    SyntheticSampleDataset,
    ValueTier
} from './types.js';

/**
 * One-shot generation using only the semantic planner and bundled verified models; the session is disposed
 * afterwards.
 *
 * @param request the service to generate
 * @param options generation options
 * @returns the result with its execution mode, validation and semantic coverage
 * @throws {MockGenError} for an invalid request or option, unreadable metadata, or a resource integrity failure
 */
export async function generateService(
    request: MockDataServiceRequest,
    options: StandaloneGenerationOptions = {}
): Promise<StandaloneGenerationResult> {
    const generator = await createMockDataGenerator();
    try {
        return await generator.generateService(request, options);
    } finally {
        await generator.dispose();
    }
}

/**
 * One-shot privacy-safe inspection using the same semantic execution; the session is disposed afterwards.
 *
 * @param request the service to inspect
 * @param options generation options
 * @param inspectionOptions what the report includes
 * @returns the versioned inspection report
 * @throws {MockGenError} for an invalid request or option, unreadable metadata, or a resource integrity failure
 */
export async function inspectService(
    request: MockDataServiceRequest,
    options: StandaloneGenerationOptions = {},
    inspectionOptions: MockDataGeneratorInspectionOptions = {}
): Promise<MockDataGeneratorInspectionV1> {
    const generator = await createMockDataGenerator();
    try {
        return await generator.inspectService(request, options, inspectionOptions);
    } finally {
        await generator.dispose();
    }
}
