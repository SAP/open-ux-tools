import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, test } from '@jest/globals';
import * as candidateHelpers from '../../../../../scripts/mockserver-data-generator-evaluation/lib/realism-candidate.mjs';

const SCRIPT = fileURLToPath(
    new URL('../../../../../scripts/mockserver-data-generator-evaluation/prepare-realism-campaign.mjs', import.meta.url)
);

/**
 * Hash a test fixture exactly as the production evidence helper does.
 *
 * @param value Fixture content.
 * @returns Lowercase SHA-256.
 */
function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

describe('production-bound realism candidate', () => {
    test('can be imported for contract testing without executing the campaign', () => {
        const result = spawnSync(
            process.execPath,
            ['--input-type=module', '--eval', `await import(${JSON.stringify(pathToFileURL(SCRIPT).href)})`],
            { encoding: 'utf8' }
        );

        expect(result).toMatchObject({ status: 0, stderr: '' });
    });

    test('parses complete export and compile commands without accepting ambiguous values', () => {
        const candidateApi = candidateHelpers as unknown as {
            parseRealismCampaignArguments?: (args: string[]) => Record<string, unknown>;
        };
        expect(candidateApi.parseRealismCampaignArguments).toEqual(expect.any(Function));
        if (!candidateApi.parseRealismCampaignArguments) {
            return;
        }
        const root = join(tmpdir(), 'mockserver-data-generator-realism-arguments');
        expect(
            candidateApi.parseRealismCampaignArguments([
                '--',
                '--export',
                '--pilot-root',
                join(root, 'pilot'),
                '--model-manifest',
                join(root, 'model-manifest.json'),
                '--model-cache',
                join(root, 'cache'),
                '--out',
                join(root, 'evidence.json'),
                '--campaign-manifest-out',
                join(root, 'campaign.json'),
                '--seed',
                '113'
            ])
        ).toEqual({
            mode: 'export',
            pilotRoot: join(root, 'pilot'),
            modelManifest: join(root, 'model-manifest.json'),
            modelCache: join(root, 'cache'),
            output: join(root, 'evidence.json'),
            manifest: join(root, 'campaign.json'),
            seed: 113
        });
        expect(
            candidateApi.parseRealismCampaignArguments([
                '--compile',
                '--pilot-root',
                join(root, 'pilot'),
                '--evidence',
                join(root, 'evidence.json'),
                '--provider-artifact',
                join(root, 'provider-a.json'),
                '--provider-artifact',
                join(root, 'provider-b.json'),
                '--out',
                join(root, 'consensus.json')
            ])
        ).toEqual({
            mode: 'compile',
            pilotRoot: join(root, 'pilot'),
            evidence: join(root, 'evidence.json'),
            providers: [join(root, 'provider-a.json'), join(root, 'provider-b.json')],
            output: join(root, 'consensus.json')
        });
        expect(() =>
            candidateApi.parseRealismCampaignArguments?.([
                '--export',
                '--pilot-root',
                join(root, 'pilot'),
                '--model-manifest',
                'relative-manifest.json',
                '--model-cache',
                join(root, 'cache'),
                '--out',
                join(root, 'evidence.json'),
                '--campaign-manifest-out',
                join(root, 'campaign.json')
            ])
        ).toThrow('--model-manifest must be an absolute path');
        expect(() =>
            candidateApi.parseRealismCampaignArguments?.([
                '--export',
                '--pilot-root',
                join(root, 'pilot'),
                '--model-manifest',
                join(root, 'model-manifest.json'),
                '--model-cache',
                join(root, 'cache'),
                '--out',
                join(root, 'evidence.json'),
                '--campaign-manifest-out',
                join(root, 'campaign.json'),
                '--seed',
                '7junk'
            ])
        ).toThrow('--seed must be a safe integer');
        expect(() =>
            candidateApi.parseRealismCampaignArguments?.([
                '--compile',
                '--pilot-root',
                join(root, 'pilot'),
                '--evidence',
                join(root, 'evidence.json'),
                '--provider-artifact',
                join(root, 'provider-a.json'),
                '--provider-artifact',
                join(root, 'provider-b.json'),
                '--out',
                join(root, 'first.json'),
                '--out',
                join(root, 'second.json')
            ])
        ).toThrow('Duplicate argument: --out');
        expect(() =>
            candidateApi.parseRealismCampaignArguments?.([
                '--compile',
                '--pilot-root',
                join(root, 'pilot'),
                '--evidence',
                join(root, 'evidence.json'),
                '--provider-artifact',
                join(root, 'provider-a.json'),
                '--provider-artifact',
                join(root, 'provider-b.json'),
                '--out',
                join(root, 'consensus.json'),
                '--unexpected',
                'value'
            ])
        ).toThrow('Unknown argument: --unexpected');
    });

    test('requires an explicit production model manifest before reading pilot evidence', () => {
        const root = join(tmpdir(), 'mockserver-data-generator-realism-missing-model');
        const result = spawnSync(
            process.execPath,
            [
                SCRIPT,
                '--export',
                '--pilot-root',
                join(root, 'pilot'),
                '--model-cache',
                join(root, 'cache'),
                '--out',
                join(root, 'evidence.json'),
                '--campaign-manifest-out',
                join(root, 'campaign.json')
            ],
            { encoding: 'utf8' }
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('--model-manifest must be an absolute path');
    });

    test('binds the complete verified model and its consumed generation configuration without local locators', async () => {
        const candidateApi = candidateHelpers as unknown as {
            createVerifiedModelBinding?: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
            loadVerifiedProductionCandidate?: (options: Record<string, unknown>) => Promise<{
                manifest: Record<string, unknown>;
                binding: Record<string, unknown>;
                learned: Record<string, unknown>;
            }>;
        };
        expect(candidateApi.createVerifiedModelBinding).toEqual(expect.any(Function));
        if (!candidateApi.createVerifiedModelBinding) {
            return;
        }
        const root = mkdtempSync(join(tmpdir(), 'mockserver-data-generator-realism-binding-'));
        try {
            const generationConfig = {
                numHiddenLayers: 30,
                numKeyValueHeads: 3,
                hiddenSize: 576,
                numAttentionHeads: 9,
                samplingOptions: {
                    temperature: 0.6,
                    topP: 0.9,
                    repetitionPenalty: 1.15,
                    noRepeatNgramSize: 4,
                    maxNewTokens: 300
                }
            };
            const generationConfigSource = `${JSON.stringify(generationConfig, null, 2)}\n`;
            const generationConfigPath = join(root, 'generation-config.json');
            writeFileSync(generationConfigPath, generationConfigSource);
            const manifest = {
                formatVersion: 1,
                bundleId: 'production-candidate',
                revision: '1'.repeat(64),
                lifecycle: 'development',
                components: [
                    {
                        id: 'classifier',
                        kind: 'classifier',
                        version: 'classifier-v1',
                        fingerprint: '2'.repeat(64),
                        files: [
                            {
                                role: 'encoder',
                                path: 'classifier/encoder.onnx',
                                bytes: 10,
                                sha256: '3'.repeat(64),
                                url: 'https://models.example/classifier/encoder.onnx'
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
                        license: { name: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' },
                        modelCardUrl: 'https://models.example/classifier/card'
                    },
                    {
                        id: 'sft',
                        kind: 'sft',
                        version: 'sft-v1',
                        fingerprint: '4'.repeat(64),
                        files: [
                            {
                                role: 'model',
                                path: 'sft/model.onnx',
                                bytes: 20,
                                sha256: '5'.repeat(64),
                                url: 'https://models.example/sft/model.onnx'
                            },
                            {
                                role: 'generation-config',
                                path: 'sft/generation-config.json',
                                bytes: Buffer.byteLength(generationConfigSource),
                                sha256: sha256(generationConfigSource),
                                url: 'https://models.example/sft/generation-config.json'
                            }
                        ],
                        runtime: {
                            backend: 'onnx',
                            package: 'onnxruntime-node',
                            version: '1.24.3',
                            inputs: ['input_ids'],
                            outputs: ['logits'],
                            outputFormat: 'row-object-v1'
                        },
                        license: { name: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' },
                        modelCardUrl: 'https://models.example/sft/card'
                    }
                ]
            };
            const manifestSource = `${JSON.stringify(manifest, null, 2)}\n`;
            const manifestPath = join(root, 'model-manifest.json');
            writeFileSync(manifestPath, manifestSource);
            const cache = {
                ready: true,
                files: new Map([
                    ['classifier', new Map([['encoder', join(root, 'encoder.onnx')]])],
                    [
                        'sft',
                        new Map([
                            ['model', join(root, 'model.onnx')],
                            ['generation-config', generationConfigPath]
                        ])
                    ]
                ]),
                failures: []
            };

            const binding = await candidateApi.createVerifiedModelBinding({
                manifestPath,
                manifestSource,
                manifest,
                cache
            });

            expect(binding).toMatchObject({
                manifest: {
                    filename: 'model-manifest.json',
                    bytes: Buffer.byteLength(manifestSource),
                    sha256: sha256(manifestSource),
                    bundleId: 'production-candidate',
                    revision: '1'.repeat(64),
                    lifecycle: 'development'
                },
                components: {
                    classifier: { id: 'classifier', fingerprint: '2'.repeat(64) },
                    sft: { id: 'sft', fingerprint: '4'.repeat(64) }
                },
                generationConfig: {
                    bytes: Buffer.byteLength(generationConfigSource),
                    sha256: sha256(generationConfigSource),
                    configuration: generationConfig
                }
            });
            expect(binding.artifacts).toHaveLength(3);
            expect(JSON.stringify(binding)).not.toContain(root);
            expect(JSON.stringify(binding)).not.toContain('https://models.example');

            expect(candidateApi.loadVerifiedProductionCandidate).toEqual(expect.any(Function));
            if (!candidateApi.loadVerifiedProductionCandidate) {
                return;
            }
            const operations: string[] = [];
            const learned = {
                runtime: { classifier: {}, sft: {} },
                diagnostics: [],
                dispose: async (): Promise<undefined> => undefined
            };
            const loaded = await candidateApi.loadVerifiedProductionCandidate({
                generator: {
                    parseModelManifest: (value: Record<string, unknown>) => {
                        operations.push('parse');
                        expect(value).toEqual(manifest);
                        return manifest;
                    },
                    verifyModelCache: async (cacheRoot: string, parsedManifest: Record<string, unknown>) => {
                        operations.push('verify');
                        expect(cacheRoot).toBe(join(root, 'cache'));
                        expect(parsedManifest).toBe(manifest);
                        return cache;
                    },
                    createLearnedRuntime: async (
                        parsedManifest: Record<string, unknown>,
                        verifiedCache: Record<string, unknown>
                    ) => {
                        operations.push('load');
                        expect(parsedManifest).toBe(manifest);
                        expect(verifiedCache).toBe(cache);
                        return learned;
                    }
                },
                manifestPath,
                cacheRoot: join(root, 'cache')
            });
            expect(operations).toEqual(['parse', 'verify', 'load']);
            expect(loaded.manifest).toBe(manifest);
            expect(loaded.learned).toBe(learned);
            expect(loaded.binding).toMatchObject({
                generationConfig: { configuration: { samplingOptions: { maxNewTokens: 300 } } }
            });

            await expect(
                candidateApi.createVerifiedModelBinding({
                    manifestPath,
                    manifestSource,
                    manifest,
                    cache: { ...cache, ready: false }
                })
            ).rejects.toThrow('complete checksum-verified model cache');
            await expect(
                candidateApi.createVerifiedModelBinding({
                    manifestPath,
                    manifestSource,
                    manifest: {
                        ...manifest,
                        components: manifest.components.filter(({ kind }) => kind !== 'classifier')
                    },
                    cache
                })
            ).rejects.toThrow('requires a classifier model component');
            await expect(
                candidateApi.createVerifiedModelBinding({
                    manifestPath,
                    manifestSource,
                    manifest: { ...manifest, components: manifest.components.filter(({ kind }) => kind !== 'sft') },
                    cache
                })
            ).rejects.toThrow('requires a sft model component');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('rejects partial or degraded learned runtimes before realism generation', () => {
        const candidateApi = candidateHelpers as unknown as {
            assertCompleteLearnedRuntime?: (learned: Record<string, unknown>) => void;
        };
        expect(candidateApi.assertCompleteLearnedRuntime).toEqual(expect.any(Function));
        if (!candidateApi.assertCompleteLearnedRuntime) {
            return;
        }

        expect(() =>
            candidateApi.assertCompleteLearnedRuntime?.({
                runtime: { classifier: {}, sft: {} },
                diagnostics: []
            })
        ).not.toThrow();
        expect(() =>
            candidateApi.assertCompleteLearnedRuntime?.({ runtime: { classifier: {} }, diagnostics: [] })
        ).toThrow('both classifier and SFT runtimes');
        expect(() =>
            candidateApi.assertCompleteLearnedRuntime?.({
                runtime: { classifier: {}, sft: {} },
                diagnostics: [{ code: 'SFT_RUNTIME_UNAVAILABLE' }]
            })
        ).toThrow('without degradation diagnostics');
    });
});
