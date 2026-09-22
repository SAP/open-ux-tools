#!/usr/bin/env node
/**
 * Phase 0 diagnostic: overflow, duplicate-text and collision statistics over review-queue
 * contexts, plus an optional leave-one-family-out probe on train/calibration contexts only.
 * Emits counts only; never field text, never sealed-context embeddings.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { collectQueueContexts, contextStatistics, leaveOneFamilyOutProbe } from './lib/context-statistics.mjs';
import { familyForServiceId } from './lib/service-family.mjs';

const values = (name) => process.argv.flatMap((value, index) => (value === name ? [process.argv[index + 1]] : []));
const argument = (name) => values(name)[0];
const queuePaths = values('--queue');
const rowsPath = argument('--rows');
const vocabularyPath = argument('--vocabulary');
const encoderPath = argument('--encoder');
const encoderSha256 = argument('--encoder-sha256');
const registryPath = argument('--registry');
const splitsPath = argument('--splits');
const output = argument('--output');
if (queuePaths.length === 0 || !vocabularyPath || !output) {
    throw new Error(
        'Usage: diagnose-v3-contexts.mjs --queue q.json [--queue …] --vocabulary vocab.txt [--rows rows.jsonl] [--encoder enc.onnx --encoder-sha256 SHA --registry reg.json --splits splits.json] --output report.json'
    );
}

const runtime = await import('../../packages/mock-data-generator/dist/index.js');
const { createMiniLmTokenizer } = await import('../../packages/mock-data-generator/dist/model/minilm-tokenizer.js');
const vocabularyBytes = await readFile(vocabularyPath);
// Overflow must be measured with an unbounded tokenizer: the runtime tokenizer truncates at the budget.
const tokenizer = createMiniLmTokenizer(vocabularyBytes.toString('utf8'), Number.MAX_SAFE_INTEGER);
const queues = await Promise.all(queuePaths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))));
const items = collectQueueContexts(queues);
const rows = rowsPath
    ? (await readFile(rowsPath, 'utf8'))
          .split(/\r?\n/u)
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line))
    : [];
const report = {
    format: 'mockgen-v3-context-diagnostic',
    version: 1,
    queues: queuePaths.map((path) => ({
        sha256: createHash('sha256')
            .update(JSON.stringify(queues[queuePaths.indexOf(path)]))
            .digest('hex'),
        fields: 0
    })),
    statistics: contextStatistics({ items, serialize: runtime.serializeFieldContextV3, tokenizer }),
    projectedRows: rows.length,
    probe: { status: 'skipped', reason: 'no encoder supplied' }
};
queuePaths.forEach((_, index) => {
    report.queues[index].fields = collectQueueContexts([queues[index]]).length;
});

if (encoderPath) {
    if (!encoderSha256 || !registryPath || !splitsPath)
        throw new Error('--encoder requires --encoder-sha256, --registry and --splits');
    const registry = JSON.parse(await readFile(registryPath, 'utf8'));
    const splits = JSON.parse(await readFile(splitsPath, 'utf8'));
    const fitting = items.filter((item) => item.partition !== 'sealed');
    const probeItems = [
        ...fitting.map((item) => ({
            context: item.context,
            label: true,
            family: familyForServiceId(registry, splits, item.serviceId)
        })),
        ...rows
            .filter((row) => row.context?.inputFormat === 'v3' && row.label && row.label !== 'unknown')
            .map((row) => ({ context: row.context, label: false, family: row.family ?? row.group ?? 'projected' }))
    ];
    const positives = probeItems.filter((item) => item.label).length;
    if (positives === 0 || positives === probeItems.length) {
        report.probe = {
            status: 'skipped',
            reason: 'proxy task needs both status-shaped and projected-role contexts',
            positives,
            negatives: probeItems.length - positives
        };
    } else {
        const embedder = await runtime.createMiniLmTextEmbedder({
            modelPath: encoderPath,
            vocabularyPath,
            hiddenSize: 384,
            maxWordPieceTokens: 64,
            expectedEncoderSha256: encoderSha256,
            expectedVocabularySha256: createHash('sha256').update(vocabularyBytes).digest('hex'),
            backend: await runtime.loadOnnxBackend()
        });
        try {
            const vectors = [];
            for (let start = 0; start < probeItems.length; start += 32) {
                const batch = probeItems
                    .slice(start, start + 32)
                    .map((item) => runtime.serializeFieldContextV3(item.context));
                vectors.push(...(await embedder.embed(batch)).map((vector) => Array.from(vector)));
            }
            report.probe = {
                status: 'evaluated',
                proxyTask:
                    'status-shaped queue context (true) vs planner-projected role context (false); diagnostic only',
                positives,
                negatives: probeItems.length - positives,
                sealedContextsExcluded: items.length - fitting.length,
                ...leaveOneFamilyOutProbe({
                    vectors,
                    labels: probeItems.map((item) => item.label),
                    families: probeItems.map((item) => item.family)
                })
            };
        } finally {
            await embedder.dispose();
        }
    }
}
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(
    `${JSON.stringify({ total: report.statistics.total, overflow: report.statistics.overflow, collisions: report.statistics.crossPartitionCollisions, probe: report.probe.status })}\n`
);
