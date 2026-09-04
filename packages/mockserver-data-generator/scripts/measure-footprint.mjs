#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    realpathSync,
    rmSync,
    statSync,
    writeFileSync
} from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAXIMUM_PACKED_BYTES = 5 * 1024 * 1024;
const MAXIMUM_MODEL_TRANSFER_BYTES = 200 * 1024 * 1024;
const MAXIMUM_MODEL_CACHE_BYTES = 200 * 1024 * 1024;
const MAXIMUM_TOTAL_FOOTPRINT_BYTES = 300 * 1024 * 1024;
const MAXIMUM_GENERATED_DATA_CACHE_BYTES = 32 * 1024 * 1024;
const MAXIMUM_PROVIDER_MODULE_LOAD_MS = 250;
const MAXIMUM_MODEL_SESSION_LOAD_MS = 5_000;
const MAXIMUM_COLD_SERVICE_GENERATION_MS = 25_000;
const MAXIMUM_WARM_CACHE_STARTUP_MS = 200;
const MAXIMUM_T2_GENERATION_MS = 20_000;
const MAXIMUM_FIRST_USE_ACQUISITION_MS = 30_000;
const MAXIMUM_HOST_PROVIDER_MS = 60_000;
const SHA_256 = /^[a-f\d]{64}$/u;
const IMMUTABLE_COMMIT = /^[a-f\d]{40,64}$/u;

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

function usage() {
    return [
        'Usage:',
        '  pnpm mockserver-data-generator:measure-footprint --output <report.json> [options]',
        '',
        'Options:',
        '  --model-manifest <path>             Verified model manifest',
        '  --model-cache <path>                Verified model cache root',
        '  --evaluation-report <path>          Matching model-evaluation report',
        '  --generator-baseline-bytes <bytes>  Approved generator-weight baseline',
        '  --runs <number>                     Fresh provider-load processes (default: 10)',
        '  --require-clean                     Reject a dirty source worktree',
        '',
        'The report contains portable fingerprints and aggregate measurements only; local paths',
        'and generated values are never written to it.'
    ].join('\n');
}

function record(value, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value;
}

function string(value, label) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
}

function bytes(value, label, { optional = false } = {}) {
    if (value === undefined && optional) {
        return null;
    }
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError(`${label} must be a non-negative safe integer`);
    }
    return value;
}

function positiveBytes(value, label, options) {
    const result = bytes(value, label, options);
    if (result !== null && result === 0) {
        throw new TypeError(`${label} must be positive`);
    }
    return result;
}

function sha256Value(value, label) {
    const result = string(value, label);
    if (!SHA_256.test(result)) {
        throw new TypeError(`${label} must be a lowercase SHA-256`);
    }
    return result;
}

function immutableCommit(value, label) {
    const result = string(value, label);
    if (!IMMUTABLE_COMMIT.test(result)) {
        throw new TypeError(`${label} must be an immutable commit or content hash`);
    }
    return result;
}

function nearestRank(values, fraction) {
    if (values.length === 0) {
        return null;
    }
    const ordered = [...values].sort((left, right) => left - right);
    return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)];
}

function timing(value, label) {
    if (value === undefined) {
        return Object.freeze({ samples: 0, p50: null, p95: null });
    }
    if (Array.isArray(value)) {
        if (value.length === 0 || value.some((entry) => !Number.isFinite(entry) || entry < 0)) {
            throw new TypeError(`${label} samples must be non-negative finite numbers`);
        }
        return Object.freeze({
            samples: value.length,
            p50: nearestRank(value, 0.5),
            p95: nearestRank(value, 0.95)
        });
    }
    const summary = record(value, label);
    const p50 = summary.p50;
    const p95 = summary.p95;
    if (!Number.isFinite(p50) || !Number.isFinite(p95) || p50 < 0 || p95 < p50) {
        throw new TypeError(`${label} must contain non-negative p50 and p95 values`);
    }
    return Object.freeze({ samples: null, p50, p95 });
}

function maximumGate(actual, threshold) {
    return Object.freeze({
        actual,
        threshold,
        status: actual === null ? 'not-measured' : actual <= threshold ? 'pass' : 'fail'
    });
}

function componentMeasurement(value, index) {
    const component = record(value, `model component ${index}`);
    return Object.freeze({
        id: string(component.id, `model component ${index} id`),
        kind: string(component.kind, `model component ${index} kind`),
        fingerprint: sha256Value(component.fingerprint, `model component ${index} fingerprint`),
        bytes: positiveBytes(component.bytes, `model component ${index} bytes`)
    });
}

/**
 * Normalize measurements and apply the fixed footprint budgets.
 *
 * @param {unknown} value raw measurement input
 * @returns {object} portable footprint report
 */
export function buildFootprintReport(value) {
    const input = record(value, 'footprint measurement');
    const candidate = record(input.candidate, 'candidate');
    const environment = record(input.environment, 'environment');
    const packageMeasurement = record(input.package, 'package measurement');
    const installation = record(input.installation, 'installation measurement');
    const model = input.model === undefined ? undefined : record(input.model, 'model measurement');
    const timingInput = input.timings === undefined ? {} : record(input.timings, 'timings');
    const memoryInput = input.memory === undefined ? undefined : record(input.memory, 'memory measurement');

    const normalizedCandidate = Object.freeze({
        packageName: string(candidate.packageName, 'candidate package name'),
        packageVersion: string(candidate.packageVersion, 'candidate package version'),
        packageArchiveSha256: sha256Value(candidate.packageArchiveSha256, 'candidate package archive SHA-256'),
        codeCommit: immutableCommit(candidate.codeCommit, 'candidate code commit'),
        sourceClean: candidate.sourceClean === true,
        ...(candidate.modelRevision === undefined
            ? {}
            : { modelRevision: immutableCommit(candidate.modelRevision, 'candidate model revision') }),
        ...(candidate.modelManifestSha256 === undefined
            ? {}
            : {
                  modelManifestSha256: sha256Value(candidate.modelManifestSha256, 'candidate model manifest SHA-256')
              }),
        ...(candidate.runtimePackage === undefined
            ? {}
            : { runtimePackage: string(candidate.runtimePackage, 'candidate runtime package') }),
        ...(candidate.runtimeVersion === undefined
            ? {}
            : { runtimeVersion: string(candidate.runtimeVersion, 'candidate runtime version') }),
        ...(candidate.evaluationReportSha256 === undefined
            ? {}
            : {
                  evaluationReportSha256: sha256Value(
                      candidate.evaluationReportSha256,
                      'candidate evaluation report SHA-256'
                  )
              })
    });
    const normalizedEnvironment = Object.freeze({
        node: string(environment.node, 'environment Node version'),
        platform: string(environment.platform, 'environment platform'),
        architecture: string(environment.architecture, 'environment architecture'),
        packageManager: string(environment.packageManager, 'environment package manager'),
        cpu: string(environment.cpu, 'environment CPU')
    });
    const npm = Object.freeze({
        packedBytes: positiveBytes(packageMeasurement.packedBytes, 'npm packed bytes'),
        unpackedBytes: positiveBytes(packageMeasurement.unpackedBytes, 'npm unpacked bytes')
    });
    const normalizedInstallation = Object.freeze({
        deterministicBytes: positiveBytes(installation.deterministicBytes, 'deterministic installed bytes'),
        learnedBytes: positiveBytes(installation.learnedBytes, 'learned installed bytes', { optional: true }),
        runtimeIncrementalBytes: positiveBytes(installation.runtimeIncrementalBytes, 'runtime incremental bytes', {
            optional: true
        })
    });
    const normalizedModel = model
        ? Object.freeze({
              manifestBytes: positiveBytes(model.manifestBytes, 'model manifest bytes'),
              downloadBytes: positiveBytes(model.downloadBytes, 'model download bytes'),
              verifiedCacheBytes: positiveBytes(model.verifiedCacheBytes, 'verified model cache bytes'),
              generatorBytes: positiveBytes(model.generatorBytes, 'generator model bytes'),
              approvedGeneratorBaselineBytes: positiveBytes(
                  model.approvedGeneratorBaselineBytes,
                  'approved generator baseline bytes',
                  { optional: true }
              ),
              components: Object.freeze(
                  (Array.isArray(model.components) ? model.components : []).map(componentMeasurement)
              )
          })
        : undefined;
    if (normalizedModel && normalizedModel.components.length === 0) {
        throw new TypeError('model measurement must contain components');
    }
    const generatedDataQuotaBytes = positiveBytes(
        input.generatedDataCacheQuotaBytes,
        'generated-data cache quota bytes'
    );
    const totalIncrementalInstalledAndCacheBytes =
        normalizedInstallation.learnedBytes === null || !normalizedModel
            ? null
            : normalizedInstallation.learnedBytes + normalizedModel.verifiedCacheBytes + generatedDataQuotaBytes;
    const latencyMs = Object.freeze({
        providerModuleLoad: timing(timingInput.providerModuleLoadMs, 'provider module load'),
        modelSessionLoad: timing(timingInput.modelSessionLoadMs, 'model session load'),
        coldServiceGeneration: timing(timingInput.coldServiceGenerationMs, 'cold service generation'),
        warmCacheStartup: timing(timingInput.warmCacheStartupMs, 'warm-cache startup'),
        t2Generation: timing(timingInput.t2GenerationMs, 'T2 generation'),
        firstUseAcquisition: timing(timingInput.firstUseAcquisitionMs, 'first-use acquisition'),
        hostProvider: timing(timingInput.hostProviderMs, 'host provider')
    });
    const generatorOptimizationThreshold = normalizedModel?.approvedGeneratorBaselineBytes
        ? Math.floor(normalizedModel.approvedGeneratorBaselineBytes / 2)
        : null;
    const generatorOptimizationGate =
        generatorOptimizationThreshold === null
            ? Object.freeze({ actual: null, threshold: null, status: 'not-measured' })
            : maximumGate(normalizedModel?.generatorBytes ?? null, generatorOptimizationThreshold);
    const gates = Object.freeze({
        sourceClean: Object.freeze({
            actual: normalizedCandidate.sourceClean,
            expected: true,
            status: normalizedCandidate.sourceClean ? 'pass' : 'fail'
        }),
        npmPacked: maximumGate(npm.packedBytes, MAXIMUM_PACKED_BYTES),
        modelDownload: maximumGate(normalizedModel?.downloadBytes ?? null, MAXIMUM_MODEL_TRANSFER_BYTES),
        modelCache: maximumGate(normalizedModel?.verifiedCacheBytes ?? null, MAXIMUM_MODEL_CACHE_BYTES),
        totalFootprint: maximumGate(totalIncrementalInstalledAndCacheBytes, MAXIMUM_TOTAL_FOOTPRINT_BYTES),
        generatedDataCache: maximumGate(generatedDataQuotaBytes, MAXIMUM_GENERATED_DATA_CACHE_BYTES),
        generatorOptimization: generatorOptimizationGate,
        providerModuleLoad: maximumGate(latencyMs.providerModuleLoad.p95, MAXIMUM_PROVIDER_MODULE_LOAD_MS),
        modelSessionLoad: maximumGate(latencyMs.modelSessionLoad.p95, MAXIMUM_MODEL_SESSION_LOAD_MS),
        coldServiceGeneration: maximumGate(latencyMs.coldServiceGeneration.p95, MAXIMUM_COLD_SERVICE_GENERATION_MS),
        warmCacheStartup: maximumGate(latencyMs.warmCacheStartup.p95, MAXIMUM_WARM_CACHE_STARTUP_MS),
        t2Generation: maximumGate(latencyMs.t2Generation.p95, MAXIMUM_T2_GENERATION_MS),
        firstUseAcquisition: maximumGate(latencyMs.firstUseAcquisition.p95, MAXIMUM_FIRST_USE_ACQUISITION_MS),
        hostProvider: maximumGate(latencyMs.hostProvider.p95, MAXIMUM_HOST_PROVIDER_MS)
    });
    const report = {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        candidate: normalizedCandidate,
        environment: normalizedEnvironment,
        protocols: Object.freeze({
            byteAccounting: 'sum of logical bytes for regular files; symbolic links are not followed',
            packageInstall: 'clean npm install with lifecycle scripts disabled and optional peer omitted',
            percentile: 'nearest-rank over uncensored observations; timeout samples remain in the denominator',
            moduleLoad: 'fresh Node process requiring and constructing the FE mockserver provider',
            totalFootprint:
                'learned dependency closure plus verified model cache plus configured generated-data-cache quota'
        }),
        metrics: Object.freeze({
            npm,
            installation: normalizedInstallation,
            ...(normalizedModel ? { model: normalizedModel } : {}),
            cache: Object.freeze({ generatedDataQuotaBytes }),
            total: Object.freeze({ incrementalInstalledAndCacheBytes: totalIncrementalInstalledAndCacheBytes }),
            latencyMs,
            memory: Object.freeze({
                peakRssBytes: memoryInput
                    ? positiveBytes(memoryInput.peakRssBytes, 'peak RSS bytes', { optional: true })
                    : null
            })
        }),
        gates,
        footprintReady: Object.values(gates).every(({ status }) => status === 'pass')
    };
    return Object.freeze({ ...report, reportFingerprint: fingerprint(report) });
}

function parseArguments(argv) {
    const options = { runs: 10, requireClean: false };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        const value = argv[index + 1];
        if (argument === '--help' || argument === '-h') {
            process.stdout.write(`${usage()}\n`);
            return undefined;
        }
        if (argument === '--require-clean') {
            options.requireClean = true;
            continue;
        }
        if (!value) {
            throw new TypeError(`Missing value for ${argument}`);
        }
        if (argument === '--output') {
            options.output = resolve(value);
        } else if (argument === '--model-manifest') {
            options.modelManifest = resolve(value);
        } else if (argument === '--model-cache') {
            options.modelCache = resolve(value);
        } else if (argument === '--evaluation-report') {
            options.evaluationReport = resolve(value);
        } else if (argument === '--generator-baseline-bytes') {
            options.generatorBaselineBytes = Number.parseInt(value, 10);
        } else if (argument === '--runs') {
            options.runs = Number.parseInt(value, 10);
        } else {
            throw new TypeError(`Unknown argument: ${argument}`);
        }
        index += 1;
    }
    if (!options.output) {
        throw new TypeError('--output is required');
    }
    if ((options.modelManifest === undefined) !== (options.modelCache === undefined)) {
        throw new TypeError('--model-manifest and --model-cache must be supplied together');
    }
    if (options.evaluationReport && !options.modelManifest) {
        throw new TypeError('--evaluation-report requires model inputs');
    }
    if (!Number.isSafeInteger(options.runs) || options.runs < 2 || options.runs > 100) {
        throw new TypeError('--runs must be an integer from 2 through 100');
    }
    if (
        options.generatorBaselineBytes !== undefined &&
        (!Number.isSafeInteger(options.generatorBaselineBytes) || options.generatorBaselineBytes <= 0)
    ) {
        throw new TypeError('--generator-baseline-bytes must be a positive integer');
    }
    return options;
}

function sha256File(filePath) {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

export function measureDirectory(root) {
    const canonicalRoot = realpathSync(root);
    const pending = [canonicalRoot];
    let logicalBytes = 0;
    let files = 0;
    let symbolicLinks = 0;
    while (pending.length > 0) {
        const directory = pending.pop();
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const path = join(directory, entry.name);
            const details = lstatSync(path);
            if (details.isSymbolicLink()) {
                symbolicLinks += 1;
            } else if (details.isDirectory()) {
                pending.push(path);
            } else if (details.isFile()) {
                logicalBytes += details.size;
                files += 1;
            }
        }
    }
    return { logicalBytes, files, symbolicLinks };
}

function packageManagerInvocation() {
    const executable = process.env.npm_execpath;
    if (!executable) {
        throw new Error('Run the footprint harness through pnpm mockserver-data-generator:measure-footprint');
    }
    return { command: process.execPath, prefix: [executable] };
}

function runPackageManager(args, options = {}) {
    const invocation = packageManagerInvocation();
    return execFileSync(invocation.command, [...invocation.prefix, ...args], {
        ...options,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
}

function packCurrentPackage(temporaryRoot) {
    const output = runPackageManager(['pack', '--pack-destination', temporaryRoot, '--json'], { cwd: PACKAGE_ROOT });
    const report = JSON.parse(output);
    if (!report || typeof report !== 'object' || !Array.isArray(report.files) || !isAbsolute(report.filename)) {
        throw new Error('Package manager returned an invalid pack report');
    }
    const archivePath = realpathSync(report.filename);
    const extracted = join(temporaryRoot, 'packed');
    mkdirSync(extracted);
    execFileSync('tar', ['-xzf', archivePath, '-C', extracted], { stdio: ['ignore', 'pipe', 'pipe'] });
    const unpacked = measureDirectory(join(extracted, 'package'));
    return {
        archivePath,
        packageName: string(report.name, 'packed package name'),
        packageVersion: string(report.version, 'packed package version'),
        archiveSha256: sha256File(archivePath),
        packedBytes: statSync(archivePath).size,
        unpackedBytes: unpacked.logicalBytes
    };
}

function npmVersion() {
    return execFileSync('npm', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function installPackageClosure(temporaryRoot, archivePath, runtime) {
    const consumer = join(temporaryRoot, 'consumer');
    mkdirSync(consumer);
    writeFileSync(join(consumer, 'package.json'), '{"name":"mockgen-footprint-consumer","private":true}\n');
    execFileSync(
        'npm',
        ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--omit=optional', '--save-exact', archivePath],
        { cwd: consumer, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const deterministicBytes = measureDirectory(join(consumer, 'node_modules')).logicalBytes;
    if (!runtime) {
        return { consumer, deterministicBytes, learnedBytes: null, runtimeIncrementalBytes: null };
    }
    execFileSync(
        'npm',
        [
            'install',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
            '--save-exact',
            `${runtime.package}@${runtime.version}`
        ],
        { cwd: consumer, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const learnedBytes = measureDirectory(join(consumer, 'node_modules')).logicalBytes;
    return { consumer, deterministicBytes, learnedBytes, runtimeIncrementalBytes: learnedBytes - deterministicBytes };
}

function probeProviderModuleLoad(consumer, runs) {
    const probe = [
        'const started=performance.now();',
        "const Provider=require('@sap-ux/mockserver-data-generator/fe-mockserver');",
        'new Provider();',
        'const elapsedMs=performance.now()-started;',
        'process.stdout.write(JSON.stringify({elapsedMs,processMaxRssBytes:process.resourceUsage().maxRSS*1024}));'
    ].join('');
    const samples = [];
    const rssSamples = [];
    for (let index = 0; index < runs; index += 1) {
        const output = execFileSync(process.execPath, ['--eval', probe], {
            cwd: consumer,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 5_000
        });
        const result = record(JSON.parse(output), 'provider module-load result');
        if (!Number.isFinite(result.elapsedMs) || !Number.isSafeInteger(result.processMaxRssBytes)) {
            throw new Error('Provider module-load probe returned invalid measurements');
        }
        samples.push(result.elapsedMs);
        rssSamples.push(result.processMaxRssBytes);
    }
    return { samples, peakRssBytes: Math.max(...rssSamples) };
}

function sourceState(requireClean) {
    const repositoryRoot = execFileSync('git', ['-C', PACKAGE_ROOT, 'rev-parse', '--show-toplevel'], {
        encoding: 'utf8'
    }).trim();
    const commit = execFileSync('git', ['-C', repositoryRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const status = execFileSync('git', ['-C', repositoryRoot, 'status', '--porcelain=v1'], { encoding: 'utf8' }).trim();
    if (requireClean && status.length > 0) {
        throw new Error('Footprint measurement requires a clean source worktree');
    }
    return { commit, clean: status.length === 0 };
}

async function modelMeasurement(options) {
    if (!options.modelManifest) {
        return undefined;
    }
    for (const [path, label, expected] of [
        [options.modelManifest, 'model manifest', 'file'],
        [options.modelCache, 'model cache', 'directory']
    ]) {
        if (!existsSync(path) || lstatSync(path).isSymbolicLink()) {
            throw new TypeError(`${label} must be an existing non-symbolic-link ${expected}`);
        }
        const details = lstatSync(path);
        if (expected === 'file' ? !details.isFile() : !details.isDirectory()) {
            throw new TypeError(`${label} must be an existing non-symbolic-link ${expected}`);
        }
    }
    const generator = await import(pathToFileURL(join(PACKAGE_ROOT, 'dist', 'index.js')).href);
    const manifest = generator.parseModelManifest(JSON.parse(readFileSync(options.modelManifest, 'utf8')));
    const verified = await generator.verifyModelCache(options.modelCache, manifest);
    if (!verified.ready) {
        throw new Error(`Model cache verification failed for ${verified.failures.length} artifact(s)`);
    }
    const runtimes = new Map(
        manifest.components.map((component) => [
            `${component.runtime.package}@${component.runtime.version}`,
            { package: component.runtime.package, version: component.runtime.version }
        ])
    );
    if (runtimes.size !== 1) {
        throw new Error('Footprint measurement requires one shared model runtime');
    }
    const [runtime] = runtimes.values();
    const components = manifest.components.map((component) => ({
        id: component.id,
        kind: component.kind,
        fingerprint: component.fingerprint,
        bytes: component.files.reduce((sum, file) => sum + file.bytes, 0)
    }));
    const allFiles = manifest.components.flatMap((component) => component.files);
    const generatorBytes = manifest.components
        .filter(({ kind }) => kind === 'sft')
        .flatMap(({ files }) => files)
        .filter(({ role }) => role === 'model')
        .reduce((sum, file) => sum + file.bytes, 0);
    const downloadBytes = allFiles.reduce((sum, file) => sum + file.bytes, 0);
    const verifiedCacheBytes = [...verified.files.values()]
        .flatMap((files) => [...files.values()])
        .reduce((sum, path) => sum + statSync(path).size, 0);
    if (verifiedCacheBytes !== downloadBytes) {
        throw new Error('Verified model cache bytes do not match the manifest transfer bytes');
    }
    return {
        manifest,
        runtime,
        report: {
            manifestBytes: statSync(options.modelManifest).size,
            downloadBytes,
            verifiedCacheBytes,
            generatorBytes,
            approvedGeneratorBaselineBytes: options.generatorBaselineBytes,
            components
        },
        manifestSha256: sha256File(options.modelManifest)
    };
}

function evaluationMeasurement(filePath, model) {
    if (!filePath) {
        return { timings: {}, peakRssBytes: null, sha256: undefined };
    }
    const report = record(JSON.parse(readFileSync(filePath, 'utf8')), 'model evaluation report');
    const sftReports = Array.isArray(report.sft) ? report.sft : [];
    const sft = sftReports.find((candidate) => candidate?.candidate === 'int8');
    if (!sft) {
        throw new Error('Model evaluation report has no INT8 SFT candidate');
    }
    const artifactHashes = new Set(
        [
            ...(Array.isArray(report.classifier?.artifacts) ? report.classifier.artifacts : []),
            ...(Array.isArray(sft.artifacts) ? sft.artifacts : [])
        ].map(({ sha256 }) => sha256)
    );
    const evaluatedArtifacts = model.manifest.components
        .flatMap(({ files }) => files)
        .filter(({ role }) => role !== 'generation-config');
    if (evaluatedArtifacts.some(({ sha256 }) => !artifactHashes.has(sha256))) {
        throw new Error('Model evaluation report does not match the verified model manifest');
    }
    const loadSamples = [report.classifier?.metrics?.loadMs, sft.metrics?.loadMs].filter(Number.isFinite);
    const rssSamples = [report.classifier?.metrics?.processMaxRssBytes, sft.metrics?.processMaxRssBytes].filter(
        Number.isSafeInteger
    );
    return {
        timings: {
            modelSessionLoadMs: loadSamples,
            ...(sft.metrics?.latencyMs ? { t2GenerationMs: sft.metrics.latencyMs } : {})
        },
        peakRssBytes: rssSamples.length > 0 ? Math.max(...rssSamples) : null,
        sha256: sha256File(filePath)
    };
}

async function collectFootprint(options) {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'mockgen-footprint-'));
    try {
        const source = sourceState(options.requireClean);
        const packageResult = packCurrentPackage(temporaryRoot);
        const model = await modelMeasurement(options);
        const installation = installPackageClosure(temporaryRoot, packageResult.archivePath, model?.runtime);
        const provider = probeProviderModuleLoad(installation.consumer, options.runs);
        const evaluation = evaluationMeasurement(options.evaluationReport, model);
        return buildFootprintReport({
            candidate: {
                packageName: packageResult.packageName,
                packageVersion: packageResult.packageVersion,
                packageArchiveSha256: packageResult.archiveSha256,
                codeCommit: source.commit,
                sourceClean: source.clean,
                ...(model
                    ? {
                          modelRevision: model.manifest.revision,
                          modelManifestSha256: model.manifestSha256,
                          runtimePackage: model.runtime.package,
                          runtimeVersion: model.runtime.version
                      }
                    : {}),
                ...(evaluation.sha256 ? { evaluationReportSha256: evaluation.sha256 } : {})
            },
            environment: {
                node: process.version,
                platform: process.platform,
                architecture: process.arch,
                packageManager: `npm@${npmVersion()}`,
                cpu: cpus()[0]?.model ?? 'unknown'
            },
            package: {
                packedBytes: packageResult.packedBytes,
                unpackedBytes: packageResult.unpackedBytes
            },
            installation: {
                deterministicBytes: installation.deterministicBytes,
                learnedBytes: installation.learnedBytes ?? undefined,
                runtimeIncrementalBytes: installation.runtimeIncrementalBytes ?? undefined
            },
            ...(model ? { model: model.report } : {}),
            generatedDataCacheQuotaBytes: MAXIMUM_GENERATED_DATA_CACHE_BYTES,
            timings: {
                providerModuleLoadMs: provider.samples,
                ...evaluation.timings
            },
            memory: { peakRssBytes: evaluation.peakRssBytes ?? provider.peakRssBytes }
        });
    } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
    }
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (!options) {
        return;
    }
    const report = await collectFootprint(options);
    if (existsSync(options.output)) {
        throw new Error('Refusing to overwrite an existing footprint report');
    }
    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(
        `${JSON.stringify({
            output: options.output,
            footprintReady: report.footprintReady,
            failedGates: Object.entries(report.gates)
                .filter(([, gate]) => gate.status !== 'pass')
                .map(([name, gate]) => ({ name, status: gate.status }))
        })}\n`
    );
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n\n${usage()}\n`);
        process.exitCode = 1;
    });
}
