#!/usr/bin/env node
/**
 * Evaluate a v3 role head on sealed, service-disjoint fields through the runtime routing path.
 * Writes a private report (per-field table) and prints counts only.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createEmbeddingSemanticClassifier } from '../../packages/mock-data-generator/dist/model/embedding-classifier.js';
import { createMiniLmTextEmbedder, loadOnnxBackend } from '../../packages/mock-data-generator/dist/index.js';
import {
    FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    serializeFieldContextV3
} from '../../packages/mock-data-generator/dist/semantics/field-context.js';
import {
    SEMANTIC_ROLE_REGISTRY,
    SEMANTIC_ROLE_REGISTRY_FINGERPRINT
} from '../../packages/mock-data-generator/dist/semantics/role-registry.js';
import { checkedGraph } from './lib/incumbent-role-converter.mjs';
import { routeSealedService, sealedDatasetFingerprint, summarizeSealedDecisions } from './lib/sealed-evaluation.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const headPath = argument('--head');
const sealedPath = argument('--sealed');
const registryPath = argument('--registry');
const sourceRoot = argument('--source-root');
const encoder = argument('--encoder');
const vocabulary = argument('--vocabulary');
const output = argument('--output');
if (!headPath || !sealedPath || !registryPath || !sourceRoot || !encoder || !vocabulary || !output) {
    throw new Error(
        'Usage: evaluate-sealed-roles.mjs --head head.json --sealed sealed-rows.jsonl --registry registry.json --source-root /abs/incumbent --encoder encoder.onnx --vocabulary vocab.txt --output report.json'
    );
}
const headText = await readFile(headPath, 'utf8');
const head = JSON.parse(headText);
const rows = (await readFile(sealedPath, 'utf8'))
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const services = new Map(registry.services.map((service) => [service.id, service]));
const embedder = await createMiniLmTextEmbedder({
    modelPath: encoder,
    vocabularyPath: vocabulary,
    hiddenSize: head.dim,
    maxWordPieceTokens: head.maxWordPieceTokens,
    expectedEncoderSha256: head.encoderSha256,
    expectedVocabularySha256: head.tokenizerSha256,
    backend: await loadOnnxBackend()
});
try {
    const classifier = createEmbeddingSemanticClassifier({
        fingerprint: head.qualification?.artifactFingerprint ?? createHash('sha256').update(headText).digest('hex'),
        embedder,
        head,
        serializeV3Input: serializeFieldContextV3,
        v3Roles: SEMANTIC_ROLE_REGISTRY,
        v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
        v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
    });
    const byService = new Map();
    for (const row of rows) {
        if (!byService.has(row.serviceId)) byService.set(row.serviceId, []);
        byService.get(row.serviceId).push(row);
    }
    const decisions = [];
    for (const [serviceId, serviceRows] of byService) {
        const service = services.get(serviceId);
        if (!service || service.license?.redistributable !== true)
            throw new TypeError(`sealed service ${serviceId} is not a public registered source`);
        if (serviceRows.some((row) => row.sourceChecksum !== service.source.contentChecksum))
            throw new TypeError(`sealed source checksum drift for ${serviceId}`);
        const graph = await checkedGraph(resolve(sourceRoot), service);
        decisions.push(...(await routeSealedService({ graph, rows: serviceRows, classifier })));
    }
    // Routable labels only: auxiliary classes are trained but never routed, so they are unsupported.
    const auxiliary = new Set(head.auxiliaryLabels ?? []);
    const claimedLabels = head.labels.filter((label) => label !== 'unknown' && !auxiliary.has(label));
    const summary = summarizeSealedDecisions({ decisions, claimedLabels, registryRoles: SEMANTIC_ROLE_REGISTRY });
    const report = {
        format: 'mockgen-sealed-role-report',
        version: 1,
        headSha256: createHash('sha256').update(JSON.stringify(head)).digest('hex'),
        sealedDatasetFingerprint: sealedDatasetFingerprint(rows),
        ...summary
    };
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(
        `${JSON.stringify({ sealedEvaluation: report.sealedEvaluation, gate: { pass: report.gate.pass, failures: report.gate.failures }, rawStatusTopLabelCorrect: report.rawStatusTopLabelCorrect })}\n`
    );
} finally {
    await embedder.dispose();
}
