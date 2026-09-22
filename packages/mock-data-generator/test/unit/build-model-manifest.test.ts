import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const scriptUrl = pathToFileURL(resolve(process.cwd(), 'scripts', 'build-model-manifest.mjs')).href;
const sha = (value: string): string => createHash('sha256').update(value).digest('hex');

describe('build-model-manifest', () => {
    const template = {
        formatVersion: 1,
        bundleId: 'bundle',
        revision: 'a'.repeat(64),
        runtime: { package: 'onnxruntime-node', version: '1.24.3' },
        provenance: { reviewStatus: 'development' },
        datasets: [
            {
                id: 'd',
                version: '1',
                path: 'resources/datasets/d.json',
                bytes: 1,
                sha256: 'b'.repeat(64),
                license: 'Apache-2.0',
                provenance: 'x'
            }
        ],
        components: [
            {
                id: 'semantic-classifier',
                kind: 'classifier',
                version: 'v',
                fingerprint: 'c'.repeat(64),
                license: 'Apache-2.0',
                modelCard: 'https://x',
                contract: { inputFormat: 'v2', inputs: [], outputs: [] },
                files: [
                    { role: 'encoder', path: 'classifier/encoder.onnx', bytes: 1, sha256: 'd'.repeat(64) },
                    { role: 'classifier-head', path: 'classifier/head.json', bytes: 1, sha256: 'e'.repeat(64) },
                    { role: 'vocabulary', path: 'classifier/vocab.txt', bytes: 1, sha256: 'f'.repeat(64) }
                ]
            }
        ]
    };
    const files: Record<string, string> = {
        'classifier/encoder.onnx': 'encoder-bytes',
        'classifier/head.json': 'head-bytes',
        'classifier/vocab.txt': 'vocab-bytes',
        '../../resources/datasets/d.json': 'dataset-bytes'
    };
    const describe = async (path: string): Promise<{ bytes: number; sha256: string } | undefined> =>
        path in files ? { bytes: files[path].length, sha256: sha(files[path]) } : undefined;

    it('derives file hashes, component fingerprints and the revision from content', async () => {
        const { buildModelManifest, expectedManifestIdentity } = await import(scriptUrl);
        const head = { inputFormat: 'v3', encoderSha256: sha('encoder-bytes'), tokenizerSha256: sha('vocab-bytes') };
        const manifest = await buildModelManifest(template, describe, head);
        expect(manifest.components[0].contract.inputFormat).toBe('v3');
        expect(
            manifest.components[0].files.find((file: { role: string }) => file.role === 'classifier-head').sha256
        ).toBe(sha('head-bytes'));
        expect(manifest.components[0].files.some((file: { role: string }) => file.role === 'relevance-head')).toBe(
            false
        );
        const identity = expectedManifestIdentity(manifest);
        expect(identity.revision).toBe(manifest.revision);
        expect(identity.components[0].fingerprint).toBe(manifest.components[0].fingerprint);
        expect(manifest.revision).not.toBe(template.revision);
    });

    it('declares the relevance head when present and rejects encoder fingerprint drift', async () => {
        const { buildModelManifest } = await import(scriptUrl);
        const withRelevance = async (path: string) =>
            path === 'classifier/relevance-head.json' ? { bytes: 3, sha256: sha('rel') } : describe(path);
        const manifest = await buildModelManifest(template, withRelevance, {
            inputFormat: 'v3',
            encoderSha256: sha('encoder-bytes'),
            tokenizerSha256: sha('vocab-bytes')
        });
        expect(manifest.components[0].files.map((file: { role: string }) => file.role)).toContain('relevance-head');
        await expect(
            buildModelManifest(template, describe, {
                inputFormat: 'v3',
                encoderSha256: 'x'.repeat(64),
                tokenizerSha256: sha('vocab-bytes')
            })
        ).rejects.toThrow(/fingerprints do not match/u);
    });
});
