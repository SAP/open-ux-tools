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
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, '../..');
const PACKAGE_NAME = '@sap-ux/mockserver-data-generator';
const GENERATOR_ENTRY = join(PACKAGE_ROOT, 'dist', 'index.js');
const GENERATOR_BASELINE = join(
    REPOSITORY_ROOT,
    'scripts',
    'mockserver-data-generator-evaluation',
    'baselines',
    'generator-int8-v1.json'
);
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
const FROZEN_CLASSIFIER_COHORT_SHA256 = '0d1d0a5c305083fb17e7bbe3149c828037616898e5464a8d6993818fd94fb6b3';
const FROZEN_SFT_COHORT_SHA256 = '83dd7d4e1613a17715d9c5bce8e1aea43b505f0d6d6afb7d09993d8049c0c5d4';
const FROZEN_SFT_SEED = 2_026_090_4;
const CLASSIFIER_COHORT_POLICY =
    'llm_agreement or verified human adjudication; unresolved automated-as-human rows quarantined';
const SHA_256 = /^[a-f\d]{64}$/u;
const IMMUTABLE_COMMIT = /^[a-f\d]{40,64}$/u;
const NPM_PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;
const NON_BLOCKING_TARGETS = new Set(['generatorOptimization']);

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
        '  --runtime-tarball <path>            Exact platform runtime candidate archive',
        '  --runs <number>                     Fresh provider-load processes (default: 10)',
        '  --require-clean                     Reject a dirty source worktree',
        '  --enforce                           Exit nonzero unless every required footprint gate passes',
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

function boolean(value, label) {
    if (typeof value !== 'boolean') {
        throw new TypeError(`${label} must be a boolean`);
    }
    return value;
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

function artifactMeasurement(value, index) {
    const artifact = record(value, `model artifact ${index}`);
    return Object.freeze({
        componentId: string(artifact.componentId, `model artifact ${index} component ID`),
        role: string(artifact.role, `model artifact ${index} role`),
        fingerprint: sha256Value(artifact.fingerprint, `model artifact ${index} fingerprint`),
        bytes: positiveBytes(artifact.bytes, `model artifact ${index} bytes`)
    });
}

/**
 * Validate the Git-reviewed dynamic-INT8 generator baseline.
 *
 * @param {unknown} value baseline record
 * @returns {object} normalized baseline
 */
export function parseGeneratorBaseline(value) {
    const input = record(value, 'generator baseline');
    const artifact = record(input.artifact, 'generator baseline artifact');
    const source = record(input.source, 'generator baseline source');
    const normalized = {
        schemaVersion: input.schemaVersion,
        id: string(input.id, 'generator baseline ID'),
        lifecycle: string(input.lifecycle, 'generator baseline lifecycle'),
        artifact: {
            bytes: positiveBytes(artifact.bytes, 'generator baseline artifact bytes'),
            sha256: sha256Value(artifact.sha256, 'generator baseline artifact SHA-256')
        },
        targetFormula: string(input.targetFormula, 'generator baseline target formula'),
        source: {
            modelManifestSha256: sha256Value(source.modelManifestSha256, 'generator baseline model manifest SHA-256'),
            pilotExportReportSha256: sha256Value(
                source.pilotExportReportSha256,
                'generator baseline pilot export report SHA-256'
            )
        }
    };
    if (
        normalized.schemaVersion !== 1 ||
        normalized.lifecycle !== 'frozen-development-baseline' ||
        normalized.targetFormula !== 'floor(artifact.bytes / 2)'
    ) {
        throw new TypeError('generator baseline has an unsupported contract');
    }
    const recordFingerprint = sha256Value(input.recordFingerprint, 'generator baseline fingerprint');
    if (recordFingerprint !== fingerprint(normalized)) {
        throw new Error('generator baseline fingerprint does not match');
    }
    return Object.freeze({
        ...normalized,
        artifact: Object.freeze(normalized.artifact),
        source: Object.freeze(normalized.source),
        recordFingerprint
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
        generatorEntrySha256: sha256Value(candidate.generatorEntrySha256, 'candidate generator entry SHA-256'),
        generatorBuildFingerprint: sha256Value(
            candidate.generatorBuildFingerprint,
            'candidate generator build fingerprint'
        ),
        codeCommit: immutableCommit(candidate.codeCommit, 'candidate code commit'),
        sourceClean: boolean(candidate.sourceClean, 'candidate source-clean result'),
        ...(candidate.modelRevision === undefined
            ? {}
            : { modelRevision: immutableCommit(candidate.modelRevision, 'candidate model revision') }),
        ...(candidate.modelManifestSha256 === undefined
            ? {}
            : {
                  modelManifestSha256: sha256Value(candidate.modelManifestSha256, 'candidate model manifest SHA-256')
              }),
        ...(candidate.generationConfigFingerprint === undefined
            ? {}
            : {
                  generationConfigFingerprint: sha256Value(
                      candidate.generationConfigFingerprint,
                      'candidate generation config fingerprint'
                  )
              }),
        ...(candidate.runtimePackage === undefined
            ? {}
            : { runtimePackage: string(candidate.runtimePackage, 'candidate runtime package') }),
        ...(candidate.runtimeVersion === undefined
            ? {}
            : { runtimeVersion: string(candidate.runtimeVersion, 'candidate runtime version') }),
        ...(candidate.runtimePackageArchiveSha256 === undefined
            ? {}
            : {
                  runtimePackageArchiveSha256: sha256Value(
                      candidate.runtimePackageArchiveSha256,
                      'candidate runtime package archive SHA-256'
                  )
              }),
        ...(candidate.evaluationReportSha256 === undefined
            ? {}
            : {
                  evaluationReportSha256: sha256Value(
                      candidate.evaluationReportSha256,
                      'candidate evaluation report SHA-256'
                  )
              }),
        ...(candidate.evaluationReportFingerprint === undefined
            ? {}
            : {
                  evaluationReportFingerprint: sha256Value(
                      candidate.evaluationReportFingerprint,
                      'candidate evaluation report fingerprint'
                  ),
                  classifierCohortSha256: sha256Value(
                      candidate.classifierCohortSha256,
                      'candidate classifier cohort SHA-256'
                  ),
                  sftCohortSha256: sha256Value(candidate.sftCohortSha256, 'candidate SFT cohort SHA-256')
              }),
        ...(candidate.generatorBaselineFingerprint === undefined
            ? {}
            : {
                  generatorBaselineFingerprint: sha256Value(
                      candidate.generatorBaselineFingerprint,
                      'candidate generator baseline fingerprint'
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
        unpackedBytes: positiveBytes(packageMeasurement.unpackedBytes, 'npm unpacked bytes'),
        boundaryClean: boolean(packageMeasurement.boundaryClean, 'package boundary result')
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
                  parseGeneratorBaseline(model.generatorBaseline).artifact.bytes,
                  'approved generator baseline bytes'
              ),
              generatorBaseline: parseGeneratorBaseline(model.generatorBaseline),
              components: Object.freeze(
                  (Array.isArray(model.components) ? model.components : []).map(componentMeasurement)
              ),
              artifacts: Object.freeze((Array.isArray(model.artifacts) ? model.artifacts : []).map(artifactMeasurement))
          })
        : undefined;
    if (normalizedModel && (normalizedModel.components.length === 0 || normalizedModel.artifacts.length === 0)) {
        throw new TypeError('model measurement must contain components and artifacts');
    }
    if (
        normalizedModel &&
        normalizedCandidate.generatorBaselineFingerprint !== normalizedModel.generatorBaseline.recordFingerprint
    ) {
        throw new Error('candidate does not bind the frozen generator baseline');
    }
    if (
        normalizedCandidate.evaluationReportSha256 !== undefined &&
        normalizedCandidate.evaluationReportFingerprint === undefined
    ) {
        throw new Error('candidate evaluation report has no verified provenance binding');
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
        packageBoundary: Object.freeze({
            actual: npm.boundaryClean,
            expected: true,
            status: npm.boundaryClean ? 'pass' : 'fail'
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
            packageBuild: 'clean TypeScript build from the measured source state before package verification and pack',
            packageBoundary: 'actual packed-package policy and network-free construction check',
            packageInstall: 'clean npm install with lifecycle scripts disabled and optional peer omitted',
            runtimeInstall:
                normalizedCandidate.runtimePackageArchiveSha256 === undefined
                    ? 'exact registry package name and version with lifecycle scripts disabled; installed identity verified'
                    : 'SHA-256-bound candidate archive with lifecycle scripts disabled; installed identity verified',
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
        footprintReady: Object.entries(gates)
            .filter(([name]) => !NON_BLOCKING_TARGETS.has(name))
            .every(([, { status }]) => status === 'pass')
    };
    return Object.freeze({ ...report, reportFingerprint: fingerprint(report) });
}

function decimalInteger(value, label) {
    if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(value)) {
        throw new TypeError(`${label} must be a decimal integer`);
    }
    return Number(value);
}

/**
 * Parse footprint harness arguments.
 *
 * @param {string[]} argv command-line arguments
 * @returns {object | undefined} parsed options or undefined for help
 */
export function parseArguments(argv) {
    const argumentsWithoutSeparator = argv[0] === '--' ? argv.slice(1) : argv;
    const options = { runs: 10, requireClean: false, enforce: false };
    for (let index = 0; index < argumentsWithoutSeparator.length; index += 1) {
        const argument = argumentsWithoutSeparator[index];
        const value = argumentsWithoutSeparator[index + 1];
        if (argument === '--help' || argument === '-h') {
            process.stdout.write(`${usage()}\n`);
            return undefined;
        }
        if (argument === '--require-clean') {
            options.requireClean = true;
            continue;
        }
        if (argument === '--enforce') {
            options.enforce = true;
            continue;
        }
        if (!value || value.startsWith('--')) {
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
        } else if (argument === '--runtime-tarball') {
            options.runtimeTarball = resolve(value);
        } else if (argument === '--runs') {
            options.runs = decimalInteger(value, '--runs');
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
    if (options.runtimeTarball && !options.modelManifest) {
        throw new TypeError('--runtime-tarball requires model inputs');
    }
    if (!Number.isSafeInteger(options.runs) || options.runs < 2 || options.runs > 100) {
        throw new TypeError('--runs must be an integer from 2 through 100');
    }
    return options;
}

function sha256File(filePath) {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex');
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
        unpackedBytes: unpacked.logicalBytes,
        boundaryClean: true
    };
}

function buildAndVerifyPackage() {
    for (const script of ['clean', 'build', 'check:package']) {
        runPackageManager(['--filter', PACKAGE_NAME, 'run', script], { cwd: REPOSITORY_ROOT });
    }
    return {
        generatorEntrySha256: sha256File(GENERATOR_ENTRY),
        generatorBuildFingerprint: fingerprintDirectory(join(PACKAGE_ROOT, 'dist'))
    };
}

function npmVersion() {
    return execFileSync('npm', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/**
 * Verify that npm installed the exact runtime identity without linked path components.
 *
 * @param {string} consumer clean consumer root
 * @param {unknown} runtime expected package identity
 * @returns {string} verified runtime package root
 */
export function validateRuntimeInstallation(consumer, runtime) {
    const expected = record(runtime, 'runtime identity');
    const packageName = string(expected.package, 'runtime package');
    const packageVersion = string(expected.version, 'runtime version');
    if (!NPM_PACKAGE_NAME.test(packageName)) {
        throw new TypeError('runtime package must be a canonical npm package name');
    }
    let runtimeRoot = join(consumer, 'node_modules');
    for (const segment of packageName.split('/')) {
        const details = lstatSync(runtimeRoot);
        if (details.isSymbolicLink()) {
            throw new Error('Installed runtime path must not contain symbolic links');
        }
        if (!details.isDirectory()) {
            throw new Error('Installed runtime path must contain only directories');
        }
        runtimeRoot = join(runtimeRoot, segment);
    }
    const runtimeDetails = lstatSync(runtimeRoot);
    if (runtimeDetails.isSymbolicLink()) {
        throw new Error('Installed runtime path must not contain symbolic links');
    }
    if (!runtimeDetails.isDirectory()) {
        throw new Error('Installed runtime package must be a directory');
    }
    const packageJsonPath = join(runtimeRoot, 'package.json');
    const packageJsonDetails = lstatSync(packageJsonPath);
    if (packageJsonDetails.isSymbolicLink() || !packageJsonDetails.isFile()) {
        throw new Error('Installed runtime package.json must be a non-symbolic-link regular file');
    }
    const installed = record(JSON.parse(readFileSync(packageJsonPath, 'utf8')), 'installed runtime package.json');
    if (installed.name !== packageName || installed.version !== packageVersion) {
        throw new Error('Installed runtime package identity does not match the model manifest');
    }
    return runtimeRoot;
}

function runtimeArchive(filePath) {
    if (!existsSync(filePath)) {
        throw new TypeError('runtime tarball must be an existing non-symbolic-link regular file');
    }
    const details = lstatSync(filePath);
    if (details.isSymbolicLink() || !details.isFile()) {
        throw new TypeError('runtime tarball must be an existing non-symbolic-link regular file');
    }
    const path = realpathSync(filePath);
    return { path, sha256: sha256File(path) };
}

function installPackageClosure(temporaryRoot, archivePath, runtime, runtimeTarball) {
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
        return {
            consumer,
            deterministicBytes,
            learnedBytes: null,
            runtimeIncrementalBytes: null,
            runtimePackageArchiveSha256: undefined
        };
    }
    const verifiedRuntimeArchive = runtimeTarball ? runtimeArchive(runtimeTarball) : undefined;
    const runtimeSpecifier = verifiedRuntimeArchive?.path ?? `${runtime.package}@${runtime.version}`;
    execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact', runtimeSpecifier], {
        cwd: consumer,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
    if (verifiedRuntimeArchive && sha256File(verifiedRuntimeArchive.path) !== verifiedRuntimeArchive.sha256) {
        throw new Error('runtime tarball changed while its dependency closure was installed');
    }
    validateRuntimeInstallation(consumer, runtime);
    const learnedBytes = measureDirectory(join(consumer, 'node_modules')).logicalBytes;
    return {
        consumer,
        deterministicBytes,
        learnedBytes,
        runtimeIncrementalBytes: learnedBytes - deterministicBytes,
        runtimePackageArchiveSha256: verifiedRuntimeArchive?.sha256
    };
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
    return { commit, clean: status.length === 0, repositoryRoot };
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
    const generatorBaseline = parseGeneratorBaseline(JSON.parse(readFileSync(GENERATOR_BASELINE, 'utf8')));
    const components = manifest.components.map((component) => ({
        id: component.id,
        kind: component.kind,
        fingerprint: component.fingerprint,
        bytes: component.files.reduce((sum, file) => sum + file.bytes, 0)
    }));
    const allFiles = manifest.components.flatMap((component) => component.files);
    const artifacts = manifest.components.flatMap((component) =>
        component.files.map((file) => ({
            componentId: component.id,
            role: file.role,
            fingerprint: file.sha256,
            bytes: file.bytes
        }))
    );
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
    const sftComponent = manifest.components.find(({ kind }) => kind === 'sft');
    const generationConfigPath = sftComponent
        ? verified.files.get(sftComponent.id)?.get('generation-config')
        : undefined;
    if (!generationConfigPath) {
        throw new Error('Verified model cache has no SFT generation configuration');
    }
    return {
        manifest,
        runtime,
        report: {
            manifestBytes: statSync(options.modelManifest).size,
            downloadBytes,
            verifiedCacheBytes,
            generatorBytes,
            generatorBaseline,
            components,
            artifacts
        },
        manifestSha256: sha256File(options.modelManifest),
        generationConfigFingerprint: fingerprint(JSON.parse(readFileSync(generationConfigPath, 'utf8')))
    };
}

function evaluationArtifact(value, label) {
    const artifact = record(value, label);
    return {
        id: string(artifact.id, `${label} ID`),
        filename: string(artifact.filename, `${label} filename`),
        bytes: positiveBytes(artifact.bytes, `${label} bytes`),
        sha256: sha256Value(artifact.sha256, `${label} SHA-256`)
    };
}

function assertMatchingArtifactSet(actual, expected, label) {
    const identity = ({ bytes: size, sha256 }) => `${sha256}:${size}`;
    const actualIdentities = actual.map(identity).sort();
    const expectedIdentities = expected.map(identity).sort();
    if (JSON.stringify(actualIdentities) !== JSON.stringify(expectedIdentities)) {
        throw new Error(`evaluation report ${label} artifacts do not match the verified model manifest`);
    }
}

function assertEqual(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`evaluation report ${label} does not match the current measurement`);
    }
}

/**
 * Verify an imported evaluation report before using its platform metrics.
 *
 * @param {unknown} value evaluation report
 * @param {unknown} expected current package, runtime, model, and machine bindings
 * @returns {object} verified metric and cohort records
 */
export function validateEvaluationReport(value, expected) {
    const report = record(value, 'model evaluation report');
    const bindings = record(expected, 'evaluation bindings');
    const reportFingerprint = sha256Value(report.reportFingerprint, 'model evaluation report fingerprint');
    const unsignedReport = { ...report };
    delete unsignedReport.reportFingerprint;
    if (fingerprint(unsignedReport) !== reportFingerprint) {
        throw new Error('evaluation report fingerprint does not match');
    }
    if (report.schemaVersion !== 1) {
        throw new Error('evaluation report schema version is unsupported');
    }
    const harness = record(report.harness, 'model evaluation harness');
    const runtime = record(harness.runtime, 'model evaluation runtime');
    const policy = record(report.policy, 'model evaluation policy');
    if (policy.processIsolation !== true || harness.sourceClean !== true) {
        throw new Error('evaluation report is not clean process-isolated evidence');
    }
    for (const [actual, expectedValue, label] of [
        [harness.repository, 'SAP/open-ux-tools', 'repository'],
        [harness.package, bindings.packageName, 'package'],
        [harness.packageVersion, bindings.packageVersion, 'package version'],
        [harness.generatorEntry, 'index.js', 'generator entry'],
        [harness.generatorEntrySha256, bindings.generatorEntrySha256, 'generator entry SHA-256'],
        [harness.generatorBuildFingerprint, bindings.generatorBuildFingerprint, 'generator build fingerprint'],
        [harness.codeCommit, bindings.codeCommit, 'code commit'],
        [harness.node, bindings.node, 'Node version'],
        [harness.platform, bindings.platform, 'platform'],
        [harness.cpu, bindings.cpu, 'CPU'],
        [runtime.package, bindings.runtimePackage, 'runtime package'],
        [runtime.version, bindings.runtimeVersion, 'runtime version']
    ]) {
        assertEqual(actual, expectedValue, label);
    }
    const classifier = record(report.classifier, 'classifier evaluation');
    const classifierArtifacts = (Array.isArray(classifier.artifacts) ? classifier.artifacts : []).map(
        (artifact, index) => evaluationArtifact(artifact, `classifier evaluation artifact ${index}`)
    );
    const classifierCohort = classifierArtifacts.find(({ id }) => id === 'classifier-gold-cohort');
    const classifierComponentArtifacts = classifierArtifacts.filter(({ id }) => id !== 'classifier-gold-cohort');
    if (!classifierCohort || classifierArtifacts.length !== classifierComponentArtifacts.length + 1) {
        throw new Error('evaluation report has no unique classifier cohort artifact');
    }
    assertEqual(classifierCohort.sha256, bindings.classifierCohortSha256, 'classifier cohort SHA-256');
    const classifierCohortContract = record(classifier.cohort, 'classifier evaluation cohort');
    const classifierMetrics = record(classifier.metrics, 'classifier evaluation metrics');
    if (
        classifierCohortContract.total !== 300 ||
        classifierCohortContract.eligible !== 233 ||
        classifierCohortContract.quarantined !== 67 ||
        classifierCohortContract.policy !== CLASSIFIER_COHORT_POLICY ||
        classifierMetrics.total !== 233
    ) {
        throw new Error('evaluation report is not the complete frozen classifier cohort');
    }
    assertMatchingArtifactSet(
        classifierComponentArtifacts,
        Array.isArray(bindings.classifierArtifacts) ? bindings.classifierArtifacts : [],
        'classifier'
    );
    assertEqual(
        classifier.componentFingerprint,
        fingerprint(classifierComponentArtifacts),
        'classifier component fingerprint'
    );
    const sftReports = Array.isArray(report.sft) ? report.sft : [];
    const int8Reports = sftReports.filter((candidate) => candidate?.candidate === 'int8');
    if (int8Reports.length !== 1) {
        throw new Error('evaluation report must contain exactly one INT8 SFT evaluation');
    }
    const sft = record(int8Reports[0], 'INT8 SFT evaluation');
    assertEqual(sft.generationConfigFingerprint, bindings.generationConfigFingerprint, 'generation config fingerprint');
    const sftArtifacts = (Array.isArray(sft.artifacts) ? sft.artifacts : []).map((artifact, index) =>
        evaluationArtifact(artifact, `SFT evaluation artifact ${index}`)
    );
    const sftCohort = sftArtifacts.find(({ id }) => id === 'sft-held-out-cohort');
    const sftComponentArtifacts = sftArtifacts.filter(({ id }) => id !== 'sft-held-out-cohort');
    if (!sftCohort || sftArtifacts.length !== sftComponentArtifacts.length + 1) {
        throw new Error('evaluation report has no unique SFT cohort artifact');
    }
    assertEqual(sftCohort.sha256, bindings.sftCohortSha256, 'SFT cohort SHA-256');
    const sftCohortContract = record(sft.cohort, 'SFT evaluation cohort');
    const sftMetrics = record(sft.metrics, 'SFT evaluation metrics');
    if (
        sftCohortContract.available !== 16 ||
        sftCohortContract.executed !== 16 ||
        sftCohortContract.seed !== FROZEN_SFT_SEED ||
        sftCohortContract.locale !== 'en' ||
        sftMetrics.total !== 16
    ) {
        throw new Error('evaluation report is not the complete frozen SFT cohort');
    }
    assertMatchingArtifactSet(
        sftComponentArtifacts,
        Array.isArray(bindings.sftArtifacts) ? bindings.sftArtifacts : [],
        'SFT'
    );
    assertEqual(sft.componentFingerprint, fingerprint(sftComponentArtifacts), 'SFT component fingerprint');
    return {
        reportFingerprint,
        classifier,
        sft,
        classifierCohortSha256: classifierCohort.sha256,
        sftCohortSha256: sftCohort.sha256
    };
}

function evaluationMeasurement(filePath, bindings) {
    if (!filePath) {
        return { timings: {}, peakRssBytes: null, sha256: undefined, provenance: undefined };
    }
    const verified = validateEvaluationReport(JSON.parse(readFileSync(filePath, 'utf8')), bindings);
    const loadSamples = [verified.classifier.metrics?.loadMs, verified.sft.metrics?.loadMs].filter(Number.isFinite);
    const rssSamples = [
        verified.classifier.metrics?.processMaxRssBytes,
        verified.sft.metrics?.processMaxRssBytes
    ].filter(Number.isSafeInteger);
    return {
        timings: {
            modelSessionLoadMs: loadSamples,
            ...(verified.sft.metrics?.latencyMs ? { t2GenerationMs: verified.sft.metrics.latencyMs } : {})
        },
        peakRssBytes: rssSamples.length > 0 ? Math.max(...rssSamples) : null,
        sha256: sha256File(filePath),
        provenance: {
            reportFingerprint: verified.reportFingerprint,
            classifierCohortSha256: verified.classifierCohortSha256,
            sftCohortSha256: verified.sftCohortSha256
        }
    };
}

async function collectFootprint(options) {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'mockgen-footprint-'));
    try {
        const source = sourceState(options.requireClean);
        if (realpathSync(source.repositoryRoot) !== realpathSync(REPOSITORY_ROOT)) {
            throw new Error('Footprint harness package root does not match the Git worktree root');
        }
        const { generatorEntrySha256, generatorBuildFingerprint } = buildAndVerifyPackage();
        const packageResult = packCurrentPackage(temporaryRoot);
        const sourceAfterPack = sourceState(options.requireClean);
        if (sourceAfterPack.commit !== source.commit || sourceAfterPack.clean !== source.clean) {
            throw new Error('Package build or pack changed the measured source state');
        }
        const model = await modelMeasurement(options);
        const installation = installPackageClosure(
            temporaryRoot,
            packageResult.archivePath,
            model?.runtime,
            options.runtimeTarball
        );
        const provider = probeProviderModuleLoad(installation.consumer, options.runs);
        const cpu = cpus()[0]?.model ?? 'unknown';
        const classifierComponent = model?.manifest.components.find(({ kind }) => kind === 'classifier');
        const sftComponent = model?.manifest.components.find(({ kind }) => kind === 'sft');
        const evaluation = evaluationMeasurement(options.evaluationReport, {
            packageName: packageResult.packageName,
            packageVersion: packageResult.packageVersion,
            generatorEntrySha256,
            generatorBuildFingerprint,
            generationConfigFingerprint: model?.generationConfigFingerprint,
            codeCommit: source.commit,
            node: process.version,
            platform: `${process.platform}-${process.arch}`,
            cpu,
            runtimePackage: model?.runtime.package,
            runtimeVersion: model?.runtime.version,
            classifierCohortSha256: FROZEN_CLASSIFIER_COHORT_SHA256,
            sftCohortSha256: FROZEN_SFT_COHORT_SHA256,
            classifierArtifacts: classifierComponent?.files ?? [],
            sftArtifacts: sftComponent?.files ?? []
        });
        return buildFootprintReport({
            candidate: {
                packageName: packageResult.packageName,
                packageVersion: packageResult.packageVersion,
                packageArchiveSha256: packageResult.archiveSha256,
                generatorEntrySha256,
                generatorBuildFingerprint,
                codeCommit: source.commit,
                sourceClean: source.clean,
                ...(model
                    ? {
                          modelRevision: model.manifest.revision,
                          modelManifestSha256: model.manifestSha256,
                          generationConfigFingerprint: model.generationConfigFingerprint,
                          runtimePackage: model.runtime.package,
                          runtimeVersion: model.runtime.version,
                          ...(installation.runtimePackageArchiveSha256
                              ? { runtimePackageArchiveSha256: installation.runtimePackageArchiveSha256 }
                              : {}),
                          generatorBaselineFingerprint: model.report.generatorBaseline.recordFingerprint
                      }
                    : {}),
                ...(evaluation.sha256
                    ? {
                          evaluationReportSha256: evaluation.sha256,
                          evaluationReportFingerprint: evaluation.provenance.reportFingerprint,
                          classifierCohortSha256: evaluation.provenance.classifierCohortSha256,
                          sftCohortSha256: evaluation.provenance.sftCohortSha256
                      }
                    : {})
            },
            environment: {
                node: process.version,
                platform: process.platform,
                architecture: process.arch,
                packageManager: `npm@${npmVersion()}`,
                cpu
            },
            package: {
                packedBytes: packageResult.packedBytes,
                unpackedBytes: packageResult.unpackedBytes,
                boundaryClean: packageResult.boundaryClean
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
                .filter(([name, gate]) => !NON_BLOCKING_TARGETS.has(name) && gate.status !== 'pass')
                .map(([name, gate]) => ({ name, status: gate.status })),
            missedTargets: Object.entries(report.gates)
                .filter(([name, gate]) => NON_BLOCKING_TARGETS.has(name) && gate.status !== 'pass')
                .map(([name, gate]) => ({ name, status: gate.status }))
        })}\n`
    );
    if (options.enforce && !report.footprintReady) {
        process.exitCode = 2;
    }
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n\n${usage()}\n`);
        process.exitCode = 1;
    });
}
