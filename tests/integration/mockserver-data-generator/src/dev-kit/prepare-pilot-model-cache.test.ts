import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
    parseArguments,
    preparePilotModelCache
} from '../../../../../scripts/mockserver-data-generator-dev-kit/prepare-pilot-model-cache.mjs';

const temporaryDirectories: string[] = [];

function temporaryDirectory(prefix: string): string {
    const directory = mkdtempSync(join(tmpdir(), prefix));
    temporaryDirectories.push(directory);
    return directory;
}

function writePilot(root: string): void {
    const classifierRoot = join(root, 'packages/mockgen-models/retrieval-model');
    const classifierHeadRoot = join(root, 'packages/mockgen-core/models');
    const sftRoot = join(root, 'var/sft/onnx-export');
    for (const directory of [classifierRoot, classifierHeadRoot, sftRoot]) {
        mkdirSync(directory, { recursive: true });
    }
    writeFileSync(join(classifierRoot, 'model_int8.onnx'), 'classifier-model');
    writeFileSync(join(classifierRoot, 'vocab.txt'), 'classifier-vocabulary');
    writeFileSync(join(classifierHeadRoot, 'embedding-classifier-head.json'), '{"dim":384}\n');
    writeFileSync(join(sftRoot, 'model_int8.onnx'), 'sft-model');
    writeFileSync(join(sftRoot, 'tokenizer.json'), '{"model":{"type":"BPE"}}\n');
    writeFileSync(
        join(sftRoot, 'config.json'),
        JSON.stringify({
            num_hidden_layers: 30,
            num_key_value_heads: 3,
            hidden_size: 576,
            num_attention_heads: 9
        })
    );
}

function writePortablePilot(root: string): void {
    const classifierRoot = join(root, 'packages/mockgen-models/retrieval-model');
    const classifierHeadRoot = join(root, 'packages/mockgen-core/models');
    const sftRoot = join(root, 'packages/mockgen-models/llm-model');
    for (const directory of [classifierRoot, classifierHeadRoot, sftRoot]) {
        mkdirSync(directory, { recursive: true });
    }
    writeFileSync(join(classifierRoot, 'model_int8.onnx'), 'classifier-model');
    writeFileSync(join(classifierRoot, 'vocab.txt'), 'classifier-vocabulary');
    writeFileSync(join(classifierHeadRoot, 'embedding-classifier-head.json'), '{"dim":384}\n');
    writeFileSync(join(sftRoot, 'model_int8.onnx'), 'sft-model');
    writeFileSync(join(sftRoot, 'tokenizer.json'), '{"model":{"type":"BPE"}}\n');
    writeFileSync(
        join(sftRoot, 'manifest.json'),
        JSON.stringify({
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
        })
    );
}

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe('pilot model cache bridge', () => {
    test('accepts the package-manager argument separator', () => {
        expect(
            parseArguments(['--', '--pilot-root', '/pilot', '--cache', '/cache', '--manifest-out', '/manifest.json'])
        ).toEqual({ pilotRoot: '/pilot', cacheRoot: '/cache', manifestPath: '/manifest.json' });
    });

    test('stages retained classifier and SFT artifacts under an immutable production manifest', async () => {
        const pilotRoot = temporaryDirectory('mockgen-pilot-source-');
        const outputRoot = temporaryDirectory('mockgen-pilot-output-');
        const cacheRoot = join(outputRoot, 'cache');
        const manifestPath = join(outputRoot, 'model-manifest.json');
        writePilot(pilotRoot);

        const first = await preparePilotModelCache({ pilotRoot, cacheRoot, manifestPath });
        const second = await preparePilotModelCache({ pilotRoot, cacheRoot, manifestPath });
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        const bundleRoot = join(cacheRoot, manifest.bundleId, manifest.revision);

        expect(second).toEqual(first);
        expect(first).toMatchObject({
            status: 'ready',
            bundleId: 'mockgen-pilot-int8',
            lifecycle: 'development',
            runtime: { package: 'onnxruntime-node', version: '1.24.3' }
        });
        expect(manifest.components.map(({ kind }: { kind: string }) => kind)).toEqual(['classifier', 'sft']);
        expect(manifest.components[0].files.map(({ role }: { role: string }) => role)).toEqual([
            'encoder',
            'classifier-head',
            'vocabulary'
        ]);
        expect(manifest.components[1].files.map(({ role }: { role: string }) => role)).toEqual([
            'model',
            'tokenizer',
            'generation-config'
        ]);
        expect(readFileSync(join(bundleRoot, 'classifier/encoder.onnx'), 'utf8')).toBe('classifier-model');
        expect(readFileSync(join(bundleRoot, 'sft/model.onnx'), 'utf8')).toBe('sft-model');
        expect(JSON.stringify(manifest)).not.toContain(pilotRoot);
        expect(manifest.revision).toMatch(/^[a-f\d]{64}$/);
        expect(first.manifestSha256).toBe(sha256(readFileSync(manifestPath, 'utf8')));
    });

    test('rejects a source artifact reached through a symbolic link', async () => {
        const pilotRoot = temporaryDirectory('mockgen-pilot-link-source-');
        const outputRoot = temporaryDirectory('mockgen-pilot-link-output-');
        const outside = join(outputRoot, 'outside.onnx');
        writePilot(pilotRoot);
        writeFileSync(outside, 'outside');
        const modelPath = join(pilotRoot, 'var/sft/onnx-export/model_int8.onnx');
        rmSync(modelPath);
        symlinkSync(outside, modelPath);

        await expect(
            preparePilotModelCache({
                pilotRoot,
                cacheRoot: join(outputRoot, 'cache'),
                manifestPath: join(outputRoot, 'model-manifest.json')
            })
        ).rejects.toThrow(/regular non-symbolic-link file/i);
        expect(existsSync(join(outputRoot, 'model-manifest.json'))).toBe(false);
    });

    test('rejects output paths that resolve inside the retained pilot', async () => {
        const pilotRoot = temporaryDirectory('mockgen-pilot-output-source-');
        const outputRoot = temporaryDirectory('mockgen-pilot-output-parent-');
        const linkedPilot = join(outputRoot, 'linked-pilot');
        writePilot(pilotRoot);
        symlinkSync(pilotRoot, linkedPilot, 'dir');

        await expect(
            preparePilotModelCache({
                pilotRoot,
                cacheRoot: pilotRoot,
                manifestPath: join(outputRoot, 'model-manifest.json')
            })
        ).rejects.toThrow(/outside.*pilot|pilot.*outside/i);
        await expect(
            preparePilotModelCache({
                pilotRoot,
                cacheRoot: join(linkedPilot, 'generated-cache'),
                manifestPath: join(outputRoot, 'model-manifest.json')
            })
        ).rejects.toThrow(/outside.*pilot|pilot.*outside/i);
        await expect(
            preparePilotModelCache({
                pilotRoot,
                cacheRoot: join(outputRoot, 'cache'),
                manifestPath: join(linkedPilot, 'generated-manifest.json')
            })
        ).rejects.toThrow(/outside.*pilot|pilot.*outside/i);
        expect(existsSync(join(pilotRoot, 'generated-cache'))).toBe(false);
        expect(existsSync(join(pilotRoot, 'generated-manifest.json'))).toBe(false);
    });

    test('accepts the extracted portable pilot layout', async () => {
        const pilotRoot = temporaryDirectory('mockgen-portable-pilot-source-');
        const repositoryRoot = temporaryDirectory('mockgen-repository-pilot-source-');
        const outputRoot = temporaryDirectory('mockgen-portable-pilot-output-');
        const repositoryOutputRoot = temporaryDirectory('mockgen-repository-pilot-output-');
        const cacheRoot = join(outputRoot, 'cache');
        const manifestPath = join(outputRoot, 'model-manifest.json');
        writePortablePilot(pilotRoot);
        writePilot(repositoryRoot);

        const result = await preparePilotModelCache({ pilotRoot, cacheRoot, manifestPath });
        const repositoryResult = await preparePilotModelCache({
            pilotRoot: repositoryRoot,
            cacheRoot: join(repositoryOutputRoot, 'cache'),
            manifestPath: join(repositoryOutputRoot, 'model-manifest.json')
        });
        const configuration = JSON.parse(
            readFileSync(join(result.bundleDirectory, 'sft/generation-config.json'), 'utf8')
        );

        expect(result.status).toBe('ready');
        expect(configuration.samplingOptions.maxNewTokens).toBe(300);
        expect(repositoryResult.revision).toBe(result.revision);
        expect(repositoryResult.componentFingerprints).toEqual(result.componentFingerprints);
    });
});
