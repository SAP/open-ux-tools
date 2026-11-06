import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { VALUE_BANK_STORE_ID, VALUE_BANK_STORE_PATH } from '../../src/semantics/bank-store.js';
import { ROLE_REGISTRY_ID, ROLE_REGISTRY_PATH } from '../../src/semantics/role-registry.js';
import { SEMANTIC_RULE_STORE_ID, SEMANTIC_RULE_STORE_PATH } from '../../src/semantics/rule-store.js';

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
        '../../resources/banks/value-banks.v2.json': 'store-bytes',
        '../../resources/rules/semantic-rules.v1.json': 'rule-bytes',
        '../../resources/rules/role-registry.v1.json': 'registry-bytes'
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
        // Whatever the template declared, the manifest declares exactly the value-bank and rule stores.
        expect(manifest.datasets).toEqual([
            expect.objectContaining({
                id: 'mockgen-value-banks',
                path: 'resources/banks/value-banks.v2.json',
                bytes: 'store-bytes'.length,
                sha256: sha('store-bytes')
            }),
            expect.objectContaining({
                id: 'mockgen-semantic-rules',
                path: 'resources/rules/semantic-rules.v1.json',
                bytes: 'rule-bytes'.length,
                sha256: sha('rule-bytes')
            }),
            expect.objectContaining({
                id: 'mockgen-role-registry',
                path: 'resources/rules/role-registry.v1.json',
                bytes: 'registry-bytes'.length,
                sha256: sha('registry-bytes')
            })
        ]);
    });

    it('rejects field-level training records in public model artifacts', async () => {
        const { buildModelManifest } = await import(scriptUrl);
        const records = { trainIds: ['example-service/Record/Field'] };
        for (const metadata of [{ qualification: records }, { metadata: { qualification: records } }]) {
            await expect(
                buildModelManifest(template, describe, {
                    inputFormat: 'v3',
                    encoderSha256: sha('encoder-bytes'),
                    tokenizerSha256: sha('vocab-bytes'),
                    ...metadata
                })
            ).rejects.toThrow(/record identifiers/u);
        }
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

    it('declares the resource paths the runtime loaders read', async () => {
        // Given the dataset descriptors of the manifest script
        const { RESOURCE_DATASETS } = await import(scriptUrl);
        // Then they name the stores at the ids and paths the package loads
        expect(RESOURCE_DATASETS.map(({ id, path }: { id: string; path: string }) => [id, path])).toEqual([
            [VALUE_BANK_STORE_ID, VALUE_BANK_STORE_PATH],
            [SEMANTIC_RULE_STORE_ID, SEMANTIC_RULE_STORE_PATH],
            [ROLE_REGISTRY_ID, ROLE_REGISTRY_PATH]
        ]);
    });

    it('fails without the semantic rule store', async () => {
        // Given a package without the rule store
        const { buildModelManifest } = await import(scriptUrl);
        const withoutRules = async (path: string) => (path.includes('semantic-rules') ? undefined : describe(path));
        // When the manifest is built
        // Then the missing store is named
        await expect(
            buildModelManifest(template, withoutRules, {
                inputFormat: 'v3',
                encoderSha256: sha('encoder-bytes'),
                tokenizerSha256: sha('vocab-bytes')
            })
        ).rejects.toThrow(/semantic rule store is missing/u);
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

    it('rejects a classifier head trained on another input format', async () => {
        // Given a head that does not declare the v3 input format
        const { buildModelManifest } = await import(scriptUrl);
        const head = { inputFormat: 'v2', encoderSha256: sha('encoder-bytes'), tokenizerSha256: sha('vocab-bytes') };

        // When the manifest is built, then the head is rejected
        await expect(buildModelManifest(template, describe, head)).rejects.toThrow(/v3 input format/u);
    });

    const approved = { source: 's', reviewStatus: 'approved', reviewRecordSha256: 'r'.repeat(64) };

    it('keeps an approval while the content revision is unchanged', async () => {
        const { buildProvenance } = await import(scriptUrl);
        expect(buildProvenance(approved, 'a'.repeat(64), 'a'.repeat(64))).toEqual(approved);
    });

    it('withdraws an approval when the content revision changed', async () => {
        const { buildProvenance } = await import(scriptUrl);
        expect(buildProvenance(approved, 'a'.repeat(64), 'b'.repeat(64))).toEqual({
            source: 's',
            reviewStatus: 'development'
        });
        expect(buildProvenance({ reviewStatus: 'candidate' }, 'a'.repeat(64), 'b'.repeat(64)).reviewStatus).toBe(
            'candidate'
        );
    });

    it('records an explicit review', async () => {
        const { buildProvenance } = await import(scriptUrl);
        expect(
            buildProvenance({ source: 's' }, 'a'.repeat(64), 'b'.repeat(64), { recordSha256: 'q'.repeat(64) })
        ).toEqual({ source: 's', reviewStatus: 'approved', reviewRecordSha256: 'q'.repeat(64) });
    });

    it('rejects a missing option value and a review record without a review status', async () => {
        const { parseManifestArguments } = await import(scriptUrl);
        expect(() => parseManifestArguments(['--review-status', '--check'])).toThrow(/--review-status/u);
        expect(() => parseManifestArguments(['--review-record', 'record.md'])).toThrow(/--review-status/u);
        expect(parseManifestArguments(['--check']).checkOnly).toBe(true);
    });

    it('runs from any path and keeps an approved, unchanged manifest up to date', async () => {
        // A '#' in the path breaks a URL-based entry-point check the same way a Windows drive letter does.
        const root = await mkdtemp(join(tmpdir(), 'mockgen-manifest-#-'));
        const run = (args: ReadonlyArray<string>): Promise<{ code: number; stdout: string }> =>
            new Promise((resolveRun) => {
                execFile(
                    process.execPath,
                    [join(root, 'scripts', 'm.mjs'), ...args],
                    { cwd: root },
                    (error, stdout) => {
                        resolveRun({ code: typeof error?.code === 'number' ? error.code : 0, stdout });
                    }
                );
            });
        const models = join(root, 'resources', 'models');
        const manifestPath = join(models, 'manifest.json');
        try {
            await mkdir(join(models, 'classifier'), { recursive: true });
            await mkdir(join(root, 'resources', 'banks'), { recursive: true });
            await mkdir(join(root, 'resources', 'rules'), { recursive: true });
            await mkdir(join(root, 'scripts'));
            await copyFile(
                resolve(process.cwd(), 'scripts', 'build-model-manifest.mjs'),
                join(root, 'scripts', 'm.mjs')
            );
            await writeFile(join(models, 'classifier', 'encoder.onnx'), 'encoder-bytes');
            const writeHead = (encoderBytes: string) =>
                writeFile(
                    join(models, 'classifier', 'head.json'),
                    JSON.stringify({
                        inputFormat: 'v3',
                        encoderSha256: sha(encoderBytes),
                        tokenizerSha256: sha('vocab-bytes')
                    })
                );
            await writeHead('encoder-bytes');
            await writeFile(join(models, 'classifier', 'vocab.txt'), 'vocab-bytes');
            await writeFile(join(root, 'resources', 'banks', 'value-banks.v2.json'), '{"banks":{}}');
            await writeFile(join(root, 'resources', 'rules', 'semantic-rules.v1.json'), '{}');
            await writeFile(join(root, 'resources', 'rules', 'role-registry.v1.json'), '{}');
            await writeFile(manifestPath, JSON.stringify({ ...template, datasets: [] }));

            const built = await run([]);
            expect(built.code).toBe(0);
            expect(built.stdout).toContain('revision');

            const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
            manifest.provenance = { reviewStatus: 'approved', reviewRecordSha256: 'r'.repeat(64) };
            await writeFile(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`);
            expect(await run(['--check'])).toEqual({ code: 0, stdout: expect.stringContaining('"upToDate":true') });

            // A retrained encoder ships with a head that records its new fingerprint.
            await writeFile(join(models, 'classifier', 'encoder.onnx'), 'changed-bytes');
            await writeHead('changed-bytes');
            expect((await run(['--check'])).code).toBe(1);
            expect((await run([])).code).toBe(0);
            expect(JSON.parse(await readFile(manifestPath, 'utf8')).provenance).toEqual({
                reviewStatus: 'development'
            });
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
