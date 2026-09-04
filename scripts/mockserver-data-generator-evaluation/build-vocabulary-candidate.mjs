#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSmolLm2Tokenizer } from '../../packages/mockserver-data-generator/dist/index.js';

function usage() {
    return [
        'Usage:',
        '  node scripts/mockserver-data-generator-evaluation/build-vocabulary-candidate.mjs \\',
        '    --tokenizer <tokenizer.json> --training-jsonl <train.jsonl> \\',
        '    --output <new-directory> --policy <training-closure|pretrained-rank> [options]',
        '',
        'Options:',
        '  --target-vocab-size <number>           Fill to an exact vocabulary size',
        '  --fixed-model-bytes <number>           Fixed low-bit graph bytes',
        '  --bytes-per-vocabulary-row <number>    Low-bit bytes per vocabulary row',
        '  --target-model-bytes <number>          Generator model byte target',
        '',
        'All three model-size options must be supplied together. The output evidence',
        'contains fingerprints and aggregate counts, never training text or absolute paths.'
    ].join('\n');
}

function positiveInteger(value, label) {
    if (typeof value !== 'string' || !/^[1-9]\d*$/u.test(value)) {
        throw new TypeError(`${label} must be a positive decimal integer`);
    }
    const result = Number(value);
    if (!Number.isSafeInteger(result)) {
        throw new TypeError(`${label} must be a positive decimal integer`);
    }
    return result;
}

function validateBuildOptions(options) {
    if (
        options === null ||
        typeof options !== 'object' ||
        !['tokenizer', 'trainingJsonl', 'output'].every(
            (property) => typeof options[property] === 'string' && options[property].length > 0
        )
    ) {
        throw new TypeError('tokenizer, trainingJsonl, and output must be non-empty paths');
    }
    if (!['training-closure', 'pretrained-rank'].includes(options.policy)) {
        throw new TypeError('policy must be training-closure or pretrained-rank');
    }
    if (
        options.targetVocabSize !== undefined &&
        (!Number.isSafeInteger(options.targetVocabSize) || options.targetVocabSize <= 0)
    ) {
        throw new TypeError('targetVocabSize must be a positive safe integer');
    }
    if (options.policy === 'pretrained-rank' && options.targetVocabSize === undefined) {
        throw new TypeError('targetVocabSize is required for pretrained-rank');
    }
    if (options.sizeProjection !== undefined) {
        const properties = ['bytesPerVocabularyRow', 'fixedModelBytes', 'targetModelBytes'];
        const supplied =
            options.sizeProjection !== null && typeof options.sizeProjection === 'object'
                ? Object.keys(options.sizeProjection).sort()
                : [];
        if (
            supplied.join(',') !== properties.join(',') ||
            properties.some(
                (property) =>
                    !Number.isSafeInteger(options.sizeProjection[property]) || options.sizeProjection[property] <= 0
            )
        ) {
            throw new TypeError('sizeProjection must contain three positive safe integers');
        }
    }
}

/**
 * Parse the standalone vocabulary-candidate CLI.
 *
 * @param {string[]} argv raw arguments
 * @returns {Record<string, any>} normalized options
 */
export function parseVocabularyArguments(argv) {
    const argumentsWithoutSeparator = argv[0] === '--' ? argv.slice(1) : argv;
    const options = {};
    const size = {};
    for (let index = 0; index < argumentsWithoutSeparator.length; index += 1) {
        const argument = argumentsWithoutSeparator[index];
        const value = argumentsWithoutSeparator[index + 1];
        if (argument === '--help' || argument === '-h') {
            process.stdout.write(`${usage()}\n`);
            process.exit(0);
        } else if (argument === '--tokenizer' && value) {
            options.tokenizer = resolve(value);
            index += 1;
        } else if (argument === '--training-jsonl' && value) {
            options.trainingJsonl = resolve(value);
            index += 1;
        } else if (argument === '--output' && value) {
            options.output = resolve(value);
            index += 1;
        } else if (argument === '--policy' && value) {
            options.policy = value;
            index += 1;
        } else if (argument === '--target-vocab-size' && value) {
            options.targetVocabSize = positiveInteger(value, '--target-vocab-size');
            index += 1;
        } else if (argument === '--fixed-model-bytes' && value) {
            size.fixedModelBytes = positiveInteger(value, '--fixed-model-bytes');
            index += 1;
        } else if (argument === '--bytes-per-vocabulary-row' && value) {
            size.bytesPerVocabularyRow = positiveInteger(value, '--bytes-per-vocabulary-row');
            index += 1;
        } else if (argument === '--target-model-bytes' && value) {
            size.targetModelBytes = positiveInteger(value, '--target-model-bytes');
            index += 1;
        } else {
            throw new TypeError(`Unknown or incomplete argument: ${argument}`);
        }
    }
    if (!options.tokenizer || !options.trainingJsonl || !options.output || !options.policy) {
        throw new TypeError('--tokenizer, --training-jsonl, --output, and --policy are required');
    }
    if (!['training-closure', 'pretrained-rank'].includes(options.policy)) {
        throw new TypeError('--policy must be training-closure or pretrained-rank');
    }
    if (options.policy === 'pretrained-rank' && options.targetVocabSize === undefined) {
        throw new TypeError('--target-vocab-size is required for pretrained-rank');
    }
    const sizeValues = Object.keys(size).length;
    if (sizeValues !== 0 && sizeValues !== 3) {
        throw new TypeError('All model-size projection options must be supplied together');
    }
    if (sizeValues === 3) {
        options.sizeProjection = size;
    }
    return options;
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJson).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function mergePair(entry) {
    if (Array.isArray(entry) && entry.length === 2 && entry.every((value) => typeof value === 'string')) {
        return entry;
    }
    if (typeof entry === 'string') {
        const separator = entry.indexOf(' ');
        if (separator > 0 && separator < entry.length - 1) {
            return [entry.slice(0, separator), entry.slice(separator + 1)];
        }
    }
    throw new TypeError('Tokenizer merge entries must be strings or two-string arrays');
}

function regularFile(path, label) {
    const details = lstatSync(path);
    if (details.isSymbolicLink() || !details.isFile()) {
        throw new TypeError(`${label} must be a regular non-symbolic-link file`);
    }
    return details;
}

function validateTokenizer(value) {
    if (
        value?.model?.type !== 'BPE' ||
        value.model.vocab === null ||
        typeof value.model.vocab !== 'object' ||
        Array.isArray(value.model.vocab) ||
        !Array.isArray(value.model.merges)
    ) {
        throw new TypeError('Tokenizer must contain a BPE vocabulary and merge list');
    }
    const ids = Object.values(value.model.vocab);
    if (
        ids.length === 0 ||
        ids.some((id) => !Number.isSafeInteger(id) || id < 0) ||
        new Set(ids).size !== ids.length ||
        Math.max(...ids) + 1 !== ids.length
    ) {
        throw new TypeError('Tokenizer vocabulary ids must be unique and contiguous');
    }
}

function dependencyClosure(initial, dependencies, vocabulary) {
    const result = new Set(initial);
    const pending = [...result];
    while (pending.length > 0) {
        const token = pending.pop();
        for (const dependency of dependencies.get(token) ?? []) {
            if (!vocabulary.has(dependency)) {
                throw new TypeError('Tokenizer merge dependency is absent from the vocabulary');
            }
            if (!result.has(dependency)) {
                result.add(dependency);
                pending.push(dependency);
            }
        }
    }
    return result;
}

function remapTokenizer(source, keepTokens) {
    const retained = Object.entries(source.model.vocab)
        .filter(([token]) => keepTokens.has(token))
        .sort((left, right) => left[1] - right[1]);
    const oldToNew = Object.fromEntries(retained.map(([, oldId], newId) => [oldId, newId]));
    const vocabulary = Object.fromEntries(retained.map(([token], newId) => [token, newId]));
    const candidate = structuredClone(source);
    candidate.model.vocab = vocabulary;
    candidate.model.merges = source.model.merges.filter((entry) =>
        Object.hasOwn(vocabulary, mergePair(entry).join(''))
    );
    for (const added of candidate.added_tokens ?? []) {
        added.id = oldToNew[source.model.vocab[added.content]];
    }
    return { candidate, oldToNew };
}

/**
 * Build a byte-safe, reproducible BPE vocabulary candidate from training-only evidence.
 *
 * @param {Record<string, any>} options normalized build options
 * @returns {Promise<Record<string, any>>} portable evidence report
 */
export async function buildVocabularyCandidate(options) {
    validateBuildOptions(options);
    const tokenizerDetails = regularFile(options.tokenizer, 'Tokenizer');
    const trainingDetails = regularFile(options.trainingJsonl, 'Training JSONL');
    let outputExists = false;
    try {
        lstatSync(options.output);
        outputExists = true;
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            throw error;
        }
    }
    if (outputExists) {
        throw new TypeError('Vocabulary candidate output must not already exist');
    }

    const tokenizerSource = await readFile(options.tokenizer, 'utf8');
    const trainingSource = await readFile(options.trainingJsonl, 'utf8');
    const source = JSON.parse(tokenizerSource);
    validateTokenizer(source);
    const sourceTokenizer = createSmolLm2Tokenizer(source);
    const records = trainingSource
        .split(/\r?\n/u)
        .filter((line) => line.trim().length > 0)
        .map((line, index) => {
            const record = JSON.parse(line);
            if (typeof record.text !== 'string') {
                throw new TypeError(`Training JSONL record ${index + 1} must contain a string text field`);
            }
            return record.text;
        });
    if (records.length === 0) {
        throw new TypeError('Training JSONL must contain at least one record');
    }

    const vocabulary = new Map(Object.entries(source.model.vocab));
    const tokenById = new Map([...vocabulary].map(([token, id]) => [id, token]));
    const dependencies = new Map();
    const mergeOutputs = [];
    for (const entry of source.model.merges) {
        const pair = mergePair(entry);
        const output = pair.join('');
        if (dependencies.has(output)) {
            throw new TypeError('Tokenizer has duplicate merge outputs');
        }
        dependencies.set(output, pair);
        mergeOutputs.push(output);
    }
    const baseTokens = new Set([...vocabulary.keys()].filter((token) => !dependencies.has(token)));
    const addedTokens = new Set((source.added_tokens ?? []).map(({ content }) => content));
    for (const token of addedTokens) {
        if (!vocabulary.has(token)) {
            throw new TypeError('Tokenizer added token is absent from the vocabulary');
        }
    }

    const sourceEncodings = records.map((text) => sourceTokenizer.encode(text));
    const observedIds = new Set(sourceEncodings.flat());
    const initial = new Set([...baseTokens, ...addedTokens]);
    if (options.policy === 'training-closure') {
        for (const id of observedIds) {
            const token = tokenById.get(id);
            if (token === undefined) {
                throw new TypeError('Production tokenizer emitted an unknown vocabulary id');
            }
            initial.add(token);
        }
    }
    const keepTokens = dependencyClosure(initial, dependencies, vocabulary);
    const mandatoryClosure = keepTokens.size;
    const target = options.targetVocabSize ?? mandatoryClosure;
    if (target < mandatoryClosure) {
        throw new TypeError(`targetVocabSize ${target} is smaller than mandatory closure ${mandatoryClosure}`);
    }
    if (target > vocabulary.size) {
        throw new TypeError(`targetVocabSize ${target} exceeds source vocabulary ${vocabulary.size}`);
    }
    for (const token of mergeOutputs) {
        if (keepTokens.size >= target) {
            break;
        }
        const additions = dependencyClosure([token], dependencies, vocabulary);
        const missing = [...additions].filter((entry) => !keepTokens.has(entry));
        if (keepTokens.size + missing.length <= target) {
            missing.forEach((entry) => keepTokens.add(entry));
        }
    }
    if (keepTokens.size !== target) {
        throw new TypeError(`Could not construct exact target vocabulary size ${target}`);
    }

    const { candidate, oldToNew } = remapTokenizer(source, keepTokens);
    const candidateTokenizer = createSmolLm2Tokenizer(candidate);
    let changedSequences = 0;
    let decodedMismatches = 0;
    let candidateTokens = 0;
    for (let index = 0; index < records.length; index += 1) {
        const sourceIds = sourceEncodings[index];
        const candidateIds = candidateTokenizer.encode(records[index]);
        candidateTokens += candidateIds.length;
        const expected = sourceIds.every((id) => oldToNew[id] !== undefined)
            ? sourceIds.map((id) => oldToNew[id])
            : undefined;
        const exact =
            expected !== undefined &&
            expected.length === candidateIds.length &&
            expected.every((id, position) => id === candidateIds[position]);
        if (!exact) {
            changedSequences += 1;
        }
        if (sourceTokenizer.decode(sourceIds) !== candidateTokenizer.decode(candidateIds)) {
            decodedMismatches += 1;
        }
    }
    if (options.policy === 'training-closure' && changedSequences > 0) {
        throw new Error('Training-closure candidate changed training tokenization');
    }
    if (decodedMismatches > 0) {
        throw new Error('Vocabulary candidate changed decoded training text');
    }

    const tokenizerOutput = `${JSON.stringify(candidate, null, 2)}\n`;
    const mappingOutput = `${JSON.stringify(oldToNew, null, 2)}\n`;
    const projectedBytes = options.sizeProjection
        ? options.sizeProjection.fixedModelBytes +
          candidateTokenizer.vocabSize * options.sizeProjection.bytesPerVocabularyRow
        : undefined;
    const report = {
        schemaVersion: 1,
        source: {
            tokenizer: {
                filename: basename(options.tokenizer),
                bytes: tokenizerDetails.size,
                sha256: sha256(tokenizerSource)
            },
            training: {
                filename: basename(options.trainingJsonl),
                bytes: trainingDetails.size,
                sha256: sha256(trainingSource),
                records: records.length
            }
        },
        selection: {
            policy: options.policy,
            evidenceScope: options.policy === 'training-closure' ? 'training-jsonl-only' : 'pretrained-merge-rank-only',
            sourceVocabSize: sourceTokenizer.vocabSize,
            candidateVocabSize: candidateTokenizer.vocabSize,
            baseTokens: baseTokens.size,
            addedTokens: addedTokens.size,
            observedTrainingTokenIds: options.policy === 'training-closure' ? observedIds.size : 0,
            mandatoryClosure,
            rankFillTokens: candidateTokenizer.vocabSize - mandatoryClosure,
            removedTokens: sourceTokenizer.vocabSize - candidateTokenizer.vocabSize,
            retainedMerges: candidate.model.merges.length
        },
        verification: {
            exactRemapping: changedSequences === 0,
            decodedTextExact: decodedMismatches === 0,
            changedSequences,
            sourceTokens: sourceEncodings.reduce((sum, ids) => sum + ids.length, 0),
            candidateTokens
        },
        artifacts: {
            tokenizer: {
                filename: 'tokenizer.json',
                bytes: Buffer.byteLength(tokenizerOutput),
                sha256: sha256(tokenizerOutput)
            },
            mapping: {
                filename: 'old-to-new-token-ids.json',
                bytes: Buffer.byteLength(mappingOutput),
                sha256: sha256(mappingOutput)
            }
        },
        ...(options.sizeProjection
            ? {
                  sizeProjection: {
                      ...options.sizeProjection,
                      projectedModelBytes: projectedBytes,
                      targetHeadroomBytes: options.sizeProjection.targetModelBytes - projectedBytes
                  }
              }
            : {})
    };
    report.reportFingerprint = sha256(canonicalJson(report));

    await mkdir(options.output);
    await Promise.all([
        writeFile(resolve(options.output, 'tokenizer.json'), tokenizerOutput, { flag: 'wx' }),
        writeFile(resolve(options.output, 'old-to-new-token-ids.json'), mappingOutput, { flag: 'wx' }),
        writeFile(resolve(options.output, 'vocabulary-evidence.json'), `${JSON.stringify(report, null, 2)}\n`, {
            flag: 'wx'
        })
    ]);
    return report;
}

async function main() {
    const options = parseVocabularyArguments(process.argv.slice(2));
    const report = await buildVocabularyCandidate(options);
    process.stdout.write(
        `${JSON.stringify({ output: options.output, reportFingerprint: report.reportFingerprint }, null, 2)}\n`
    );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n\n${usage()}\n`);
        process.exitCode = 1;
    });
}
