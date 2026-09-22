import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
    MockDataGenerationProgress,
    MockDataGeneratorInspectionOptions,
    MockDataGeneratorInspectionV1,
    MockDataGeneratorOptions,
    MockDataGeneratorResult,
    MockDataServiceRequest
} from './types.js';
import type { ModelManifest, ModelOutputFormat } from './model/manifest.js';
import type { LearnedRuntimeHandle } from './model/learned-runtime.js';
import type { VerifiedModelArtifacts } from './model/runtime-artifacts.js';
import {
    parsePackagedModelManifest,
    assertPackagedClassifierHead,
    verifyPackagedDatasets,
    verifyPackagedModels,
    type PackagedModelManifest
} from './model/packaged-models.js';
import { createLearnedRuntime, generateService, inspectService, validateGeneratedResult } from './index.js';
import { parseEdmx } from './schema/edmx.js';
import { parseCsn } from './schema/csn.js';
import { semanticRoleDefinition } from './semantics/role-registry.js';
import { authoredDomainValues } from './generation/value-list-context.js';

const require = createRequire(import.meta.url);
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const resourceRoot = join(packageRoot, 'resources', 'models');
const manifestPath = join(resourceRoot, 'manifest.json');

export interface MockDataGeneratorInfo {
    apiVersion: 2;
    realismReady: true;
    model: Readonly<{ bundleId: string; revision: string; classifier: string; sft: string }>;
    runtime: Readonly<{ package: 'onnxruntime-node'; version: string }>;
}

export interface StandaloneGenerationResult extends MockDataGeneratorResult {
    realismReady: true;
    executionMode: 'learned' | 'hybrid' | 'deterministic';
    validation: Readonly<{
        passed: boolean;
        formats: boolean;
        relationships: boolean;
        domainMeaning: 'evidence-verified' | 'synthetic-unverified' | 'unsupported' | 'not-applicable';
    }>;
    semanticCoverage: Readonly<{
        eligibleFields: number;
        routedFields: number;
        formatValidatedFields: number;
        structuralOnlyFields: number;
        unsupportedFields: number;
        evidenceVerifiedFields: number;
        syntheticUnverifiedFields: number;
    }>;
    modelRevision: string;
}

export type StandaloneGenerationOptions = Omit<MockDataGeneratorOptions, 'pipeline'>;

export interface MockDataGenerator {
    generateService(
        request: MockDataServiceRequest,
        options?: StandaloneGenerationOptions
    ): Promise<StandaloneGenerationResult>;
    inspectService(
        request: MockDataServiceRequest,
        options?: StandaloneGenerationOptions,
        inspectionOptions?: MockDataGeneratorInspectionOptions
    ): Promise<MockDataGeneratorInspectionV1>;
    dispose(): Promise<void>;
}

export interface CreateMockDataGeneratorOptions {
    executionMode?: 'api' | 'data-editor' | 'start-mock';
    onProgress?: (event: MockDataGenerationProgress) => void;
}

function readManifest(): PackagedModelManifest {
    return parsePackagedModelManifest(JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown);
}

/** Return immutable package and model identity without allocating a native runtime. */
export function getMockDataGeneratorInfo(): MockDataGeneratorInfo {
    const manifest = readManifest();
    const classifier = manifest.components.find((component) => component.kind === 'classifier');
    const sft = manifest.components.find((component) => component.kind === 'sft');
    if (!classifier || !sft) {
        throw new TypeError('The packaged model manifest requires classifier and SFT components');
    }
    return Object.freeze({
        apiVersion: 2,
        realismReady: true,
        model: Object.freeze({
            bundleId: manifest.bundleId,
            revision: manifest.revision,
            classifier: classifier.fingerprint,
            sft: sft.fingerprint
        }),
        runtime: manifest.runtime
    });
}

function classifierOutputFormat(inputFormat: string): ModelOutputFormat {
    if (inputFormat === 'v3') {
        return 'embedding-classifier-v3';
    }
    if (inputFormat === 'v2') {
        return 'embedding-classifier-v2';
    }
    throw new TypeError('Unsupported packaged classifier input format');
}

export function packagedRuntimeManifest(manifest: PackagedModelManifest): ModelManifest {
    return {
        formatVersion: 1,
        bundleId: manifest.bundleId,
        revision: manifest.revision,
        lifecycle: 'development',
        runtimes: [],
        components: manifest.components.map((component) => ({
            id: component.id,
            kind: component.kind,
            version: component.version,
            fingerprint: component.fingerprint,
            files: component.files,
            runtime: {
                backend: 'onnx',
                package: 'onnxruntime-node',
                version: manifest.runtime.version,
                inputs: component.contract.inputs,
                outputs: component.contract.outputs,
                outputFormat:
                    component.kind === 'classifier'
                        ? classifierOutputFormat(component.contract.inputFormat)
                        : 'row-object-v1'
            },
            license: { name: component.license, url: 'https://www.apache.org/licenses/LICENSE-2.0' },
            modelCardUrl: component.modelCard
        }))
    };
}

/**
 * Classify actual learned participation without hiding a degraded classifier tier.
 *
 * @param result
 * @param mode
 */
export function actualExecutionMode(
    result: MockDataGeneratorResult,
    mode: MockDataGeneratorOptions['mode']
): StandaloneGenerationResult['executionMode'] {
    const { eligibleSlots, acceptedSlots } = result.statistics.sft;
    if (
        mode === 'deterministic' ||
        (result.capabilities.classifier !== 'ready' && result.capabilities.sft !== 'ready') ||
        (acceptedSlots === 0 && result.routing?.classifierAccepted === 0)
    ) {
        return 'deterministic';
    }
    return result.capabilities.classifier === 'ready' &&
        result.capabilities.sft === 'ready' &&
        acceptedSlots > 0 &&
        acceptedSlots === eligibleSlots
        ? 'learned'
        : 'hybrid';
}

function semanticCoverage(
    request: MockDataServiceRequest,
    result: MockDataGeneratorResult
): StandaloneGenerationResult['semanticCoverage'] {
    const graph =
        request.metadata.format === 'edmx' ? parseEdmx(request.metadata.content) : parseCsn(request.metadata.content);
    const targets = new Set(request.targets.map(({ name }) => name));
    let eligibleFields = 0;
    let routedFields = 0;
    let formatValidatedFields = 0;
    let structuralOnlyFields = 0;
    let evidenceVerifiedFields = 0;
    let syntheticUnverifiedFields = 0;
    const hasEvidence = (
        entity: (typeof graph.entities)[number],
        property: (typeof entity.properties)[number]
    ): boolean => {
        const rows = result.resources[entity.entitySetName] ?? [];
        if (rows.length === 0) {
            return false;
        }
        const allowed = [
            ...(property.enumValues ?? []),
            ...authoredDomainValues(graph, entity, property, request.existingData)
        ];
        return rows.every((row) => {
            const value = row[property.name];
            return allowed.some((candidate) => candidate === value);
        });
    };
    const sftFields = new Set(
        result.statistics.sft.assignments.flatMap(({ resource, fields }) =>
            fields.filter(({ acceptedSlots }) => acceptedSlots > 0).map(({ name }) => `${resource}.${name}`)
        )
    );
    for (const entity of graph.entities) {
        if (!targets.has(entity.entitySetName)) {
            continue;
        }
        for (const property of entity.properties) {
            eligibleFields++;
            const evidenceVerified = hasEvidence(entity, property);
            if (evidenceVerified) {
                evidenceVerifiedFields++;
            }
            const role = result.semanticRoles?.[`${entity.entitySetName}.${property.name}`];
            if (!role) {
                if (!evidenceVerified && sftFields.has(`${entity.entitySetName}.${property.name}`)) {
                    syntheticUnverifiedFields++;
                }
                continue;
            }
            const definition = semanticRoleDefinition(role);
            if (!definition) {
                continue;
            }
            routedFields++;
            if (!evidenceVerified) {
                syntheticUnverifiedFields++;
            }
            if (definition.validator === 'structural') {
                structuralOnlyFields++;
            } else if ((result.resources[entity.entitySetName]?.length ?? 0) > 0) {
                // validateGeneratedResult has checked every generated value against this validator.
                formatValidatedFields++;
            }
        }
    }
    return Object.freeze({
        eligibleFields,
        routedFields,
        formatValidatedFields,
        structuralOnlyFields,
        unsupportedFields: eligibleFields - routedFields,
        evidenceVerifiedFields,
        syntheticUnverifiedFields
    });
}

function domainMeaning(
    coverage: StandaloneGenerationResult['semanticCoverage']
): StandaloneGenerationResult['validation']['domainMeaning'] {
    if (coverage.syntheticUnverifiedFields > 0) {
        return 'synthetic-unverified';
    }
    if (coverage.unsupportedFields > 0) {
        return 'unsupported';
    }
    if (coverage.evidenceVerifiedFields > 0) {
        return 'evidence-verified';
    }
    return 'not-applicable';
}

/**
 * Verify package-local models before allocation and create one reusable generation session.
 *
 * @param options
 */
export async function createMockDataGenerator(
    options: CreateMockDataGeneratorOptions = {}
): Promise<MockDataGenerator> {
    if (options.executionMode !== undefined && !['api', 'data-editor', 'start-mock'].includes(options.executionMode)) {
        throw new TypeError('Unsupported MockGen execution mode');
    }
    const manifest = parsePackagedModelManifest(JSON.parse(await readFile(manifestPath, 'utf8')) as unknown);
    if (manifest.datasets.length < 2) {
        throw new TypeError('The installed MockGen package lacks versioned sample datasets');
    }
    const datasetFailures = await verifyPackagedDatasets(packageRoot, manifest);
    if (datasetFailures.length > 0) {
        throw new TypeError(
            `The installed MockGen datasets are corrupt: ${datasetFailures.map(({ id }) => id).join(', ')}`
        );
    }
    const verification = await verifyPackagedModels(resourceRoot, manifest);
    if (!verification.ready) {
        throw new TypeError(
            `The installed MockGen package has missing or corrupt model artifacts: ${verification.failures
                .map(({ componentId, role, reason }) => `${componentId}/${role}:${reason}`)
                .join(', ')}`
        );
    }
    const classifierComponent = manifest.components.find(({ kind }) => kind === 'classifier');
    const classifierHeadPath =
        classifierComponent && verification.files.get(classifierComponent.id)?.get('classifier-head');
    if (!classifierComponent || !classifierHeadPath) {
        throw new TypeError('The packaged classifier head is missing');
    }
    assertPackagedClassifierHead(
        JSON.parse(await readFile(classifierHeadPath, 'utf8')) as unknown,
        classifierComponent.contract.inputFormat
    );
    const runtimeVersion = (require('onnxruntime-node/package.json') as { version: string }).version;
    if (runtimeVersion !== manifest.runtime.version) {
        throw new TypeError(`MockGen requires onnxruntime-node ${manifest.runtime.version}; found ${runtimeVersion}`);
    }
    const cache: VerifiedModelArtifacts = Object.freeze({
        ready: true,
        files: verification.files,
        failures: Object.freeze([])
    });
    let learned: LearnedRuntimeHandle | undefined;
    let disposed = false;
    async function runtime(mode: MockDataGeneratorOptions['mode']): Promise<LearnedRuntimeHandle['runtime']> {
        if (mode === 'deterministic') {
            return {};
        }
        learned ??= await createLearnedRuntime(packagedRuntimeManifest(manifest), cache);
        return learned.runtime;
    }
    function assertActive(): void {
        if (disposed) {
            throw new Error('MockGen session has been disposed');
        }
    }
    return Object.freeze({
        generateService: async (
            request: MockDataServiceRequest,
            generationOptions: StandaloneGenerationOptions = {}
        ): Promise<StandaloneGenerationResult> => {
            assertActive();
            request.signal?.throwIfAborted();
            const mode = generationOptions.mode ?? 'auto';
            const result = await generateService(
                request,
                { ...generationOptions, pipeline: 'semantic-v2' },
                {
                    ...(await runtime(mode)),
                    ...(options.onProgress ? { onProgress: options.onProgress } : {})
                }
            );
            validateGeneratedResult(request, result, { ...generationOptions, pipeline: 'semantic-v2' });
            const formats = !result.diagnostics.some(({ severity }) => severity === 'error');
            const coverage = semanticCoverage(request, result);
            return Object.freeze({
                ...result,
                realismReady: true,
                executionMode: actualExecutionMode(result, mode),
                validation: Object.freeze({
                    passed: formats,
                    formats,
                    relationships: true,
                    domainMeaning: domainMeaning(coverage)
                }),
                semanticCoverage: coverage,
                modelRevision: manifest.revision
            });
        },
        inspectService: async (
            request: MockDataServiceRequest,
            generationOptions: StandaloneGenerationOptions = {},
            inspectionOptions: MockDataGeneratorInspectionOptions = {}
        ): Promise<MockDataGeneratorInspectionV1> => {
            assertActive();
            return inspectService(
                request,
                { ...generationOptions, pipeline: 'semantic-v2' },
                {
                    ...(await runtime(generationOptions.mode ?? 'auto')),
                    ...(options.onProgress ? { onProgress: options.onProgress } : {})
                },
                inspectionOptions
            );
        },
        dispose: async (): Promise<void> => {
            if (!disposed) {
                disposed = true;
                await learned?.dispose();
            }
        }
    });
}
