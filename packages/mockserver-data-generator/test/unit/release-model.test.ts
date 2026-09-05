import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareDefaultModelArtifacts } from '../../src/model/release.js';
import type { VerifiedModelCache } from '../../src/model/model-cache.js';

function manifestSource(): string {
    return JSON.stringify({
        formatVersion: 1,
        bundleId: 'mockgen-release-test',
        revision: '1'.repeat(40),
        lifecycle: 'preview',
        components: [
            {
                id: 'semantic-classifier',
                kind: 'classifier',
                version: '1.0.0',
                fingerprint: 'a'.repeat(64),
                files: [
                    {
                        role: 'encoder',
                        path: 'classifier/model.onnx',
                        bytes: 3,
                        sha256: 'b'.repeat(64),
                        url: `https://models.example.invalid/${'1'.repeat(40)}/model.onnx`
                    }
                ],
                runtime: {
                    backend: 'onnx',
                    package: 'onnxruntime-node',
                    version: '1.24.3',
                    inputs: ['input_ids'],
                    outputs: ['last_hidden_state'],
                    outputFormat: 'embedding-classifier-v2'
                },
                license: { name: 'Apache-2.0', url: 'https://example.invalid/license' },
                modelCardUrl: 'https://example.invalid/model-card'
            }
        ]
    });
}

function readyCache(): VerifiedModelCache {
    return Object.freeze({
        ready: true,
        files: new Map([['semantic-classifier', new Map([['encoder', '/private/cache/model.onnx']])]]),
        failures: Object.freeze([])
    });
}

describe('default release model acquisition', () => {
    let directory: string;
    let manifestPath: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mockgen-release-model-'));
        manifestPath = join(directory, 'model-manifest.json');
        await writeFile(manifestPath, manifestSource());
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    test('prepares the packaged immutable manifest with the five-minute launcher deadline', async () => {
        const cacheRoot = join(directory, 'cache');
        const prepare = jest.fn(async () => readyCache());
        const onStatus = jest.fn();

        const prepared = await prepareDefaultModelArtifacts({
            manifestPath,
            cacheRoot,
            onStatus,
            prepare,
            verify: async () => Object.freeze({ ready: false, files: new Map(), failures: Object.freeze([]) })
        });

        expect(prepared).toEqual({ manifestPath, cacheRoot });
        expect(onStatus.mock.calls).toEqual([
            ['MOCKGEN_MODEL_CACHE_CHECKING'],
            ['MOCKGEN_MODEL_ACQUISITION_STARTED'],
            ['MOCKGEN_MODEL_CACHE_READY']
        ]);
        expect(prepare).toHaveBeenCalledWith(
            cacheRoot,
            expect.objectContaining({
                bundleId: 'mockgen-release-test',
                lifecycle: 'preview',
                revision: '1'.repeat(40)
            }),
            { acquisitionTimeoutMs: 300_000 }
        );
    });

    test('uses a verified warm cache without entering acquisition', async () => {
        const cacheRoot = join(directory, 'cache');
        const onStatus = jest.fn();
        const prepare = jest.fn(async () => readyCache());

        await expect(
            prepareDefaultModelArtifacts({
                manifestPath,
                cacheRoot,
                onStatus,
                prepare,
                verify: async () => readyCache()
            })
        ).resolves.toEqual({ manifestPath, cacheRoot });

        expect(prepare).not.toHaveBeenCalled();
        expect(onStatus.mock.calls).toEqual([['MOCKGEN_MODEL_CACHE_CHECKING'], ['MOCKGEN_MODEL_CACHE_READY']]);
    });

    test('rejects an incomplete cache result instead of handing partial files to Fiori', async () => {
        await expect(
            prepareDefaultModelArtifacts({
                manifestPath,
                cacheRoot: join(directory, 'cache'),
                prepare: async () => Object.freeze({ ready: false, files: new Map(), failures: Object.freeze([]) })
            })
        ).rejects.toThrow('release model artifacts did not pass verification');
    });

    test('reports no selected release model when the unpublished package has no built-in manifest', async () => {
        await expect(
            prepareDefaultModelArtifacts({
                manifestPath: join(directory, 'missing-model-manifest.json'),
                cacheRoot: join(directory, 'cache')
            })
        ).resolves.toBeUndefined();
    });
});
