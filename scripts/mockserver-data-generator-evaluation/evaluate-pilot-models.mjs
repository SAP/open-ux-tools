#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
    artifactRecord,
    mergeIsolatedReports,
    parseHeldOutPrompt,
    percentile,
    scoreClassifierPredictions,
    scoreSftCases,
    selectGovernedClassifierRows
} from './lib/evaluation.mjs';

const SCRIPT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const REPOSITORY_ROOT = resolve(SCRIPT_ROOT, '../..');
const GENERATOR_ENTRY = join(REPOSITORY_ROOT, 'packages/mockserver-data-generator/dist/index.js');
const DEFAULT_SEED = 2_026_090_4;

function usage() {
    return [
        'Usage:',
        '  node scripts/mockserver-data-generator-evaluation/evaluate-pilot-models.mjs \\',
        '    --pilot-root <path> --output <report.json> [options]',
        '',
        'Options:',
        '  --sft-candidates <int8,int4,fp32>  Candidates to execute (default: int8,int4)',
        '  --max-sft-cases <number>            Fixed cohort prefix to execute (default: all)',
        '  --evidence-dir <path>                Write exact generated rows for fresh judging',
        '  --skip-classifier                    Do not run the classifier cohort',
        '  --skip-sft                           Do not run SFT candidates',
        '  --seed <integer>                     Reproducible generation seed',
        '',
        'The report never contains generated values or absolute pilot paths. Keep evidence-dir',
        'outside the repository and bind fresh judge reports to its recorded SHA-256.'
    ].join('\n');
}

function parseArguments(argv) {
    const options = {
        candidates: ['int8', 'int4'],
        seed: DEFAULT_SEED,
        skipClassifier: false,
        skipSft: false,
        isolatedWorker: false
    };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        const value = argv[index + 1];
        if (argument === '--help' || argument === '-h') {
            process.stdout.write(`${usage()}\n`);
            process.exit(0);
        } else if (argument === '--skip-classifier') {
            options.skipClassifier = true;
        } else if (argument === '--skip-sft') {
            options.skipSft = true;
        } else if (argument === '--isolated-worker') {
            options.isolatedWorker = true;
        } else if (argument === '--pilot-root' && value) {
            options.pilotRoot = resolve(value);
            index += 1;
        } else if (argument === '--output' && value) {
            options.output = resolve(value);
            index += 1;
        } else if (argument === '--evidence-dir' && value) {
            options.evidenceDir = resolve(value);
            index += 1;
        } else if (argument === '--sft-candidates' && value) {
            options.candidates = value.split(',').filter(Boolean);
            index += 1;
        } else if (argument === '--max-sft-cases' && value) {
            options.maxSftCases = Number.parseInt(value, 10);
            index += 1;
        } else if (argument === '--seed' && value) {
            options.seed = Number.parseInt(value, 10);
            index += 1;
        } else {
            throw new TypeError(`Unknown or incomplete argument: ${argument}`);
        }
    }
    if (!options.pilotRoot || !options.output) {
        throw new TypeError('--pilot-root and --output are required');
    }
    if (!Number.isSafeInteger(options.seed)) {
        throw new TypeError('--seed must be a safe integer');
    }
    if (options.maxSftCases !== undefined && (!Number.isSafeInteger(options.maxSftCases) || options.maxSftCases <= 0)) {
        throw new TypeError('--max-sft-cases must be a positive integer');
    }
    const supported = new Set(['fp32', 'int8', 'int4']);
    if (options.candidates.length === 0 || options.candidates.some((candidate) => !supported.has(candidate))) {
        throw new TypeError('--sft-candidates accepts only fp32,int8,int4');
    }
    return options;
}

function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function fingerprint(value) {
    return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function parseJsonLines(content) {
    return content
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line));
}

function nowMilliseconds() {
    return Number(process.hrtime.bigint()) / 1_000_000;
}

function memoryBytes() {
    return {
        rss: process.memoryUsage().rss,
        processMaxRss: process.resourceUsage().maxRSS * 1024
    };
}

function sanitizeError(error, pilotRoot) {
    const message = error instanceof Error ? error.message : String(error);
    return message.replaceAll(pilotRoot, '<pilot-root>').slice(0, 500);
}

function classifierPaths(pilotRoot) {
    return {
        encoder: join(pilotRoot, 'packages/mockgen-models/retrieval-model/model_int8.onnx'),
        vocabulary: join(pilotRoot, 'packages/mockgen-models/retrieval-model/vocab.txt'),
        head: join(pilotRoot, 'packages/mockgen-core/models/embedding-classifier-head.json'),
        cohort: join(pilotRoot, 'data/pilots/benchmark-gold-judge-full-2026-05-26/final-gold-labels.jsonl')
    };
}

function sftPaths(pilotRoot, candidate) {
    const directories = {
        fp32: 'var/sft/onnx-export-fp32',
        int8: 'var/sft/onnx-export',
        int4: 'var/sft/onnx-export-int4'
    };
    const filenames = { fp32: 'model.onnx', int8: 'model_int8.onnx', int4: 'model_int4.onnx' };
    const directory = join(pilotRoot, directories[candidate]);
    return {
        model: join(directory, filenames[candidate]),
        tokenizer: join(directory, 'tokenizer.json'),
        cohort: join(pilotRoot, 'training/sft/eval/held-out-prompts.json')
    };
}

async function runClassifier(generator, pilotRoot) {
    const paths = classifierPaths(pilotRoot);
    const artifacts = [
        artifactRecord('classifier-encoder-int8', paths.encoder),
        artifactRecord('classifier-head', paths.head),
        artifactRecord('classifier-vocabulary', paths.vocabulary),
        artifactRecord('classifier-gold-cohort', paths.cohort)
    ];
    const cohort = parseJsonLines(await readFile(paths.cohort, 'utf8'));
    const governed = selectGovernedClassifierRows(cohort);
    const head = JSON.parse(await readFile(paths.head, 'utf8'));
    const componentFingerprint = fingerprint(artifacts.slice(0, 3));
    const before = memoryBytes();
    const loadStart = nowMilliseconds();
    const backend = await generator.loadOnnxBackend();
    const embedder = await generator.createMiniLmTextEmbedder({
        modelPath: paths.encoder,
        vocabularyPath: paths.vocabulary,
        hiddenSize: head.dim,
        backend
    });
    const classifier = generator.createEmbeddingSemanticClassifier({
        fingerprint: componentFingerprint,
        head,
        embedder
    });
    const loadMs = nowMilliseconds() - loadStart;
    const predictions = [];
    const latencies = [];
    try {
        for (const row of governed.eligible) {
            const start = nowMilliseconds();
            const result = await classifier.classify(
                {
                    entityName: row.propertyContext.entity,
                    propertyName: row.propertyContext.property,
                    primitiveType: row.propertyContext.type,
                    label: row.propertyContext.label,
                    annotations: []
                },
                new AbortController().signal
            );
            latencies.push(nowMilliseconds() - start);
            predictions.push({
                expected: row.hint,
                predicted: result.role,
                confidence: result.confidence,
                routeThreshold: result.routeThreshold
            });
        }
    } finally {
        await embedder.dispose();
    }
    const after = memoryBytes();
    return {
        componentFingerprint,
        artifacts,
        cohort: {
            total: cohort.length,
            eligible: governed.eligible.length,
            quarantined: governed.quarantined.length,
            policy: 'llm_agreement or verified human adjudication; unresolved automated-as-human rows quarantined'
        },
        metrics: {
            ...scoreClassifierPredictions(predictions),
            loadMs,
            latencyMs: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) },
            rssDeltaBytes: after.rss - before.rss,
            processMaxRssBytes: after.processMaxRss
        },
        predictionFingerprint: fingerprint(predictions)
    };
}

async function writeCandidateEvidence(evidenceDirectory, candidate, evidence) {
    await mkdir(evidenceDirectory, { recursive: true });
    const target = join(evidenceDirectory, `sft-${candidate}-evidence.json`);
    await writeFile(target, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });
    return artifactRecord(`sft-${candidate}-judge-evidence`, target);
}

async function runSftCandidate(generator, options, candidate) {
    const paths = sftPaths(options.pilotRoot, candidate);
    const artifacts = [
        artifactRecord(`sft-${candidate}-model`, paths.model),
        artifactRecord(`sft-${candidate}-tokenizer`, paths.tokenizer),
        artifactRecord('sft-held-out-cohort', paths.cohort)
    ];
    const componentFingerprint = fingerprint(artifacts.slice(0, 2));
    const rawCohort = JSON.parse(await readFile(paths.cohort, 'utf8'));
    const allCases = Object.entries(rawCohort)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, value]) => parseHeldOutPrompt(id, value));
    const cohort = allCases.slice(0, options.maxSftCases ?? allCases.length);
    const tokenizerJson = JSON.parse(await readFile(paths.tokenizer, 'utf8'));
    const before = memoryBytes();
    const loadStart = nowMilliseconds();
    const backend = await generator.loadCausalOnnxBackend();
    const session = await generator.createCausalOnnxSession({
        modelPath: paths.model,
        config: { numLayers: 30, numKeyValueHeads: 3, headDimension: 64 },
        backend
    });
    const sft = generator.createPilotSftGenerator({
        fingerprint: componentFingerprint,
        textGenerator: generator.createCausalTextGenerator({
            tokenizer: generator.createSmolLm2Tokenizer(tokenizerJson),
            session
        }),
        sampling: {
            temperature: 0.6,
            topP: 0.9,
            repetitionPenalty: 1.15,
            noRepeatNgramSize: 4,
            maxNewTokens: 400
        }
    });
    const loadMs = nowMilliseconds() - loadStart;
    const results = [];
    try {
        for (let index = 0; index < cohort.length; index += 1) {
            const entry = cohort[index];
            const expectedKeys = entry.fields.map(({ name }) => name);
            const start = nowMilliseconds();
            try {
                const generated = await sft.generate(
                    {
                        service: {
                            urlPath: `/evaluation/${entry.domain}`,
                            alias: entry.domain,
                            odataVersion: '4.0'
                        },
                        entityName: entry.entityName,
                        fields: entry.fields,
                        rowCount: 1,
                        seed: options.seed + index,
                        locale: 'en'
                    },
                    new AbortController().signal
                );
                results.push({
                    id: entry.id,
                    expectedKeys,
                    elapsedMs: nowMilliseconds() - start,
                    row: generated.rows[0]
                });
            } catch (error) {
                results.push({
                    id: entry.id,
                    expectedKeys,
                    elapsedMs: nowMilliseconds() - start,
                    error: sanitizeError(error, options.pilotRoot)
                });
            }
        }
    } finally {
        await sft.dispose?.();
    }
    const after = memoryBytes();
    const scored = scoreSftCases(results);
    const evidence = {
        schemaVersion: 1,
        candidate,
        componentFingerprint,
        seed: options.seed,
        cohortFingerprint: artifacts[2].sha256,
        cases: results.map(({ id, expectedKeys, error, row }) => ({
            id,
            expectedKeys,
            ...(error ? { error } : {}),
            ...(row ? { row } : {})
        }))
    };
    const evidenceArtifact = options.evidenceDir
        ? await writeCandidateEvidence(options.evidenceDir, candidate, evidence)
        : undefined;
    return {
        candidate,
        componentFingerprint,
        artifacts,
        cohort: { available: allCases.length, executed: cohort.length, seed: options.seed, locale: 'en' },
        metrics: {
            ...scored,
            loadMs,
            rssDeltaBytes: after.rss - before.rss,
            processMaxRssBytes: after.processMaxRss
        },
        judgeEvidence: evidenceArtifact ?? {
            available: false,
            reason: 'Re-run with --evidence-dir and keep the output outside the repository.'
        }
    };
}

function baseReport() {
    return {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        harness: {
            repository: 'SAP/open-ux-tools',
            package: '@sap-ux/mockserver-data-generator',
            generatorEntry: basename(GENERATOR_ENTRY),
            node: process.version,
            platform: `${process.platform}-${process.arch}`
        },
        policy: {
            generatedValuesInReport: false,
            modelWeightsInRepository: false,
            freshJudgeRequiredForPromotion: true,
            wasmDecision: 'deferred until native candidates establish the dependency-closure and latency baseline',
            processIsolation: true
        }
    };
}

async function runInProcess(options) {
    const generator = await import(pathToFileURL(GENERATOR_ENTRY).href);
    const report = baseReport();
    if (!options.skipClassifier) {
        report.classifier = await runClassifier(generator, options.pilotRoot);
    }
    if (!options.skipSft) {
        report.sft = [];
        for (const candidate of options.candidates) {
            report.sft.push(await runSftCandidate(generator, options, candidate));
        }
    }
    return report;
}

function workerArguments(options, output, component, candidate) {
    const result = ['--pilot-root', options.pilotRoot, '--output', output, '--isolated-worker'];
    if (component === 'classifier') {
        result.push('--skip-sft');
    } else {
        result.push('--skip-classifier', '--sft-candidates', candidate, '--seed', String(options.seed));
        if (options.maxSftCases !== undefined) {
            result.push('--max-sft-cases', String(options.maxSftCases));
        }
        if (options.evidenceDir) {
            result.push('--evidence-dir', options.evidenceDir);
        }
    }
    return result;
}

function executeWorker(options, output, component, candidate) {
    execFileSync(
        process.execPath,
        [fileURLToPath(import.meta.url), ...workerArguments(options, output, component, candidate)],
        {
            cwd: REPOSITORY_ROOT,
            env: process.env,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        }
    );
}

async function runIsolated(options) {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'mockgen-model-evaluation-'));
    try {
        let classifierReport;
        const sftReports = [];
        if (!options.skipClassifier) {
            const output = join(temporaryRoot, 'classifier.json');
            executeWorker(options, output, 'classifier');
            classifierReport = JSON.parse(await readFile(output, 'utf8'));
        }
        if (!options.skipSft) {
            for (const candidate of options.candidates) {
                const output = join(temporaryRoot, `sft-${candidate}.json`);
                executeWorker(options, output, 'sft', candidate);
                sftReports.push(JSON.parse(await readFile(output, 'utf8')));
            }
        }
        return { ...baseReport(), ...mergeIsolatedReports(classifierReport, sftReports) };
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    const report = options.isolatedWorker ? await runInProcess(options) : await runIsolated(options);
    report.reportFingerprint = fingerprint(report);
    await mkdir(resolve(options.output, '..'), { recursive: true });
    await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(
        `${JSON.stringify({ output: options.output, reportFingerprint: report.reportFingerprint }, null, 2)}\n`
    );
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n\n${usage()}\n`);
    process.exitCode = 1;
});
