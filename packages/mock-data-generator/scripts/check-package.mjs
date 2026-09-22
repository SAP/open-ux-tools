#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAXIMUM_PACKED_BYTES = 350 * 1024 * 1024;
const REQUIRED = new Set([
    'package.json',
    'dist/public.js',
    'dist/cli.js',
    'resources/models/manifest.json',
    'resources/models/classifier/encoder.onnx',
    'resources/models/classifier/head.json',
    'resources/models/classifier/vocab.txt',
    'resources/models/sft/model.onnx',
    'resources/models/sft/tokenizer.json',
    'resources/models/sft/generation-config.json',
    'resources/datasets/synthetic-catalog.v2.json',
    'resources/datasets/text-samples.v1.json'
]);
const FORBIDDEN =
    /(?:^|\/)(?:fe-mockserver|downloader|release|start|host-compatibility|model-cache)(?:\.|\/)|(?:^|\/)\.mockserver-data-generator-dev(?:\/|$)/iu;
const DEVELOPER_PATH = /\/(?:Users|home)\/[A-Za-z0-9._-]+\//u;
const RELEASE_REQUIRED = ['resources/models/classifier/relevance-head.json'];

function archiveEntries(archive) {
    const names = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
    const verbose = execFileSync('tar', ['-tvzf', archive], { encoding: 'utf8' }).trim().split('\n');
    if (names.length !== verbose.length) {
        throw new Error('MockGen archive entry list is inconsistent');
    }
    return names.map((name, index) => {
        const segments = name.split('/');
        if (
            segments[0] !== 'package' ||
            segments.slice(1).some((segment) => !segment || segment === '.' || segment === '..') ||
            !verbose[index].startsWith('-')
        ) {
            throw new Error(`Unsafe MockGen archive entry: ${name}`);
        }
        return segments.slice(1).join('/');
    });
}

const temporary = mkdtempSync(join(tmpdir(), 'mockgen-package-'));
try {
    const output = execFileSync('pnpm', ['pack', '--pack-destination', temporary], {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
    const packedName = output.trim().split('\n').at(-1);
    if (!packedName || !packedName.endsWith('.tgz')) {
        throw new Error('pnpm did not report the packed MockGen archive');
    }
    const archive = isAbsolute(packedName) ? packedName : join(temporary, packedName);
    const names = archiveEntries(archive);
    const packed = new Set(names);
    if (packed.size !== names.length || [...REQUIRED].some((name) => !packed.has(name))) {
        throw new Error('MockGen archive has duplicate entries or is missing required runtime/model files');
    }
    for (const name of names) {
        if (FORBIDDEN.test(name) || name.endsWith('.map')) {
            throw new Error(`MockGen archive contains removed integration or developer artifact: ${name}`);
        }
    }
    const bytes = statSync(archive).size;
    if (bytes > MAXIMUM_PACKED_BYTES) {
        throw new Error(`MockGen archive exceeds ${MAXIMUM_PACKED_BYTES} bytes`);
    }
    execFileSync('tar', ['-xzf', archive, '-C', temporary], { stdio: ['ignore', 'pipe', 'pipe'] });
    const packageRoot = join(temporary, 'package');
    const manifest = JSON.parse(readFileSync(join(packageRoot, 'resources/models/manifest.json'), 'utf8'));
    const {
        parsePackagedModelManifest,
        assertPackagedClassifierHead,
        assertReleaseClassifier,
        assertReleaseRelevanceHead,
        verifyPackagedModels,
        verifyPackagedDatasets
    } = await import(pathToFileURL(join(packageRoot, 'dist/model/packaged-models.js')).href);
    const parsed = parsePackagedModelManifest(manifest);
    const verified = await verifyPackagedModels(join(packageRoot, 'resources/models'), parsed);
    if (!verified.ready) {
        throw new Error(`MockGen packed model checksum verification failed: ${JSON.stringify(verified.failures)}`);
    }
    const classifier = parsed.components.find((component) => component.kind === 'classifier');
    const classifierHeadPath = classifier && verified.files.get(classifier.id)?.get('classifier-head');
    if (!classifier || !classifierHeadPath) {
        throw new Error('MockGen packed classifier head is missing');
    }
    const classifierHead = JSON.parse(readFileSync(classifierHeadPath, 'utf8'));
    assertPackagedClassifierHead(classifierHead, classifier.contract.inputFormat);
    if (process.argv.includes('--release')) {
        assertReleaseClassifier(parsed, classifierHead);
        // The release gate checks qualification evidence; the full runtime head contract
        // (serializer, registry, token budget, calibration completeness) is checked here too so a
        // released head cannot fail at its first learned load.
        const [{ assertEmbeddingHead }, fieldContext, roleRegistry] = await Promise.all([
            import(pathToFileURL(join(packageRoot, 'dist/model/embedding-classifier.js')).href),
            import(pathToFileURL(join(packageRoot, 'dist/semantics/field-context.js')).href),
            import(pathToFileURL(join(packageRoot, 'dist/semantics/role-registry.js')).href)
        ]);
        assertEmbeddingHead(classifierHead, {
            fingerprint: classifier.fingerprint,
            embedder: { embed: async () => [] },
            head: classifierHead,
            serializeV3Input: fieldContext.serializeFieldContextV3,
            v3Roles: roleRegistry.SEMANTIC_ROLE_REGISTRY,
            v3RegistryFingerprint: roleRegistry.SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
            v3SerializerFingerprint: fieldContext.FIELD_CONTEXT_SERIALIZER_FINGERPRINT
        });
        const { expectedManifestIdentity } = await import(new URL('./build-model-manifest.mjs', import.meta.url).href);
        const identity = expectedManifestIdentity(manifest);
        const staleComponent = identity.components.some(
            (component) =>
                manifest.components.find((candidate) => candidate.id === component.id)?.fingerprint !==
                component.fingerprint
        );
        if (identity.revision !== manifest.revision || staleComponent) {
            throw new Error(
                'A new release requires a content-derived model manifest; run scripts/build-model-manifest.mjs'
            );
        }
        if (RELEASE_REQUIRED.some((name) => !packed.has(name))) {
            throw new Error('A new release requires the packaged field-to-value relevance head file');
        }
        const relevancePath = verified.files.get(classifier.id)?.get('relevance-head');
        if (!relevancePath) {
            throw new Error('A new release requires a qualified field-to-value relevance head');
        }
        const relevanceHead = JSON.parse(readFileSync(relevancePath, 'utf8'));
        const { assertCandidateRelevanceHead } = await import(
            pathToFileURL(join(packageRoot, 'dist/model/candidate-relevance.js')).href
        );
        // A packaged relevance encoder (fine-tuned copy) takes precedence over the shared encoder.
        const relevanceEncoder = classifier.files.find((file) => file.role === 'relevance-encoder');
        assertCandidateRelevanceHead(relevanceHead, {
            encoderSha256: relevanceEncoder?.sha256 ?? classifierHead.encoderSha256,
            vocabularySha256: classifierHead.tokenizerSha256,
            embeddingDimension: classifierHead.dim
        });
        assertReleaseRelevanceHead(relevanceHead);
        if (manifest.provenance?.reviewStatus !== 'approved') {
            throw new Error('A new release requires approved model provenance');
        }
    }
    const datasetFailures = await verifyPackagedDatasets(packageRoot, parsed);
    if (datasetFailures.length > 0) {
        throw new Error(`MockGen packed dataset checksum verification failed: ${JSON.stringify(datasetFailures)}`);
    }
    const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
    if (
        packageJson.name !== '@sap-ux/mock-data-generator' ||
        packageJson.dependencies?.['onnxruntime-node'] !== manifest.runtime.version ||
        packageJson.exports?.['./fe-mockserver']
    ) {
        throw new Error('MockGen package identity, runtime pin or exports are invalid');
    }
    for (const name of names.filter((path) => /\.(?:js|json|md|txt)$/iu.test(path))) {
        if (DEVELOPER_PATH.test(readFileSync(join(packageRoot, name), 'utf8'))) {
            throw new Error(`MockGen package contains a developer path: ${name}`);
        }
    }
    process.stdout.write(
        `${JSON.stringify({
            packageName: packageJson.name,
            version: packageJson.version,
            files: names.length,
            bytes,
            modelRevision: parsed.revision,
            modelBytes: parsed.components
                .flatMap((component) => component.files)
                .reduce((sum, file) => sum + file.bytes, 0),
            classifierBytes: parsed.components
                .find((component) => component.kind === 'classifier')
                ?.files.reduce((sum, file) => sum + file.bytes, 0),
            llmBytes: parsed.components
                .find((component) => component.kind === 'sft')
                ?.files.reduce((sum, file) => sum + file.bytes, 0),
            runtime: `${manifest.runtime.package}@${manifest.runtime.version}`,
            modelChecksumsVerified: true,
            publicationRightsApproved: manifest.provenance?.reviewStatus === 'approved'
        })}\n`
    );
} finally {
    rmSync(temporary, { recursive: true, force: true });
}
