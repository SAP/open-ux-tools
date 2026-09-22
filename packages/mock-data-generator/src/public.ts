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
export type {
    CreateMockDataGeneratorOptions,
    MockDataGenerator,
    MockDataGeneratorInfo,
    StandaloneGenerationOptions,
    StandaloneGenerationResult
} from './standalone.js';
export type { GenerateProjectDataInput, GeneratedProjectData } from './project-data.js';
export type {
    MockDataServiceRequest,
    MockDataGeneratorInspectionOptions,
    MockDataGeneratorInspectionV1,
    SyntheticScenario,
    SyntheticSampleDataset
} from './types.js';

/**
 * One-shot generation using only the semantic planner and bundled verified models.
 *
 * @param request
 * @param options
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
 * One-shot privacy-safe inspection using the same semantic execution.
 *
 * @param request
 * @param options
 * @param inspectionOptions
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
