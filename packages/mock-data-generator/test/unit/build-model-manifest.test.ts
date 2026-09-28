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
                path: 'resources/datasets/legacy.json',
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
        '../../resources/banks/value-banks.v1.json': 'store-bytes'
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
        // Whatever the template declared, the manifest declares exactly the value-bank store.
        expect(manifest.datasets).toEqual([
            expect.objectContaining({
                id: 'mockgen-value-banks',
                path: 'resources/banks/value-banks.v1.json',
                bytes: 'store-bytes'.length,
                sha256: sha('store-bytes')
            })
        ]);
    });

    it('fails without the value-bank store', async () => {
        const { buildModelManifest } = await import(scriptUrl);
        const withoutStore = async (path: string) => (path.includes('value-banks') ? undefined : describe(path));
        await expect(
            buildModelManifest(template, withoutStore, {
                inputFormat: 'v3',
                encoderSha256: sha('encoder-bytes'),
                tokenizerSha256: sha('vocab-bytes')
            })
        ).rejects.toThrow(/value-bank store is missing/u);
    });

    it('requires a value bank for every concept of the concept head', async () => {
        const { assertConceptBanks } = await import(scriptUrl);
        const store = { banks: { 'concept:a': { kind: 'concept' }, 'role:b': { kind: 'role' } } };
        expect(() => assertConceptBanks({ concepts: [{ id: 'a' }] }, store)).not.toThrow();
        expect(() => assertConceptBanks({ concepts: [{ id: 'a' }, { id: 'b' }] }, store)).toThrow(
            /without a value bank: b/u
        );
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
