import { jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as packagedModels from '../../src/model/packaged-models.js';
import { VALUE_BANK_STORE_ID, VALUE_BANK_STORE_PATH } from '../../src/semantics/bank-store.js';
import { ROLE_REGISTRY_ID, ROLE_REGISTRY_PATH } from '../../src/semantics/role-registry.js';
import { SEMANTIC_RULE_STORE_ID, SEMANTIC_RULE_STORE_PATH } from '../../src/semantics/rule-store.js';

/**
 * Provide real checksummed temporary artifacts for deterministic public-API tests. Only the
 * package-local manifest lookup and model-root location are redirected; manifest parsing, dataset
 * checks, model verification, classifier-head validation and the public generator remain real.
 * These marker files are deliberately not trained models and must never allocate a native session.
 *
 * @param options test variations
 * @param options.runtimeVersion onnxruntime-node version the manifest requires; the installed one by default
 * @returns synthetic manifest, allocation guard and cleanup
 */
export async function mockStandaloneModelResources(options: { runtimeVersion?: string } = {}) {
    const directory = await fsPromises.mkdtemp(join(tmpdir(), 'mockgen-synthetic-models-'));
    const sha256 = (content: string | Buffer): string => createHash('sha256').update(content).digest('hex');
    const classifierHead = JSON.stringify({
        inputFormat: 'v3',
        labels: ['unknown'],
        qualification: { status: 'qualified' },
        calibrationSupport: {
            minimumCorrectPerRole: 5,
            minimumCorrectPerFamily: 10,
            roles: {},
            families: {}
        }
    });
    const sftMarker = 'Synthetic SFT marker; no inference is supported.';
    await fsPromises.writeFile(join(directory, 'head.json'), classifierHead);
    await fsPromises.writeFile(join(directory, 'sft.marker'), sftMarker);
    const banks = fs.readFileSync(new URL(`../../${VALUE_BANK_STORE_PATH}`, import.meta.url));
    const rules = fs.readFileSync(new URL(`../../${SEMANTIC_RULE_STORE_PATH}`, import.meta.url));
    const registry = fs.readFileSync(new URL(`../../${ROLE_REGISTRY_PATH}`, import.meta.url));
    const runtime = createRequire(import.meta.url)('onnxruntime-node/package.json') as { version: string };
    const manifest = packagedModels.parsePackagedModelManifest({
        formatVersion: 1,
        bundleId: 'synthetic-test-models',
        revision: sha256('synthetic-test-revision'),
        runtime: { package: 'onnxruntime-node', version: options.runtimeVersion ?? runtime.version },
        components: [
            {
                id: 'synthetic-classifier',
                kind: 'classifier',
                version: 'test-1',
                fingerprint: sha256(classifierHead),
                license: 'Apache-2.0',
                modelCard: 'https://example.invalid/synthetic-classifier',
                contract: { inputFormat: 'v3', inputs: ['input_ids'], outputs: ['last_hidden_state'] },
                files: [
                    {
                        role: 'classifier-head',
                        path: 'head.json',
                        bytes: Buffer.byteLength(classifierHead),
                        sha256: sha256(classifierHead)
                    }
                ]
            },
            {
                id: 'synthetic-sft',
                kind: 'sft',
                version: 'test-1',
                fingerprint: sha256(sftMarker),
                license: 'Apache-2.0',
                modelCard: 'https://example.invalid/synthetic-sft',
                contract: { inputFormat: 'row-object-v1', inputs: ['input_ids'], outputs: ['logits'] },
                files: [
                    {
                        role: 'model',
                        path: 'sft.marker',
                        bytes: Buffer.byteLength(sftMarker),
                        sha256: sha256(sftMarker)
                    }
                ]
            }
        ],
        datasets: [
            {
                id: VALUE_BANK_STORE_ID,
                version: '1',
                path: VALUE_BANK_STORE_PATH,
                bytes: banks.byteLength,
                sha256: sha256(banks),
                license: 'Apache-2.0',
                provenance: 'Tracked synthetic value-bank fixture'
            },
            {
                id: SEMANTIC_RULE_STORE_ID,
                version: '1',
                path: SEMANTIC_RULE_STORE_PATH,
                bytes: rules.byteLength,
                sha256: sha256(rules),
                license: 'Apache-2.0',
                provenance: 'Tracked semantic rule store'
            },
            {
                id: ROLE_REGISTRY_ID,
                version: '1',
                path: ROLE_REGISTRY_PATH,
                bytes: registry.byteLength,
                sha256: sha256(registry),
                license: 'Apache-2.0',
                provenance: 'Tracked role registry'
            }
        ]
    });
    const manifestText = JSON.stringify(manifest);
    const packageManifestPath = fileURLToPath(new URL('../../resources/models/manifest.json', import.meta.url));
    const isManifest = (path: unknown): boolean =>
        (path instanceof URL ? fileURLToPath(path) : path) === packageManifestPath;
    jest.unstable_mockModule('node:fs', () => ({
        ...fs,
        readFileSync: (...args: Parameters<typeof fs.readFileSync>) =>
            isManifest(args[0]) ? manifestText : fs.readFileSync(...args)
    }));
    jest.unstable_mockModule('node:fs/promises', () => ({
        ...fsPromises,
        readFile: (...args: Parameters<typeof fsPromises.readFile>) =>
            isManifest(args[0]) ? Promise.resolve(manifestText) : fsPromises.readFile(...args)
    }));
    const verifyPackagedModels = jest.fn((_root: string, value: unknown, signal?: AbortSignal) =>
        packagedModels.verifyPackagedModels(directory, value, signal)
    );
    jest.unstable_mockModule(fileURLToPath(new URL('../../src/model/packaged-models.ts', import.meta.url)), () => ({
        ...packagedModels,
        verifyPackagedModels
    }));
    const allocateNativeSession = jest.fn(() => {
        throw new Error('Deterministic public-API tests must not allocate native models');
    });
    jest.unstable_mockModule(createRequire(import.meta.url).resolve('onnxruntime-node'), () => ({
        InferenceSession: { create: allocateNativeSession }
    }));
    return {
        manifest,
        allocateNativeSession,
        verifyPackagedModels,
        dispose: () => fsPromises.rm(directory, { recursive: true, force: true })
    };
}
