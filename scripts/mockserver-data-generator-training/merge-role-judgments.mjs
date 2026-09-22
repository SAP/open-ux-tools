#!/usr/bin/env node
/** Merge role judge files into consensus labels, a consistency report and a label review record. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { batchPacket } from './lib/adjudication-packet.mjs';
import { adjudicatePacket } from './lib/judge-panel.mjs';
import { loadJudgeRuns } from './lib/judge-files.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const packetPath = argument('--packet');
const runsDir = argument('--runs-dir');
const judgesSpec = argument('--judges');
const promptPath = argument('--prompt');
const output = argument('--output');
const recordOutput = argument('--review-record');
const batchSize = Number(argument('--batch-size') ?? '25');
if (!packetPath || !runsDir || !judgesSpec || !promptPath || !output || !recordOutput) {
    throw new Error(
        'Usage: merge-role-judgments.mjs --packet packet.json --runs-dir DIR --judges judge-a=model,… --prompt prompt.md --output adjudication.json --review-record record.json [--batch-size 25]'
    );
}
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const runtime = await import('../../packages/mock-data-generator/dist/index.js');
const roles = Object.keys(runtime.SEMANTIC_ROLE_REGISTRY);
const statusRoles = roles.filter((role) => runtime.SEMANTIC_ROLE_REGISTRY[role].family === 'status');
const packet = JSON.parse(await readFile(packetPath, 'utf8'));
// The packet must have been judged against the runtime's role vocabulary. The registry fingerprint
// also covers routing policy flags that do not change what a judge could label, so the vocabulary
// is compared by role name; both fingerprints go into the review record.
const packetRoles = new Set([
    ...(packet.candidateRoles?.registered ?? []),
    ...(packet.items?.[0]?.candidateRoles?.registered ?? [])
]);
if (
    packetRoles.size === 0 ||
    [...packetRoles].some((role) => !roles.includes(role)) ||
    roles.some((role) => !packetRoles.has(role))
) {
    throw new TypeError('packet was built for a different role vocabulary');
}
const promptSha256 = sha256(await readFile(promptPath, 'utf8'));
const judges = judgesSpec.split(',').map((entry) => {
    const [judgeId, model] = entry.split('=');
    return { judgeId, model };
});
const batchItems = new Map(
    batchPacket(packet, batchSize).map((batch) => [batch.batchId, batch.items.map((item) => item.itemId)])
);
const { runs, problems } = await loadJudgeRuns({ runsDir, judges, batchItems, format: 'mockgen-role-judgments' });
const adjudication = adjudicatePacket({
    packet,
    judgeRuns: runs.map((run) => ({ ...run, promptSha256 })),
    roles,
    statusRoles
});
adjudication.problems = problems;
const adjudicationText = `${JSON.stringify(adjudication, null, 2)}\n`;
await writeFile(output, adjudicationText, 'utf8');
const record = {
    format: 'mockgen-label-review-record',
    version: 1,
    subject: 'semantic-role labels',
    method: 'model-panel-consensus',
    humanVerified: false,
    judges: judges.map((judge) => ({ ...judge, promptSha256 })),
    guidelineSha256: packet.guidelineSha256,
    registryFingerprint: packet.registryFingerprint,
    adjudicationSha256: sha256(adjudicationText),
    consistencySha256: sha256(JSON.stringify(adjudication.consistency)),
    note: 'Labels are majority decisions of independent model judges on structural metadata. No human verified them.'
};
await writeFile(recordOutput, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
process.stdout.write(
    `${JSON.stringify({ items: packet.items.length, problems: problems.length, consistency: adjudication.consistency })}\n`
);
