import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executeModelCommand, isOwnHelpRequest } from '../../src/cli.js';
import type { VerifiedModelCache } from '../../src/model/model-cache.js';

function manifestSource(): string {
    return JSON.stringify({
        formatVersion: 1,
        bundleId: 'mockgen-cli-test',
        revision: '1'.repeat(40),
        lifecycle: 'development',
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

describe('model preparation CLI', () => {
    let directory: string;
    let manifestPath: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mockgen-cli-'));
        manifestPath = join(directory, 'model-manifest.json');
        await writeFile(manifestPath, manifestSource());
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    test('prepares a pinned manifest and reports fingerprints without cache paths or artifact URLs', async () => {
        const prepare = jest.fn(async () => readyCache());
        const result = await executeModelCommand(
            [
                'prepare',
                '--manifest',
                manifestPath,
                '--cache',
                join(directory, 'cache'),
                '--mirror',
                'https://mirror.example.invalid/models',
                '--timeout-ms',
                '120000'
            ],
            { prepare }
        );

        expect(result).toMatchObject({
            exitCode: 0,
            report: {
                command: 'prepare',
                status: 'ready',
                bundleId: 'mockgen-cli-test',
                revision: '1'.repeat(40),
                expectedBytes: 3,
                components: [
                    {
                        id: 'semantic-classifier',
                        kind: 'classifier',
                        version: '1.0.0',
                        fingerprint: 'a'.repeat(64),
                        ready: true,
                        failures: []
                    }
                ]
            }
        });
        expect(JSON.stringify(result.report)).not.toContain(directory);
        expect(JSON.stringify(result.report)).not.toContain('models.example.invalid');
        expect(prepare).toHaveBeenCalledWith(
            join(directory, 'cache'),
            expect.objectContaining({ bundleId: 'mockgen-cli-test' }),
            expect.objectContaining({
                acquisitionTimeoutMs: 120_000,
                mirrorBaseUrl: 'https://mirror.example.invalid/models'
            })
        );
    });

    test('uses the package release manifest and SAP tools cache without production path arguments', async () => {
        const cacheRoot = join(directory, 'default-cache');
        const prepare = jest.fn(async () => readyCache());

        const result = await executeModelCommand(['prepare'], {
            defaultCacheRoot: () => cacheRoot,
            defaultManifestPath: () => manifestPath,
            prepare
        } as Parameters<typeof executeModelCommand>[1]);

        expect(result.exitCode).toBe(0);
        expect(prepare).toHaveBeenCalledWith(
            cacheRoot,
            expect.objectContaining({ bundleId: 'mockgen-cli-test' }),
            expect.objectContaining({ acquisitionTimeoutMs: 1_800_000 })
        );
    });

    test('verifies offline and returns an incomplete nonzero result without exposing local paths', async () => {
        const verify = jest.fn(async (): Promise<VerifiedModelCache> =>
            Object.freeze({
                ready: false,
                files: new Map(),
                failures: Object.freeze([
                    Object.freeze({ componentId: 'semantic-classifier', role: 'encoder', reason: 'missing' as const })
                ])
            })
        );
        const result = await executeModelCommand(
            ['verify', '--manifest', manifestPath, '--cache', join(directory, 'cache')],
            { verify }
        );

        expect(result).toMatchObject({
            exitCode: 1,
            report: {
                command: 'verify',
                status: 'incomplete',
                components: [
                    {
                        id: 'semantic-classifier',
                        ready: false,
                        failures: [{ role: 'encoder', reason: 'missing' }]
                    }
                ]
            }
        });
        expect(JSON.stringify(result.report)).not.toContain(directory);
        expect(verify).toHaveBeenCalledTimes(1);
    });

    test('rejects unknown options and prepare-only options on verify', async () => {
        await expect(executeModelCommand(['prepare', '--manifest', manifestPath, '--typo'])).rejects.toThrow(
            /unknown option/i
        );
        await expect(
            executeModelCommand(['verify', '--manifest', manifestPath, '--mirror', 'https://mirror.example.invalid'])
        ).rejects.toThrow(/only valid with prepare/i);
    });
});

describe('CLI dispatch', () => {
    test('does not consume help flags that belong to the wrapped child command', () => {
        expect(isOwnHelpRequest(['start', '--', 'node', '--help'])).toBe(false);
        expect(isOwnHelpRequest(['start', '--', 'fiori', 'run', '-h'])).toBe(false);
        expect(isOwnHelpRequest(['--help'])).toBe(true);
        expect(isOwnHelpRequest(['prepare', '--help'])).toBe(true);
    });
});
