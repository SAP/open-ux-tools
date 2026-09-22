#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createMiniLmTextEmbedder, loadOnnxBackend } from '../../packages/mock-data-generator/dist/index.js';
import { validateV3Dataset } from './lib/v3-export.mjs';
import { trainV3Head } from './lib/v3-train.mjs';
import { verifyV3TrainingArtifacts } from './lib/v3-artifact-preflight.mjs';

function argument(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}
const artifactPath = argument('--artifact');
const manifestPath = argument('--manifest');
const vocabulary = argument('--vocabulary');
const encoder = argument('--encoder');
const output = argument('--output');
const encoderSha256 = argument('--encoder-sha256');
const trainIdsPath = argument('--train-ids');
const calibrationIdsPath = argument('--calibration-ids');
// Optional deterministic fit configuration; the trainer validates every bound.
const pretrainedPath = argument('--pretrained-head');
const fit = Object.fromEntries(
    [
        ['epochs', '--epochs'],
        ['learningRate', '--learning-rate'],
        ['l2', '--l2']
    ]
        .filter(([, flag]) => argument(flag) !== undefined)
        .map(([key, flag]) => [key, Number(argument(flag))])
);
if (
    !artifactPath ||
    !manifestPath ||
    !vocabulary ||
    !encoder ||
    !output ||
    !encoderSha256 ||
    !trainIdsPath ||
    !calibrationIdsPath
) {
    throw new Error(
        'Usage: train-v3-head.mjs --artifact export.json --manifest models/manifest.json --vocabulary vocab.txt --encoder model.onnx --encoder-sha256 SHA256 --train-ids ids.json --calibration-ids ids.json --output head.json [--epochs N] [--learning-rate X] [--l2 X] [--pretrained-head head.json]'
    );
}
if (pretrainedPath) fit.pretrained = JSON.parse(await readFile(pretrainedPath, 'utf8'));
const artifact = JSON.parse(await readFile(artifactPath, 'utf8'));
await validateV3Dataset({ artifact, vocabulary });
await verifyV3TrainingArtifacts({
    manifest: JSON.parse(await readFile(manifestPath, 'utf8')),
    artifact,
    encoder,
    vocabulary,
    encoderSha256
});
const trainIds = JSON.parse(await readFile(trainIdsPath, 'utf8'));
const calibrationIds = JSON.parse(await readFile(calibrationIdsPath, 'utf8'));
const embedder = await createMiniLmTextEmbedder({
    modelPath: encoder,
    vocabularyPath: vocabulary,
    hiddenSize: 384,
    maxWordPieceTokens: 64,
    expectedEncoderSha256: encoderSha256,
    expectedVocabularySha256: artifact.tokenizer.vocabularySha256,
    backend: await loadOnnxBackend()
});
try {
    const head = await trainV3Head({ artifact, trainIds, calibrationIds, encoderSha256, embedder, fit });
    await writeFile(output, `${JSON.stringify(head, null, 2)}\n`, 'utf8');
    process.stdout.write(`Wrote unqualified development head to ${output}\n`);
} finally {
    await embedder.dispose();
}
