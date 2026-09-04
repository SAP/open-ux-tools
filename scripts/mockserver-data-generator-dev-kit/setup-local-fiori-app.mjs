#!/usr/bin/env node

import { fileURLToPath, pathToFileURL } from 'node:url';
import {
    copyFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    realpathSync,
    renameSync,
    rmSync,
    statSync
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { verifyFileChecksum } from './lib/artifacts.mjs';
import {
    assertPostHashes,
    assertSafeExistingFile,
    atomicWriteFile,
    captureFiles,
    isContainedPath,
    recordPostHashes,
    restoreFiles
} from './lib/app-state.mjs';
import { createInstallStep, createRestoreStep, detectPackageManager, runCommand } from './lib/package-manager.mjs';
import { runFioriCanary, verifyInstalledApplication } from './lib/verify-app.mjs';

const REQUIRED_PACKAGES = [
    '@sap-ux/mockserver-data-generator',
    '@sap-ux/fe-mockserver-core',
    '@sap-ux/ui5-middleware-fe-mockserver'
];
const REPOSITORY_PACKAGE_NAMES = new Set(['@sap-ux/open-ux-tools-root', '@sap-ux/open-ux-odata-root']);
const STATE_DIRECTORY = '.mockserver-data-generator-dev';
const JOURNAL_FILE = 'recovery.json';

/**
 * @typedef {{command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv}} CommandStep
 * @typedef {{packageName: string, version: string, specification: string}} InstalledPackage
 * @typedef {{manifestPath: string, cacheDirectory: string, offline: true, runtimeSpec: string}} ModelDevelopmentInput
 * @typedef {{appRoot: string, generatorSpec: string, webappPath: string, model?: ModelDevelopmentInput}} ConfigureInput
 * @typedef {{status: 'dry-run'|'installed'|'restored', appRoot: string, packageManager?: 'npm'|'pnpm', packages?: object[], installedVerification?: object, integrationVerified?: boolean, modelVerified?: boolean, canary?: object}} SetupResult
 */

/**
 * Validate and canonicalize an existing Fiori application root.
 *
 * @param {string} appRoot application root
 * @returns {string} canonical root
 */
export function validateApplicationRoot(appRoot) {
    if (!isAbsolute(appRoot)) {
        throw new Error('--app must be an absolute path');
    }
    if (!existsSync(appRoot)) {
        throw new Error(`Application root does not exist: ${appRoot}`);
    }
    const rootInfo = lstatSync(appRoot);
    if (rootInfo.isSymbolicLink()) {
        throw new Error('Application root must not be a symbolic link');
    }
    if (!rootInfo.isDirectory()) {
        throw new Error('Application root must be a directory');
    }
    const canonicalRoot = realpathSync(appRoot);
    for (const relativePath of ['package.json', join('webapp', 'manifest.json')]) {
        const filePath = join(canonicalRoot, relativePath);
        if (!existsSync(filePath)) {
            throw new Error(`Fiori application is missing ${relativePath}`);
        }
        assertSafeExistingFile(canonicalRoot, filePath);
    }
    if (!existsSync(join(canonicalRoot, 'ui5.yaml')) && !existsSync(join(canonicalRoot, 'ui5-mock.yaml'))) {
        throw new Error('Fiori application is missing ui5.yaml or ui5-mock.yaml');
    }
    const packageJson = JSON.parse(readFileSync(join(canonicalRoot, 'package.json'), 'utf8'));
    if (REPOSITORY_PACKAGE_NAMES.has(packageJson.name)) {
        throw new Error('Refusing to use an Open UX repository as the Fiori application target');
    }
    return canonicalRoot;
}

function validateModelDevelopmentInput(manifestPath, cacheDirectory) {
    if (!manifestPath && !cacheDirectory) {
        return undefined;
    }
    if (!manifestPath || !cacheDirectory || !isAbsolute(manifestPath) || !isAbsolute(cacheDirectory)) {
        throw new Error('--model-manifest and --model-cache must both be absolute paths');
    }
    for (const [path, label, kind] of [
        [manifestPath, 'Model manifest', 'file'],
        [cacheDirectory, 'Model cache', 'directory']
    ]) {
        if (!existsSync(path)) {
            throw new Error(`${label} does not exist: ${path}`);
        }
        const details = lstatSync(path);
        if (details.isSymbolicLink() || (kind === 'file' ? !details.isFile() : !details.isDirectory())) {
            throw new Error(`${label} must be a regular non-symbolic-link ${kind}`);
        }
    }
    const canonicalManifestPath = realpathSync(manifestPath);
    const canonicalCacheDirectory = realpathSync(cacheDirectory);
    let manifest;
    try {
        manifest = JSON.parse(readFileSync(canonicalManifestPath, 'utf8'));
    } catch {
        throw new Error('Model manifest must contain readable JSON');
    }
    if (!Array.isArray(manifest.components) || manifest.components.length === 0) {
        throw new Error('Model manifest must declare at least one learned component');
    }
    const runtimes = new Set(
        manifest.components.map(
            (component) => `${String(component?.runtime?.package)}@${String(component?.runtime?.version)}`
        )
    );
    if (runtimes.size !== 1) {
        throw new Error('All learned components must pin the same development runtime');
    }
    const [runtimeSpec] = runtimes;
    if (!/^onnxruntime-node@1\.24\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(runtimeSpec)) {
        throw new Error('The current development kit supports an exact onnxruntime-node 1.24.x runtime');
    }
    return {
        manifestPath: canonicalManifestPath,
        cacheDirectory: canonicalCacheDirectory,
        offline: true,
        runtimeSpec
    };
}

function createModelVerifyStep(appRoot, model) {
    return {
        command: process.execPath,
        args: [
            join(appRoot, 'node_modules', '@sap-ux', 'mockserver-data-generator', 'dist', 'cli.js'),
            'verify',
            '--manifest',
            model.manifestPath,
            '--cache',
            model.cacheDirectory
        ],
        cwd: appRoot,
        env: process.env
    };
}

function readKitManifest(kitRoot) {
    const manifestPath = join(kitRoot, 'dev-kit-manifest.json');
    assertSafeExistingFile(kitRoot, manifestPath);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.formatVersion !== 1 || !Array.isArray(manifest.packages)) {
        throw new Error('Unsupported or invalid development kit manifest');
    }
    const packages = REQUIRED_PACKAGES.map((packageName) => {
        const artifact = manifest.packages.find((entry) => entry.packageName === packageName);
        if (!artifact) {
            throw new Error(`Development kit is missing ${packageName}`);
        }
        if (basename(artifact.filename) !== artifact.filename) {
            throw new Error(`Unsafe package filename in development kit: ${artifact.filename}`);
        }
        const sourcePath = join(kitRoot, 'packages', artifact.filename);
        assertSafeExistingFile(kitRoot, sourcePath);
        if (statSync(sourcePath).size !== artifact.bytes) {
            throw new Error(`Size mismatch for ${packageName}`);
        }
        verifyFileChecksum(sourcePath, artifact.sha256);
        return { ...artifact, sourcePath };
    });
    return { manifest, packages };
}

function copyArtifacts(appRoot, stateRoot, packages) {
    if (!existsSync(stateRoot)) {
        mkdirSync(stateRoot, { mode: 0o700 });
    }
    assertSafeStateRoot(appRoot, stateRoot);
    const packageDirectory = join(stateRoot, 'packages');
    if (!existsSync(packageDirectory)) {
        mkdirSync(packageDirectory, { mode: 0o700 });
    }
    assertSafeArtifactDirectory(appRoot, stateRoot, packageDirectory);
    return packages.map((artifact) => {
        assertSafeArtifactDirectory(appRoot, stateRoot, packageDirectory);
        const destination = join(packageDirectory, artifact.filename);
        const temporary = `${destination}.${randomUUID()}.tmp`;
        copyFileSync(artifact.sourcePath, temporary);
        assertSafeArtifactDirectory(appRoot, stateRoot, packageDirectory);
        assertSafeExistingFile(appRoot, temporary);
        verifyFileChecksum(temporary, artifact.sha256);
        renameSync(temporary, destination);
        const specification = `file:${relative(appRoot, destination).replaceAll(sep, '/')}`;
        return { ...artifact, destination, specification };
    });
}

async function loadConfigureFunction(kitRoot) {
    const modulePath = join(kitRoot, 'configure-app.mjs');
    assertSafeExistingFile(kitRoot, modulePath);
    const module = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
    if (typeof module.configureFioriApplication !== 'function') {
        throw new Error('Development kit configure-app.mjs has no configureFioriApplication export');
    }
    return module.configureFioriApplication;
}

function writeJournal(appRoot, stateRoot, journalPath, journal) {
    assertSafeStateRoot(appRoot, stateRoot);
    if (existsSync(journalPath)) {
        assertSafeExistingFile(appRoot, journalPath);
    }
    atomicWriteFile(journalPath, `${JSON.stringify(journal, null, 2)}\n`);
}

function assertSafeStateRoot(appRoot, stateRoot) {
    if (!isContainedPath(appRoot, stateRoot)) {
        throw new Error('MockGen recovery state root escapes the application root');
    }
    const stateInfo = lstatSync(stateRoot);
    if (stateInfo.isSymbolicLink()) {
        throw new Error('MockGen recovery state root must not be a symbolic link');
    }
    if (!stateInfo.isDirectory() || realpathSync(stateRoot) !== stateRoot) {
        throw new Error('MockGen recovery state root is not a regular application-local directory');
    }
}

function assertSafeArtifactDirectory(appRoot, stateRoot, packageDirectory) {
    assertSafeStateRoot(appRoot, stateRoot);
    if (!isContainedPath(stateRoot, packageDirectory)) {
        throw new Error('Development package directory escapes the MockGen recovery state root');
    }
    const packageInfo = lstatSync(packageDirectory);
    if (packageInfo.isSymbolicLink()) {
        throw new Error('MockGen development package directory must not be a symbolic link');
    }
    if (
        !packageInfo.isDirectory() ||
        !isContainedPath(appRoot, realpathSync(packageDirectory)) ||
        realpathSync(packageDirectory) !== packageDirectory
    ) {
        throw new Error('MockGen development package directory is not a regular application-local directory');
    }
}

/**
 * Install, dry-run, or restore a local MockGen development package set.
 *
 * @param {object} options setup options
 * @param {string} options.appRoot absolute Fiori application root
 * @param {string} options.kitRoot extracted development kit root
 * @param {boolean} [options.dryRun] avoid all writes
 * @param {boolean} [options.restore] restore journaled application state
 * @param {boolean} [options.offline] require package-manager offline mode
 * @param {boolean} [options.verify] start a bounded application-local HTTP canary
 * @param {string} [options.modelManifestPath] verified production-format model manifest
 * @param {string} [options.modelCacheDirectory] verified production model cache
 * @param {(step: CommandStep) => Promise<void>} [options.runner] command runner
 * @param {(input: ConfigureInput) => Promise<void>} [options.configure] injected configuration function for tests
 * @param {(appRoot: string, packages: InstalledPackage[]) => object} [options.verifyInstalled] installed-state verifier
 * @param {(appRoot: string, options?: {expectedLearned?: boolean}) => Promise<object>} [options.runCanary] HTTP canary implementation
 * @returns {Promise<SetupResult>} structured setup result
 */
export async function setupLocalFioriApp({
    appRoot,
    kitRoot,
    dryRun = false,
    restore = false,
    offline = false,
    verify = false,
    modelManifestPath,
    modelCacheDirectory,
    runner = runCommand,
    configure,
    verifyInstalled = verifyInstalledApplication,
    runCanary = runFioriCanary
}) {
    const canonicalAppRoot = validateApplicationRoot(appRoot);
    const canonicalKitRoot = realpathSync(resolve(kitRoot));
    const stateRoot = join(canonicalAppRoot, STATE_DIRECTORY);
    const journalPath = join(stateRoot, JOURNAL_FILE);
    const packageManager = detectPackageManager(canonicalAppRoot);

    if (restore) {
        if (!existsSync(journalPath)) {
            throw new Error('No MockGen recovery journal exists for this application');
        }
        assertSafeStateRoot(canonicalAppRoot, stateRoot);
        assertSafeExistingFile(canonicalAppRoot, journalPath);
        const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
        const dependenciesOnly = ['rolled-back', 'restoring-dependencies', 'restore-reconciliation-failed'].includes(
            journal.status
        );
        if (!dependenciesOnly) {
            assertPostHashes(canonicalAppRoot, journal.files);
            restoreFiles(canonicalAppRoot, journal.files);
            journal.status = 'restoring-dependencies';
            writeJournal(canonicalAppRoot, stateRoot, journalPath, journal);
        }
        try {
            await runner(createRestoreStep(journal.packageManager, canonicalAppRoot));
            assertSafeStateRoot(canonicalAppRoot, stateRoot);
            rmSync(stateRoot, { recursive: true });
            return { status: 'restored', appRoot: canonicalAppRoot };
        } catch (error) {
            journal.status = 'restore-reconciliation-failed';
            journal.restoreError = error instanceof Error ? error.message : String(error);
            try {
                assertSafeStateRoot(canonicalAppRoot, stateRoot);
                writeJournal(canonicalAppRoot, stateRoot, journalPath, journal);
            } catch {
                // The recovery directory changed unexpectedly; do not follow it or recreate state through it.
            }
            throw new Error(
                `Application files were restored but dependency reconciliation failed: ${journal.restoreError}`
            );
        }
    }

    const model = validateModelDevelopmentInput(modelManifestPath, modelCacheDirectory);
    const kit = readKitManifest(canonicalKitRoot);
    if (dryRun) {
        return {
            status: 'dry-run',
            appRoot: canonicalAppRoot,
            packageManager: packageManager.name,
            packages: kit.packages.map(({ packageName, version, sha256 }) => ({ packageName, version, sha256 })),
            ...(model ? { modelRuntime: model.runtimeSpec } : {})
        };
    }

    let journal;
    if (existsSync(journalPath)) {
        assertSafeExistingFile(canonicalAppRoot, journalPath);
        journal = JSON.parse(readFileSync(journalPath, 'utf8'));
        if (journal.status === 'installed') {
            assertPostHashes(canonicalAppRoot, journal.files);
        } else if (['restored', 'rolled-back'].includes(journal.status)) {
            journal = undefined;
        } else {
            throw new Error(`Existing MockGen recovery journal has status '${String(journal.status)}'`);
        }
    }
    if (!journal) {
        const trackedPaths = ['package.json', 'ui5-mock.yaml'];
        const expectedLockfile = packageManager.name === 'npm' ? 'package-lock.json' : packageManager.lockfile;
        if (expectedLockfile) {
            trackedPaths.push(expectedLockfile);
        }
        journal = {
            formatVersion: 1,
            status: 'preparing',
            appRoot: canonicalAppRoot,
            packageManager,
            files: captureFiles(canonicalAppRoot, trackedPaths)
        };
    }

    const localArtifacts = copyArtifacts(canonicalAppRoot, stateRoot, kit.packages);
    journal.status = 'installing';
    journal.kit = {
        reproducible: kit.manifest.reproducible === true,
        packages: localArtifacts.map(({ packageName, version, sha256, specification }) => ({
            packageName,
            version,
            sha256,
            specification
        }))
    };
    writeJournal(canonicalAppRoot, stateRoot, journalPath, journal);

    try {
        const configureApplication = configure ?? (await loadConfigureFunction(canonicalKitRoot));
        const generator = localArtifacts.find(
            (artifact) => artifact.packageName === '@sap-ux/mockserver-data-generator'
        );
        await configureApplication({
            appRoot: canonicalAppRoot,
            generatorSpec: generator.specification,
            webappPath: join(canonicalAppRoot, 'webapp'),
            ...(model ? { model } : {})
        });
        await runner(
            createInstallStep(
                packageManager,
                [...localArtifacts.map((artifact) => artifact.specification), ...(model ? [model.runtimeSpec] : [])],
                canonicalAppRoot,
                offline,
                model !== undefined
            )
        );
        if (model) {
            await runner(createModelVerifyStep(canonicalAppRoot, model));
        }
        const installedVerification = verifyInstalled(
            canonicalAppRoot,
            localArtifacts.map(({ packageName, version, specification }) => ({
                packageName,
                version,
                specification
            }))
        );
        const canary = verify ? await runCanary(canonicalAppRoot, { expectedLearned: model !== undefined }) : undefined;
        recordPostHashes(canonicalAppRoot, journal.files);
        journal.status = 'installed';
        journal.installedAt = new Date().toISOString();
        writeJournal(canonicalAppRoot, stateRoot, journalPath, journal);
        return {
            status: 'installed',
            appRoot: canonicalAppRoot,
            packageManager: packageManager.name,
            packages: journal.kit.packages,
            installedVerification,
            integrationVerified: canary?.integrationVerified === true,
            ...(model ? { modelVerified: true } : {}),
            ...(canary ? { canary } : {})
        };
    } catch (error) {
        restoreFiles(canonicalAppRoot, journal.files, { checkPostHashes: false });
        let dependencyRollbackError;
        try {
            await runner(createRestoreStep(journal.packageManager, canonicalAppRoot));
        } catch (rollbackError) {
            dependencyRollbackError = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
        }
        journal.status = 'rolled-back';
        journal.error = error instanceof Error ? error.message : String(error);
        if (dependencyRollbackError) {
            journal.dependencyRollbackError = dependencyRollbackError;
        }
        try {
            writeJournal(canonicalAppRoot, stateRoot, journalPath, journal);
        } catch {
            // Preserve the original installation failure if recovery state was replaced unexpectedly.
        }
        throw error;
    }
}

function readOption(argv, name) {
    const index = argv.indexOf(name);
    return index < 0 ? undefined : argv[index + 1];
}

/**
 * Parse the standalone installer command line.
 *
 * @param {string[]} argv command-line arguments
 * @returns {object} setup options
 */
export function parseArguments(argv) {
    const appRoot = readOption(argv, '--app');
    if (!appRoot) {
        throw new Error('Usage: setup-local-fiori-app.mjs --app <absolute-path> [--dry-run|--restore]');
    }
    return {
        appRoot,
        kitRoot: readOption(argv, '--kit-root') ?? dirname(fileURLToPath(import.meta.url)),
        dryRun: argv.includes('--dry-run'),
        restore: argv.includes('--restore'),
        offline: argv.includes('--offline'),
        verify: argv.includes('--verify'),
        modelManifestPath: readOption(argv, '--model-manifest'),
        modelCacheDirectory: readOption(argv, '--model-cache')
    };
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
    setupLocalFioriApp(parseArguments(process.argv.slice(2)))
        .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
        .catch((error) => {
            process.stderr.write(`MockGen setup failed: ${error instanceof Error ? error.message : String(error)}\n`);
            process.exitCode = 1;
        });
}
