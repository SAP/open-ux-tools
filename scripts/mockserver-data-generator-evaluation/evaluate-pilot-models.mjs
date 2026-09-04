#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { cpus, tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { basename, dirname, join, relative, resolve } from 'node:path';
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
import { productionGenerationConfiguration } from '../mockserver-data-generator-dev-kit/lib/model-config.mjs';

const SCRIPT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const REPOSITORY_ROOT = resolve(SCRIPT_ROOT, '../..');
const GENERATOR_ROOT = join(REPOSITORY_ROOT, 'packages/mockserver-data-generator');
const GENERATOR_ENTRY = join(GENERATOR_ROOT, 'dist/index.js');
const GENERATOR_REQUIRE = createRequire(GENERATOR_ENTRY);
const DEFAULT_SEED = 2_026_090_4;

function decimalInteger(value, label) {
    if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(value)) {
        throw new TypeError(`${label} must be a decimal integer`);
    }
    const result = Number(value);
    if (!Number.isSafeInteger(result)) {
        throw new TypeError(`${label} must be a decimal integer`);
    }
    return result;
}

function usage() {
    return [
        'Usage:',
        '  node scripts/mockserver-data-generator-evaluation/evaluate-pilot-models.mjs \\',
        '    --pilot-root <path> --output <report.json> [options]',
        '',
        'Options:',
        '  --sft-candidates <int8,int4,fp32>  Candidates to execute (default: int8,int4)',
        '  --sft-candidate-manifest <path>     Repeatable external candidate manifest',
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

export function parseArguments(argv) {
    const argumentsWithoutSeparator = argv[0] === '--' ? argv.slice(1) : argv;
    /**
     * @type {{
     *   candidateManifests: string[];
     *   candidates?: string[];
     *   seed: number;
     *   skipClassifier: boolean;
     *   skipSft: boolean;
     *   isolatedWorker: boolean;
     *   pilotRoot?: string;
     *   output?: string;
     *   evidenceDir?: string;
     *   maxSftCases?: number;
     * }}
     */
    const options = {
        candidateManifests: [],
        seed: DEFAULT_SEED,
        skipClassifier: false,
        skipSft: false,
        isolatedWorker: false
    };
    for (let index = 0; index < argumentsWithoutSeparator.length; index += 1) {
        const argument = argumentsWithoutSeparator[index];
        const value = argumentsWithoutSeparator[index + 1];
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
        } else if (argument === '--sft-candidate-manifest' && value) {
            options.candidateManifests.push(resolve(value));
            index += 1;
        } else if (argument === '--max-sft-cases' && value) {
            options.maxSftCases = decimalInteger(value, '--max-sft-cases');
            index += 1;
        } else if (argument === '--seed' && value) {
            options.seed = decimalInteger(value, '--seed');
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
    options.candidates ??= options.candidateManifests.length === 0 ? ['int8', 'int4'] : [];
    const supported = new Set(['fp32', 'int8', 'int4']);
    if (options.candidates.some((candidate) => !supported.has(candidate))) {
        throw new TypeError('--sft-candidates accepts only fp32,int8,int4');
    }
    if (!options.skipSft && options.candidates.length === 0 && options.candidateManifests.length === 0) {
        throw new TypeError('At least one SFT candidate or candidate manifest is required');
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

function sha256File(path) {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function contentArtifact(id, filename, content) {
    return Object.freeze({
        id,
        filename,
        bytes: Buffer.byteLength(content),
        sha256: createHash('sha256').update(content).digest('hex')
    });
}

function fingerprintDirectory(root) {
    const rootDetails = lstatSync(root);
    if (rootDetails.isSymbolicLink() || !rootDetails.isDirectory()) {
        throw new Error('Compiled generator root must be a non-symbolic-link directory');
    }
    const pending = [root];
    const files = [];
    while (pending.length > 0) {
        const directory = pending.pop();
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const path = join(directory, entry.name);
            const details = lstatSync(path);
            if (details.isSymbolicLink()) {
                throw new Error('Compiled generator output must not contain symbolic links');
            }
            if (details.isDirectory()) {
                pending.push(path);
            } else if (details.isFile()) {
                files.push({
                    path: relative(root, path).replaceAll('\\', '/'),
                    bytes: details.size,
                    sha256: sha256File(path)
                });
            } else {
                throw new Error('Compiled generator output must contain only regular files and directories');
            }
        }
    }
    files.sort((left, right) => left.path.localeCompare(right.path));
    return fingerprint(files);
}

function sourceState() {
    return {
        codeCommit: execFileSync('git', ['-C', REPOSITORY_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        sourceClean:
            execFileSync('git', ['-C', REPOSITORY_ROOT, 'status', '--porcelain=v1'], { encoding: 'utf8' }).trim()
                .length === 0
    };
}

function runtimeBinding() {
    const runtime = GENERATOR_REQUIRE('onnxruntime-node');
    const version = runtime?.env?.versions?.node;
    if (typeof version !== 'string' || version.length === 0) {
        throw new Error('Could not resolve the ONNX Runtime version used by the evaluation');
    }
    return { package: 'onnxruntime-node', version };
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

function sanitizeError(error, ...roots) {
    const message = error instanceof Error ? error.message : String(error);
    return roots.reduce((sanitized, root) => sanitized.replaceAll(root, '<artifact-root>'), message).slice(0, 500);
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
        configuration: join(directory, 'config.json'),
        cohort: join(pilotRoot, 'training/sft/eval/held-out-prompts.json')
    };
}

function manifestRecord(value, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value;
}

function manifestString(value, label) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
}

function resolveManifestArtifact(root, value, label) {
    const path = resolve(root, manifestString(value, label));
    const details = lstatSync(path);
    if (details.isSymbolicLink() || !details.isFile()) {
        throw new TypeError(`${label} must resolve to a regular non-symbolic-link file`);
    }
    return path;
}

/**
 * Load one external quantization/distillation candidate without leaking its paths.
 *
 * @param {string} manifestPath candidate manifest path
 * @returns {Record<string, any>} normalized candidate descriptor
 */
export function loadSftCandidateManifest(manifestPath) {
    const normalizedManifestPath = resolve(manifestPath);
    const manifestDetails = lstatSync(normalizedManifestPath);
    if (manifestDetails.isSymbolicLink() || !manifestDetails.isFile()) {
        throw new TypeError('SFT candidate manifest must be a regular non-symbolic-link file');
    }
    const root = dirname(normalizedManifestPath);
    const manifest = manifestRecord(JSON.parse(readFileSync(normalizedManifestPath, 'utf8')), 'SFT candidate manifest');
    if (manifest.schemaVersion !== 1) {
        throw new TypeError('SFT candidate manifest schemaVersion must be 1');
    }
    const id = manifestString(manifest.candidate, 'SFT candidate id');
    if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u.test(id)) {
        throw new TypeError('SFT candidate id must contain only lowercase letters, digits, and hyphens');
    }
    const calibrationStates = new Set(['not-required', 'representative', 'partial', 'none']);
    if (!calibrationStates.has(manifest.calibration) || typeof manifest.promotionEligible !== 'boolean') {
        throw new TypeError(
            'SFT candidate calibration must be not-required, representative, partial, or none and promotionEligible must be boolean'
        );
    }
    if ((manifest.calibration === 'none' || manifest.calibration === 'partial') && manifest.promotionEligible) {
        throw new TypeError('Partially calibrated or uncalibrated SFT candidates cannot be promotion eligible');
    }
    const ineligibilityReason =
        manifest.promotionEligible === false
            ? manifestString(manifest.ineligibilityReason, 'SFT candidate ineligibilityReason')
            : undefined;
    const artifacts = manifestRecord(manifest.artifacts, 'SFT candidate artifacts');
    const model = resolveManifestArtifact(root, artifacts.model, 'SFT candidate model');
    const tokenizer = resolveManifestArtifact(root, artifacts.tokenizer, 'SFT candidate tokenizer');
    const configuration = resolveManifestArtifact(root, artifacts.configuration, 'SFT candidate configuration');
    const quantizationEvidence = resolveManifestArtifact(
        root,
        artifacts.quantizationEvidence,
        'SFT candidate quantization evidence'
    );
    return Object.freeze({
        id,
        source: 'external-manifest',
        calibration: manifest.calibration,
        promotionEligible: manifest.promotionEligible,
        ...(ineligibilityReason ? { ineligibilityReason } : {}),
        paths: Object.freeze({ model, tokenizer, configuration }),
        binding: Object.freeze({
            manifest: artifactRecord(`sft-${id}-candidate-manifest`, normalizedManifestPath),
            quantizationEvidence: artifactRecord(`sft-${id}-quantization-evidence`, quantizationEvidence)
        }),
        manifestPath: normalizedManifestPath
    });
}

function fixedSftCandidate(pilotRoot, candidate) {
    const promotionEligible = candidate !== 'int4';
    return Object.freeze({
        id: candidate,
        source: 'pilot-fixed',
        calibration: candidate === 'int4' ? 'none' : 'not-required',
        promotionEligible,
        ...(promotionEligible
            ? {}
            : { ineligibilityReason: 'Historical uncalibrated weight-only INT4 failed the pilot quality gate.' }),
        paths: Object.freeze(sftPaths(pilotRoot, candidate)),
        binding: Object.freeze({})
    });
}

export function resolveSftCandidates(options) {
    const candidates = [
        ...options.candidates.map((candidate) => fixedSftCandidate(options.pilotRoot, candidate)),
        ...options.candidateManifests.map(loadSftCandidateManifest)
    ];
    const seen = new Set();
    for (const candidate of candidates) {
        if (seen.has(candidate.id)) {
            throw new TypeError(`SFT candidate ids must be unique: ${candidate.id}`);
        }
        seen.add(candidate.id);
    }
    return candidates;
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
    const paths = candidate.paths;
    const generationConfiguration = productionGenerationConfiguration(
        await readFile(paths.configuration, 'utf8'),
        true
    );
    const generationConfigurationSource = `${JSON.stringify(generationConfiguration, null, 2)}\n`;
    const artifacts = [
        artifactRecord(`sft-${candidate.id}-model`, paths.model),
        artifactRecord(`sft-${candidate.id}-tokenizer`, paths.tokenizer),
        contentArtifact(
            `sft-${candidate.id}-generation-config`,
            'generation-config.json',
            generationConfigurationSource
        ),
        artifactRecord('sft-held-out-cohort', join(options.pilotRoot, 'training/sft/eval/held-out-prompts.json')),
        ...Object.values(candidate.binding)
    ];
    const componentFingerprint = fingerprint(artifacts.slice(0, 3));
    const rawCohort = JSON.parse(
        await readFile(join(options.pilotRoot, 'training/sft/eval/held-out-prompts.json'), 'utf8')
    );
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
        config: {
            numLayers: generationConfiguration.numHiddenLayers,
            numKeyValueHeads: generationConfiguration.numKeyValueHeads,
            headDimension: generationConfiguration.hiddenSize / generationConfiguration.numAttentionHeads
        },
        backend
    });
    const sft = generator.createPilotSftGenerator({
        fingerprint: componentFingerprint,
        textGenerator: generator.createCausalTextGenerator({
            tokenizer: generator.createSmolLm2Tokenizer(tokenizerJson),
            session
        }),
        sampling: generationConfiguration.samplingOptions
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
                    error: sanitizeError(error, options.pilotRoot, dirname(paths.model))
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
        candidate: candidate.id,
        componentFingerprint,
        seed: options.seed,
        cohortFingerprint: artifacts[3].sha256,
        cases: results.map(({ id, expectedKeys, error, row }) => ({
            id,
            expectedKeys,
            ...(error ? { error } : {}),
            ...(row ? { row } : {})
        }))
    };
    const evidenceArtifact = options.evidenceDir
        ? await writeCandidateEvidence(options.evidenceDir, candidate.id, evidence)
        : undefined;
    return {
        candidate: candidate.id,
        candidateSource: candidate.source,
        calibration: candidate.calibration,
        promotionEligible: candidate.promotionEligible,
        ...(candidate.ineligibilityReason ? { ineligibilityReason: candidate.ineligibilityReason } : {}),
        componentFingerprint,
        generationConfigFingerprint: fingerprint(generationConfiguration),
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
    const packageJson = JSON.parse(readFileSync(join(GENERATOR_ROOT, 'package.json'), 'utf8'));
    const source = sourceState();
    return {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        harness: {
            repository: 'SAP/open-ux-tools',
            package: packageJson.name,
            packageVersion: packageJson.version,
            generatorEntry: basename(GENERATOR_ENTRY),
            generatorEntrySha256: sha256File(GENERATOR_ENTRY),
            generatorBuildFingerprint: fingerprintDirectory(join(GENERATOR_ROOT, 'dist')),
            codeCommit: source.codeCommit,
            sourceClean: source.sourceClean,
            node: process.version,
            platform: `${process.platform}-${process.arch}`,
            cpu: cpus()[0]?.model ?? 'unknown',
            runtime: runtimeBinding()
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
        for (const candidate of resolveSftCandidates(options)) {
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
        result.push('--skip-classifier', '--seed', String(options.seed));
        if (candidate.source === 'external-manifest') {
            result.push('--sft-candidate-manifest', candidate.manifestPath);
        } else {
            result.push('--sft-candidates', candidate.id);
        }
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
            for (const candidate of resolveSftCandidates(options)) {
                const output = join(temporaryRoot, `sft-${candidate.id}.json`);
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n\n${usage()}\n`);
        process.exitCode = 1;
    });
}
