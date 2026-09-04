#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
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
import { createServer } from 'node:http';
import { cpus, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runFioriCanary, discoverCanaryTarget } from '../mockserver-data-generator-dev-kit/lib/verify-app.mjs';
import { assertPostHashes } from '../mockserver-data-generator-dev-kit/lib/app-state.mjs';
import { buildIntegrationPerformanceReport } from './lib/integration-performance.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PACKAGE_ROOT = join(REPOSITORY_ROOT, 'packages', 'mockserver-data-generator');
const PACKAGE_NAME = '@sap-ux/mockserver-data-generator';
const HOST_PACKAGE_NAMES = new Set(['@sap-ux/fe-mockserver-core', '@sap-ux/ui5-middleware-fe-mockserver']);
const ACQUISITION_TIMEOUT_MS = 30_000;
const SHA_256 = /^[a-f\d]{64}$/u;

function usage() {
    return [
        'Usage:',
        '  pnpm mockserver-data-generator:measure-integration -- --app <installed-fiori-app> \\',
        '    --model-manifest <manifest.json> --model-cache <cache> --output <report.json> [options]',
        '',
        'Options:',
        '  --runtime-tarball <path>  Exact platform runtime candidate to install without scripts',
        '  --runs <number>           Cold, warm-cache, and acquisition samples (default: 5)',
        '',
        'The app must have been installed by the current reproducible MockGen development kit',
        'with the supplied model manifest and cache. The harness does not write local paths or rows',
        'to its report.'
    ].join('\n');
}

function readOption(argv, name) {
    const index = argv.indexOf(name);
    return index < 0 ? undefined : argv[index + 1];
}

function absoluteOption(argv, name) {
    const value = readOption(argv, name);
    if (!value || !isAbsolute(value)) {
        throw new TypeError(`${name} must be an absolute path`);
    }
    return resolve(value);
}

/** Parse the repository integration-performance command line. */
export function parseArguments(argv) {
    const input = argv[0] === '--' ? argv.slice(1) : argv;
    if (input.includes('--help') || input.includes('-h')) {
        process.stdout.write(`${usage()}\n`);
        return undefined;
    }
    const known = new Set(['--app', '--model-manifest', '--model-cache', '--runtime-tarball', '--output', '--runs']);
    for (let index = 0; index < input.length; index += 2) {
        if (!known.has(input[index])) {
            throw new TypeError(`Unknown argument: ${String(input[index])}`);
        }
        if (!input[index + 1] || input[index + 1].startsWith('--')) {
            throw new TypeError(`Missing value for ${input[index]}`);
        }
    }
    const runsValue = readOption(input, '--runs') ?? '5';
    if (!/^[1-9]\d*$/u.test(runsValue)) {
        throw new TypeError('--runs must be a decimal integer');
    }
    const runs = Number(runsValue);
    if (!Number.isSafeInteger(runs) || runs < 5 || runs > 100) {
        throw new TypeError('--runs must be an integer from 5 through 100');
    }
    const runtimeTarball = readOption(input, '--runtime-tarball');
    return {
        appRoot: absoluteOption(input, '--app'),
        modelManifest: absoluteOption(input, '--model-manifest'),
        modelCache: absoluteOption(input, '--model-cache'),
        output: absoluteOption(input, '--output'),
        ...(runtimeTarball ? { runtimeTarball: absoluteOption(input, '--runtime-tarball') } : {}),
        runs
    };
}

function sha256File(filePath) {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
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

function assertRegularPath(filePath, label, kind) {
    if (!existsSync(filePath)) {
        throw new Error(`${label} does not exist`);
    }
    const details = lstatSync(filePath);
    if (details.isSymbolicLink() || (kind === 'file' ? !details.isFile() : !details.isDirectory())) {
        throw new Error(`${label} must be a non-symbolic-link ${kind}`);
    }
    return realpathSync(filePath);
}

function isContained(root, filePath) {
    const child = relative(root, filePath);
    return child.length > 0 && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

function fingerprintDirectory(root) {
    const canonicalRoot = assertRegularPath(root, 'compiled generator root', 'directory');
    const pending = [canonicalRoot];
    const files = [];
    while (pending.length > 0) {
        const directory = pending.pop();
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const filePath = join(directory, entry.name);
            const details = lstatSync(filePath);
            if (details.isSymbolicLink()) {
                throw new Error('compiled generator output must not contain symbolic links');
            }
            if (details.isDirectory()) {
                pending.push(filePath);
            } else if (details.isFile()) {
                files.push({
                    path: relative(canonicalRoot, filePath).replaceAll('\\', '/'),
                    bytes: details.size,
                    sha256: sha256File(filePath)
                });
            } else {
                throw new Error('compiled generator output must contain only regular files and directories');
            }
        }
    }
    files.sort((left, right) => left.path.localeCompare(right.path));
    return fingerprint(files);
}

function installedPackageRoot(appRoot, packageName) {
    let current = join(appRoot, 'node_modules');
    for (const segment of packageName.split('/')) {
        assertRegularPath(current, `installed path for ${packageName}`, 'directory');
        current = join(current, segment);
    }
    return assertRegularPath(current, `installed package ${packageName}`, 'directory');
}

function trackedApplicationState(appRoot) {
    return Object.fromEntries(
        ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'ui5-mock.yaml']
            .map((name) => [name, join(appRoot, name)])
            .filter(([, filePath]) => existsSync(filePath))
            .map(([name, filePath]) => [name, sha256File(filePath)])
    );
}

function installRuntimeCandidate(appRoot, runtimeTarball) {
    const archivePath = assertRegularPath(runtimeTarball, 'runtime tarball', 'file');
    const archiveSha256 = sha256File(archivePath);
    const trackedBefore = trackedApplicationState(appRoot);
    execFileSync(
        'npm',
        ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-save', '--package-lock=false', archivePath],
        {
            cwd: appRoot,
            env: {
                ...process.env,
                ONNXRUNTIME_NODE_INSTALL: 'skip',
                ONNXRUNTIME_NODE_INSTALL_CUDA: 'skip'
            },
            stdio: 'inherit'
        }
    );
    if (sha256File(archivePath) !== archiveSha256) {
        throw new Error('runtime tarball changed while it was installed');
    }
    if (canonicalJson(trackedApplicationState(appRoot)) !== canonicalJson(trackedBefore)) {
        throw new Error('runtime candidate installation changed an application-owned file');
    }
    return archiveSha256;
}

async function readInstalledCandidate(options) {
    const appRoot = assertRegularPath(options.appRoot, 'Fiori application root', 'directory');
    const journalPath = join(appRoot, '.mockserver-data-generator-dev', 'recovery.json');
    const journal = JSON.parse(
        readFileSync(assertRegularPath(journalPath, 'MockGen installation journal', 'file'), 'utf8')
    );
    if (journal.status !== 'installed' || journal.kit?.reproducible !== true || !Array.isArray(journal.kit.packages)) {
        throw new Error('Fiori app is not installed from a complete reproducible MockGen development kit');
    }
    assertPostHashes(appRoot, journal.files);
    if (journal.packageManager?.name !== 'npm') {
        throw new Error('The current fixed integration harness requires an npm-based Fiori reference fixture');
    }
    const packageRecords = journal.kit.packages.map((entry) => {
        if (
            typeof entry.packageName !== 'string' ||
            typeof entry.version !== 'string' ||
            typeof entry.sha256 !== 'string' ||
            !SHA_256.test(entry.sha256) ||
            typeof entry.specification !== 'string' ||
            !entry.specification.startsWith('file:') ||
            entry.source?.dirty !== false ||
            typeof entry.source?.commit !== 'string'
        ) {
            throw new Error('MockGen installation journal has incomplete package provenance');
        }
        const archive = assertRegularPath(
            resolve(appRoot, entry.specification.slice('file:'.length)),
            `development artifact for ${entry.packageName}`,
            'file'
        );
        const artifactRoot = assertRegularPath(
            join(appRoot, '.mockserver-data-generator-dev', 'packages'),
            'development artifact root',
            'directory'
        );
        if (!isContained(artifactRoot, archive) || sha256File(archive) !== entry.sha256) {
            throw new Error(`Installed development artifact is not integrity-bound for ${entry.packageName}`);
        }
        return { ...entry, archive };
    });
    const generatorRecord = packageRecords.find(({ packageName }) => packageName === PACKAGE_NAME);
    const hostRecords = packageRecords.filter(({ packageName }) => HOST_PACKAGE_NAMES.has(packageName));
    if (!generatorRecord || hostRecords.length !== HOST_PACKAGE_NAMES.size) {
        throw new Error('Installed development kit is missing the generator or exact FE mockserver host packages');
    }
    const repositoryCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8'
    }).trim();
    const repositoryStatus = execFileSync('git', ['status', '--porcelain=v1'], {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8'
    }).trim();
    if (repositoryCommit !== generatorRecord.source.commit || repositoryStatus.length > 0) {
        throw new Error('Integration measurement requires the exact clean generator source used by the installed kit');
    }
    const generatorRoot = installedPackageRoot(appRoot, PACKAGE_NAME);
    const generatorPackage = JSON.parse(readFileSync(join(generatorRoot, 'package.json'), 'utf8'));
    if (generatorPackage.name !== PACKAGE_NAME || generatorPackage.version !== generatorRecord.version) {
        throw new Error('Installed generator identity does not match the development kit');
    }
    const installedEntry = join(generatorRoot, 'dist', 'index.js');
    const sourceEntry = join(PACKAGE_ROOT, 'dist', 'index.js');
    if (sha256File(installedEntry) !== sha256File(sourceEntry)) {
        throw new Error('Installed generator entry does not match the exact clean source build');
    }

    const manifestPath = assertRegularPath(options.modelManifest, 'model manifest', 'file');
    const modelCache = assertRegularPath(options.modelCache, 'model cache', 'directory');
    if (
        journal.model?.manifestPath !== manifestPath ||
        journal.model?.manifestSha256 !== sha256File(manifestPath) ||
        journal.model?.cacheDirectory !== modelCache
    ) {
        throw new Error('Integration model inputs do not match the exact model configured by the installer');
    }
    const generatorModule = await import(`${pathToFileURL(installedEntry).href}?integration=${Date.now()}`);
    const manifest = generatorModule.parseModelManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
    const verifiedCache = await generatorModule.verifyModelCache(modelCache, manifest);
    if (!verifiedCache.ready) {
        throw new Error('Integration model cache is not fully verified');
    }
    const runtimes = new Map(
        manifest.components.map((component) => [
            `${component.runtime.package}@${component.runtime.version}`,
            component.runtime
        ])
    );
    if (runtimes.size !== 1) {
        throw new Error('Integration model components must use one exact runtime');
    }
    const [runtime] = runtimes.values();
    const runtimeRoot = installedPackageRoot(appRoot, runtime.package);
    const runtimePackage = JSON.parse(readFileSync(join(runtimeRoot, 'package.json'), 'utf8'));
    if (runtimePackage.name !== runtime.package || runtimePackage.version !== runtime.version) {
        throw new Error('Installed runtime identity does not match the model manifest');
    }
    fingerprintDirectory(runtimeRoot);

    return {
        appRoot,
        manifest,
        modelCache,
        generatorModule,
        candidate: {
            generator: {
                packageName: generatorRecord.packageName,
                packageVersion: generatorRecord.version,
                packageArchiveSha256: generatorRecord.sha256,
                entrySha256: sha256File(sourceEntry),
                buildFingerprint: fingerprintDirectory(join(PACKAGE_ROOT, 'dist')),
                sourceCommit: generatorRecord.source.commit
            },
            hostPackages: hostRecords.map((entry) => ({
                packageName: entry.packageName,
                packageVersion: entry.version,
                packageArchiveSha256: entry.sha256,
                sourceCommit: entry.source.commit
            })),
            model: { manifestSha256: sha256File(manifestPath), revision: manifest.revision },
            runtime: {
                packageName: runtime.package,
                packageVersion: runtime.version,
                ...(options.runtimeArchiveSha256 ? { packageArchiveSha256: options.runtimeArchiveSha256 } : {})
            }
        }
    };
}

function fixtureMeasurement(appRoot) {
    const target = discoverCanaryTarget(appRoot);
    const applicationManifestPath = join(appRoot, 'webapp', 'manifest.json');
    const mockConfigurationPath = join(appRoot, 'ui5-mock.yaml');
    const measurement = {
        metadataSha256: sha256File(target.metadataPath),
        applicationManifestSha256: sha256File(applicationManifestPath),
        mockConfigurationSha256: sha256File(mockConfigurationPath),
        servicePath: target.servicePath,
        entitySet: target.entitySet
    };
    return { ...measurement, fingerprint: fingerprint(measurement) };
}

function requireColdMeasurement(result) {
    for (const property of ['runtimeInitializationMs', 'wholeServiceGenerationMs', 'hostProviderMs']) {
        if (!Number.isFinite(result[property])) {
            throw new Error(`Cold Fiori canary did not report ${property}`);
        }
    }
    return {
        runtimeInitializationMs: result.runtimeInitializationMs,
        wholeServiceGenerationMs: result.wholeServiceGenerationMs,
        hostProviderMs: result.hostProviderMs
    };
}

function requireWarmMeasurement(result) {
    for (const property of ['generatedDataCacheHitMs', 'hostProviderMs']) {
        if (!Number.isFinite(result[property])) {
            throw new Error(`Warm-cache Fiori canary did not report ${property}`);
        }
    }
    return {
        generatedDataCacheHitMs: result.generatedDataCacheHitMs,
        hostProviderMs: result.hostProviderMs,
        modelSessionInitialized: false
    };
}

async function withArtifactMirror(manifest, modelCache, operation) {
    const bundleRoot = realpathSync(join(modelCache, manifest.bundleId, manifest.revision));
    const files = new Map();
    for (const component of manifest.components) {
        for (const file of component.files) {
            const filePath = realpathSync(join(bundleRoot, file.path));
            if (
                !isContained(bundleRoot, filePath) ||
                statSync(filePath).size !== file.bytes ||
                sha256File(filePath) !== file.sha256
            ) {
                throw new Error(`Verified artifact changed before acquisition measurement: ${file.role}`);
            }
            files.set(`/${file.path}`, { filePath, bytes: file.bytes });
        }
    }
    let requests = 0;
    const server = createServer((request, response) => {
        const artifact = files.get(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
        if (request.method !== 'GET' || !artifact) {
            response.writeHead(404).end();
            return;
        }
        requests += 1;
        response.writeHead(200, { 'content-length': artifact.bytes, 'content-type': 'application/octet-stream' });
        createReadStream(artifact.filePath).pipe(response);
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('Artifact mirror did not bind a loopback port');
    }
    try {
        return await operation({
            baseUrl: `http://127.0.0.1:${address.port}`,
            fileCount: files.size,
            requestCount: () => requests
        });
    } finally {
        await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
}

async function measureAcquisition(candidate, runs) {
    return withArtifactMirror(candidate.manifest, candidate.modelCache, async (mirror) => {
        const observations = [];
        for (let index = 0; index < runs; index += 1) {
            const cacheRoot = mkdtempSync(join(tmpdir(), 'mockgen-acquisition-performance-'));
            const requestsBefore = mirror.requestCount();
            try {
                const startedAt = performance.now();
                const result = await candidate.generatorModule.prepareModelCache(cacheRoot, candidate.manifest, {
                    acquisitionTimeoutMs: ACQUISITION_TIMEOUT_MS,
                    mirrorBaseUrl: mirror.baseUrl
                });
                const elapsedMs = performance.now() - startedAt;
                if (!result.ready || mirror.requestCount() - requestsBefore !== mirror.fileCount) {
                    throw new Error('First-use acquisition did not fetch and verify every exact model artifact');
                }
                observations.push(elapsedMs);
                process.stderr.write(
                    `MockGen integration acquisition sample ${index + 1}/${runs}: ${elapsedMs.toFixed(3)} ms\n`
                );
            } finally {
                rmSync(cacheRoot, { recursive: true, force: true });
            }
        }
        return observations;
    });
}

/** Collect exact Fiori/MockServer and acquisition observations. */
export async function collectIntegrationPerformance(options, dependencies = {}) {
    const runtimeArchiveSha256 = options.runtimeTarball
        ? installRuntimeCandidate(options.appRoot, options.runtimeTarball)
        : undefined;
    const candidate = await readInstalledCandidate({ ...options, runtimeArchiveSha256 });
    const runCanary = dependencies.runCanary ?? runFioriCanary;
    const acquisition = dependencies.measureAcquisition ?? measureAcquisition;
    const trackedBefore = trackedApplicationState(candidate.appRoot);
    const cold = [];
    for (let index = 0; index < options.runs; index += 1) {
        const observation = requireColdMeasurement(
            await runCanary(candidate.appRoot, { timeoutMs: 60_000, expectedLearned: true })
        );
        cold.push(observation);
        process.stderr.write(
            `MockGen integration cold sample ${index + 1}/${options.runs}: ${observation.wholeServiceGenerationMs.toFixed(3)} ms\n`
        );
    }
    const generatedDataCache = mkdtempSync(join(tmpdir(), 'mockgen-generated-cache-performance-'));
    let warmCache;
    try {
        requireColdMeasurement(
            await runCanary(candidate.appRoot, {
                timeoutMs: 60_000,
                expectedLearned: true,
                generatedDataCacheDirectory: generatedDataCache
            })
        );
        warmCache = [];
        for (let index = 0; index < options.runs; index += 1) {
            const observation = requireWarmMeasurement(
                await runCanary(candidate.appRoot, {
                    timeoutMs: 60_000,
                    expectedCacheHit: true,
                    generatedDataCacheDirectory: generatedDataCache
                })
            );
            warmCache.push(observation);
            process.stderr.write(
                `MockGen integration cache sample ${index + 1}/${options.runs}: ${observation.generatedDataCacheHitMs.toFixed(3)} ms\n`
            );
        }
    } finally {
        rmSync(generatedDataCache, { recursive: true, force: true });
    }
    const firstUseAcquisitionMs = await acquisition(candidate, options.runs);
    if (canonicalJson(trackedApplicationState(candidate.appRoot)) !== canonicalJson(trackedBefore)) {
        throw new Error('Integration canaries changed an application-owned file');
    }
    return buildIntegrationPerformanceReport({
        candidate: candidate.candidate,
        environment: {
            node: process.version,
            platform: process.platform,
            architecture: process.arch,
            cpu: cpus()[0]?.model ?? 'unknown'
        },
        fixture: fixtureMeasurement(candidate.appRoot),
        observations: { cold, warmCache, firstUseAcquisitionMs },
        acquisitionTimeoutMs: ACQUISITION_TIMEOUT_MS
    });
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (!options) return;
    if (existsSync(options.output)) {
        throw new Error('Refusing to overwrite an existing integration performance report');
    }
    const report = await collectIntegrationPerformance(options);
    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(
        `${JSON.stringify({ output: options.output, integrationReady: report.integrationReady, reportFingerprint: report.reportFingerprint })}\n`
    );
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n\n${usage()}\n`);
        process.exitCode = 1;
    });
}
