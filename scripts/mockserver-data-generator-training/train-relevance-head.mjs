#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createMiniLmTextEmbedder, loadOnnxBackend } from '../../packages/mock-data-generator/dist/index.js';
import {
    evaluateRelevanceHead,
    relevanceDataFingerprint,
    trainRelevanceHead,
    validateRelevanceDataset
} from './lib/relevance-train.mjs';

function argument(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

const argumentsByName = Object.fromEntries(
    [
        '--dataset',
        '--train-ids',
        '--calibration-ids',
        '--sealed-ids',
        '--encoder',
        '--vocabulary',
        '--encoder-sha256',
        '--vocabulary-sha256',
        '--output-head',
        '--output-report'
    ].map((name) => [name, argument(name)])
);
if (Object.values(argumentsByName).some((value) => !value)) {
    throw new Error(
        'Usage: train-relevance-head.mjs --dataset reviewed.json --train-ids train.json --calibration-ids calibration.json --sealed-ids sealed.json --encoder model.onnx --vocabulary vocab.txt --encoder-sha256 SHA256 --vocabulary-sha256 SHA256 --output-head head.json --output-report report.json'
    );
}

// Optional deterministic fit configuration; the trainer validates every bound.
const fit = Object.fromEntries(
    [
        ['epochs', '--epochs'],
        ['learningRate', '--learning-rate'],
        ['l2', '--l2']
    ]
        .filter(([, flag]) => argument(flag) !== undefined)
        .map(([key, flag]) => [key, Number(argument(flag))])
);
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const [rows, trainIds, calibrationIds, sealedIds] = await Promise.all([
    readJson(argumentsByName['--dataset']),
    readJson(argumentsByName['--train-ids']),
    readJson(argumentsByName['--calibration-ids']),
    readJson(argumentsByName['--sealed-ids'])
]);
validateRelevanceDataset({
    rows,
    trainIds,
    calibrationIds,
    sealedIds,
    encoderSha256: argumentsByName['--encoder-sha256'],
    vocabularySha256: argumentsByName['--vocabulary-sha256']
});
for (const [path, expected] of [
    [argumentsByName['--encoder'], argumentsByName['--encoder-sha256']],
    [argumentsByName['--vocabulary'], argumentsByName['--vocabulary-sha256']]
]) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) {
        hash.update(chunk);
    }
    if (hash.digest('hex') !== expected) {
        throw new TypeError('Relevance training encoder artifact fingerprint mismatch');
    }
}
const embedder = await createMiniLmTextEmbedder({
    modelPath: argumentsByName['--encoder'],
    vocabularyPath: argumentsByName['--vocabulary'],
    hiddenSize: 384,
    maxWordPieceTokens: 64,
    expectedEncoderSha256: argumentsByName['--encoder-sha256'],
    expectedVocabularySha256: argumentsByName['--vocabulary-sha256'],
    backend: await loadOnnxBackend()
});
try {
    const { head, calibration } = await trainRelevanceHead({
        rows,
        trainIds,
        calibrationIds,
        sealedIds,
        encoderSha256: argumentsByName['--encoder-sha256'],
        vocabularySha256: argumentsByName['--vocabulary-sha256'],
        embedder,
        fit
    });
    const sealedRows = rows.filter(({ id }) => sealedIds.includes(id));
    const sealed = await evaluateRelevanceHead({ head, rows: sealedRows, embedder });
    await writeFile(argumentsByName['--output-head'], `${JSON.stringify(head, null, 2)}\n`, 'utf8');
    await writeFile(
        argumentsByName['--output-report'],
        `${JSON.stringify(
            {
                format: 'mockgen-relevance-report',
                version: 1,
                headSha256: createHash('sha256').update(JSON.stringify(head)).digest('hex'),
                sealedDatasetFingerprint: relevanceDataFingerprint(
                    sealedIds.map((id) => sealedRows.find((row) => row.id === id))
                ),
                calibration,
                sealed
            },
            null,
            2
        )}\n`,
        'utf8'
    );
    process.stdout.write(
        'Wrote an unqualified development relevance head and partition metrics. Do not package it without reviewed gates and approval.\n'
    );
} finally {
    await embedder.dispose();
}
