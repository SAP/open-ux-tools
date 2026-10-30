import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as engine from '../../src/index.js';
import type { LearnedRuntimeHandle } from '../../src/model/learned-runtime.js';
import type { MockDataServiceRequest } from '../../src/types.js';
import { mockStandaloneModelResources } from './synthetic-standalone-models.js';

const modelResources = await mockStandaloneModelResources();
const createLearnedRuntime = jest.fn<typeof engine.createLearnedRuntime>();
jest.unstable_mockModule(fileURLToPath(new URL('../../src/index.ts', import.meta.url)), () => ({
    ...engine,
    createLearnedRuntime
}));
const { createMockDataGenerator } = await import('../../src/standalone.js');
afterAll(modelResources.dispose);

const request: MockDataServiceRequest = {
    metadata: {
        format: 'edmx',
        content: `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
    <EntityType Name="Record"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
    </EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`
    },
    service: { urlPath: '/records', odataVersion: '4.0' },
    targets: [{ name: 'Records', kind: 'entity-set' }],
    existingData: {}
};

function deferredHandle(diagnostics: LearnedRuntimeHandle['diagnostics'] = []): {
    handle: LearnedRuntimeHandle & { dispose: jest.Mock };
    resolve: () => void;
} {
    const handle = { runtime: {}, diagnostics, dispose: jest.fn(async () => undefined) };
    let resolve: () => void = () => undefined;
    createLearnedRuntime.mockImplementationOnce(
        () =>
            new Promise((done) => {
                resolve = () => done(handle);
            })
    );
    return { handle, resolve: () => resolve() };
}

async function untilLoadStarts(): Promise<void> {
    for (let attempt = 0; attempt < 200 && createLearnedRuntime.mock.calls.length === 0; attempt++) {
        await new Promise((next) => setImmediate(next));
    }
}

beforeEach(() => {
    createLearnedRuntime.mockReset();
});

describe('MockGen session runtime lifecycle', () => {
    it('loads the learned runtime once for concurrent requests', async () => {
        // Given a session whose runtime load is still pending
        const generator = await createMockDataGenerator();
        const load = deferredHandle();
        // When two requests start before the load finishes
        const first = generator.generateService(request, { seed: 1, rowsPerEntity: 1 });
        const second = generator.generateService(request, { seed: 2, rowsPerEntity: 1 });
        await untilLoadStarts();
        load.resolve();
        await Promise.all([first, second]);
        // Then exactly one runtime was loaded and it is released once on dispose
        expect(createLearnedRuntime).toHaveBeenCalledTimes(1);
        await generator.dispose();
        expect(load.handle.dispose).toHaveBeenCalledTimes(1);
    });

    it('releases a runtime that finishes loading after dispose and stops the waiting request', async () => {
        // Given a request waiting on the runtime load
        const generator = await createMockDataGenerator();
        const load = deferredHandle();
        const pending = generator.generateService(request, { seed: 1, rowsPerEntity: 1 });
        await untilLoadStarts();
        // When the session is disposed before the load completes
        const disposed = generator.dispose();
        load.resolve();
        await disposed;
        // Then the late runtime is released and the request fails as disposed
        expect(load.handle.dispose).toHaveBeenCalledTimes(1);
        await expect(pending).rejects.toThrow(/disposed/);
    });

    it('reports learned runtime load failures as warnings with their cause', async () => {
        // Given a runtime whose classifier and SFT failed to load
        const generator = await createMockDataGenerator();
        createLearnedRuntime.mockResolvedValueOnce({
            runtime: {},
            diagnostics: [
                {
                    code: 'CLASSIFIER_RUNTIME_UNAVAILABLE',
                    componentId: 'synthetic-classifier',
                    message: 'The classifier runtime is unavailable; lower tiers remain active.',
                    cause: `Protobuf parsing failed for ${join(process.cwd(), 'resources', 'models', 'encoder.onnx')}`
                }
            ],
            dispose: async () => undefined
        });
        try {
            // When a request runs in auto mode
            const result = await generator.generateService(request, { seed: 1, rowsPerEntity: 1 });
            // Then the failure is visible to the caller without failing validation or disclosing the install path
            expect(result.diagnostics).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        code: 'CLASSIFIER_RUNTIME_UNAVAILABLE',
                        severity: 'warning',
                        message: expect.stringContaining('Protobuf parsing failed')
                    })
                ])
            );
            expect(JSON.stringify(result.diagnostics)).not.toContain(process.cwd());
            expect(result.validation.passed).toBe(true);
            // And inspection reports the same diagnostic
            const inspection = await generator.inspectService(request, { seed: 1, rowsPerEntity: 1 });
            expect(inspection.diagnostics).toEqual(
                expect.arrayContaining([expect.objectContaining({ code: 'CLASSIFIER_RUNTIME_UNAVAILABLE' })])
            );
        } finally {
            await generator.dispose();
        }
    });

    it('neither verifies model artifacts nor reports runtime diagnostics in deterministic mode', async () => {
        // Given a fresh session
        modelResources.verifyPackagedModels.mockClear();
        const generator = await createMockDataGenerator();
        try {
            // When it generates deterministically
            const result = await generator.generateService(request, {
                mode: 'deterministic',
                seed: 1,
                rowsPerEntity: 1
            });
            // Then no model artifact was hashed and no runtime was loaded
            expect(modelResources.verifyPackagedModels).not.toHaveBeenCalled();
            expect(createLearnedRuntime).not.toHaveBeenCalled();
            expect(result.diagnostics.some(({ code }) => code.endsWith('_RUNTIME_UNAVAILABLE'))).toBe(false);
        } finally {
            await generator.dispose();
        }
    });

    it('retries a runtime load that failed instead of keeping the failure', async () => {
        // Given a session whose first runtime load fails
        const generator = await createMockDataGenerator();
        createLearnedRuntime
            .mockRejectedValueOnce(new Error('transient read failure'))
            .mockResolvedValueOnce({ runtime: {}, diagnostics: [], dispose: async () => undefined });
        try {
            // When two requests run one after the other
            await expect(generator.generateService(request, { seed: 1, rowsPerEntity: 1 })).rejects.toThrow(
                'transient read failure'
            );
            const result = await generator.generateService(request, { seed: 1, rowsPerEntity: 1 });
            // Then the second request loads the runtime again and succeeds
            expect(result.resources.Records).toHaveLength(1);
            expect(createLearnedRuntime).toHaveBeenCalledTimes(2);
        } finally {
            await generator.dispose();
        }
    });

    it('verifies model artifacts once per process across sessions', async () => {
        // Given two sessions that both load the learned runtime
        modelResources.verifyPackagedModels.mockClear();
        createLearnedRuntime.mockResolvedValue({ runtime: {}, diagnostics: [], dispose: async () => undefined });
        for (const seed of [1, 2]) {
            const generator = await createMockDataGenerator();
            // When each generates in auto mode
            await generator.generateService(request, { seed, rowsPerEntity: 1 });
            await generator.dispose();
        }
        // Then the artifacts were hashed at most once
        expect(modelResources.verifyPackagedModels.mock.calls.length).toBeLessThanOrEqual(1);
    });
});
