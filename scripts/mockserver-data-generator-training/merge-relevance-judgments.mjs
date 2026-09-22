#!/usr/bin/env node
/** Merge relevance judge files into reviewed trainer records, partition id lists and a review record. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadJudgeRuns } from './lib/judge-files.mjs';
import { reviewedRelevanceRecords } from './lib/relevance-review-set.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const candidatesPath = argument('--candidates');
const batchesDir = argument('--batches-dir');
const batchIdsPath = argument('--batch-ids');
const runsDir = argument('--runs-dir');
const judgesSpec = argument('--judges');
const promptPath = argument('--prompt');
const outputDir = argument('--output-dir');
if (!candidatesPath || !batchesDir || !batchIdsPath || !runsDir || !judgesSpec || !promptPath || !outputDir) {
    throw new Error(
        'Usage: merge-relevance-judgments.mjs --candidates candidates.json --batches-dir DIR --batch-ids ids.json --runs-dir DIR --judges judge-a=model,… --prompt prompt.md --output-dir DIR'
    );
}
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const candidatesFile = await readJson(candidatesPath);
const candidates = candidatesFile.candidates;
const batchIds = await readJson(batchIdsPath);
const batchItems = new Map();
for (const batchId of batchIds) {
    const batch = await readJson(join(batchesDir, `${batchId}.json`));
    batchItems.set(
        batchId,
        batch.items.map((item) => item.itemId)
    );
}
const promptSha256 = sha256(await readFile(promptPath, 'utf8'));
const judges = judgesSpec.split(',').map((entry) => {
    const [judgeId, model] = entry.split('=');
    return { judgeId, model };
});
if (new Set(judges.map((judge) => judge.model)).size !== judges.length)
    throw new TypeError('judges must be distinct models');
const { runs, problems } = await loadJudgeRuns({ runsDir, judges, batchItems, format: 'mockgen-relevance-judgments' });
const votes = new Map();
for (const run of runs) {
    for (const judgment of run.judgments) {
        if (typeof judgment.relevant !== 'boolean')
            throw new TypeError(`judge ${run.judgeId} omitted relevant for ${judgment.itemId}`);
        const entry = votes.get(judgment.itemId) ?? [];
        entry.push(judgment.relevant);
        votes.set(judgment.itemId, entry);
    }
}
const consensus = new Map();
let unanimous = 0;
let split = 0;
for (const [id, list] of votes) {
    const yes = list.filter(Boolean).length;
    const no = list.length - yes;
    if (Math.max(yes, no) < 2) {
        split += 1;
        continue;
    }
    if (yes === list.length || no === list.length) unanimous += 1;
    consensus.set(id, {
        relevant: yes > no,
        agreement: yes === list.length || no === list.length ? 'unanimous' : 'majority'
    });
}
const { records, dropped } = reviewedRelevanceRecords(candidates, consensus);
const byPartition = (name) => records.filter((record) => record.partition === name);
const dataset = records.map(({ partition, ...record }) => record);
await writeFile(join(outputDir, 'reviewed.json'), `${JSON.stringify(dataset)}\n`, 'utf8');
for (const name of ['train', 'calibration', 'sealed']) {
    await writeFile(
        join(outputDir, `${name}-ids.json`),
        `${JSON.stringify(byPartition(name).map((record) => record.id))}\n`,
        'utf8'
    );
}
const pairwise = [];
for (let i = 0; i < runs.length; i += 1) {
    for (let j = i + 1; j < runs.length; j += 1) {
        const a = new Map(runs[i].judgments.map((entry) => [entry.itemId, entry.relevant]));
        let agreed = 0;
        let total = 0;
        for (const entry of runs[j].judgments) {
            if (!a.has(entry.itemId)) continue;
            total += 1;
            if (a.get(entry.itemId) === entry.relevant) agreed += 1;
        }
        pairwise.push({
            judges: [runs[i].judgeId, runs[j].judgeId],
            agreed,
            total,
            rate: total ? agreed / total : null
        });
    }
}
const summary = (name) => {
    const rows = byPartition(name);
    const origin = new Map(candidates.map((candidate) => [candidate.id, candidate.origin]));
    return {
        positives: rows.filter((row) => row.relevant).length,
        hardNegatives: rows.filter((row) => !row.relevant).length,
        crossDomainJudgedRelevant: rows.filter((row) => row.relevant && origin.get(row.id) === 'cross-domain').length
    };
};
const consistency = {
    judged: votes.size,
    unanimous,
    split,
    pairwise,
    dropped,
    problems: problems.length,
    partitions: { train: summary('train'), calibration: summary('calibration'), sealed: summary('sealed') }
};
const consistencyText = JSON.stringify(consistency);
await writeFile(
    join(outputDir, 'consistency.json'),
    `${JSON.stringify({ ...consistency, problemDetails: problems }, null, 2)}\n`,
    'utf8'
);
const record = {
    format: 'mockgen-label-review-record',
    version: 1,
    subject: 'field-to-value relevance labels',
    method: 'model-panel-consensus',
    humanVerified: false,
    judges: judges.map((judge) => ({ ...judge, promptSha256 })),
    guidelineSha256: candidatesFile.guidelineSha256,
    adjudicationSha256: sha256(JSON.stringify(dataset)),
    consistencySha256: sha256(consistencyText),
    negativePolicy:
        'cross-domain values drawn from other service groups; sealed values never donated to train or calibration',
    note: 'Relevance labels are majority decisions of independent model judges. No human verified them.'
};
await writeFile(join(outputDir, 'review-record.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(consistency)}\n`);
