#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
    constants,
    copyFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    assertSafeArchiveEntry,
    createDeterministicArchive,
    inspectPackedArtifact,
    normalizePackedArtifact,
    sha256File
} from './lib/artifacts.mjs';
import { createDevKitManifest, fingerprintManifest } from './lib/manifest.mjs';

const TOOLS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GENERATOR_PACKAGE = '@sap-ux/mockserver-data-generator';
const HOST_CORE_PACKAGE = '@sap-ux/fe-mockserver-core';
const HOST_MIDDLEWARE_PACKAGE = '@sap-ux/ui5-middleware-fe-mockserver';
const COMMIT_PATTERN = /^[a-f\d]{40}$/u;

/**
 * @typedef {object} DevKitReport
 * @property {string} archivePath
 * @property {number} bytes
 * @property {string} sha256
 * @property {string} fingerprint
 * @property {boolean} reproducible
 * @property {number} entries
 * @property {Array<{packageName: string, version: string, sha256: string, bytes: number}>} packages
 */

function readJson(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

function packageManagerInvocation(root) {
    const packageManager = readJson(join(root, 'package.json')).packageManager;
    if (typeof packageManager !== 'string' || !/^pnpm@\d+\.\d+\.\d+$/u.test(packageManager)) {
        throw new Error(`Repository has no pinned pnpm packageManager: ${root}`);
    }
    return { command: 'corepack', prefix: [packageManager] };
}

function execute(command, args, options = {}) {
    return execFileSync(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        encoding: options.encoding ?? 'utf8',
        stdio: options.capture === false ? 'inherit' : ['ignore', 'pipe', 'pipe']
    });
}

function sourceState(root, repository) {
    return {
        repository,
        commit: execute('git', ['rev-parse', 'HEAD'], { cwd: root }).trim(),
        dirty: execute('git', ['status', '--porcelain'], { cwd: root }).trim().length > 0
    };
}

function packPackage({ root, packageName, destination, source }) {
    const manager = packageManagerInvocation(root);
    execute(manager.command, [...manager.prefix, '--filter', packageName, 'run', 'clean'], {
        cwd: root,
        capture: false
    });
    execute(manager.command, [...manager.prefix, '--filter', packageName, 'run', 'build'], {
        cwd: root,
        capture: false
    });
    const output = execute(
        manager.command,
        [...manager.prefix, '--filter', packageName, 'pack', '--pack-destination', destination, '--json'],
        { cwd: root }
    );
    const packed = JSON.parse(output);
    const initialPath = resolve(Array.isArray(packed) ? packed[0]?.filename : packed.filename);
    if (!initialPath || !existsSync(initialPath)) {
        throw new Error(`pnpm pack did not produce ${packageName}`);
    }
    const firstInspection = inspectPackedArtifact(initialPath, packageName);
    normalizePackedArtifact(initialPath, manager);
    const normalizedInspection = inspectPackedArtifact(initialPath, packageName, firstInspection.version);
    const finalFilename = basename(initialPath).replace(/\.tgz$/u, `-${normalizedInspection.sha256.slice(0, 12)}.tgz`);
    const finalPath = join(destination, finalFilename);
    renameSync(initialPath, finalPath);
    return { ...inspectPackedArtifact(finalPath, packageName, normalizedInspection.version), source };
}

function copyPackedPackage({ archivePath, packageName, destination, source }) {
    if (typeof archivePath !== 'string' || !isAbsolute(archivePath)) {
        throw new Error(`Explicit tarball for ${packageName} must be an absolute path`);
    }
    const sourceInfo = lstatSync(archivePath);
    if (!sourceInfo.isFile() || sourceInfo.isSymbolicLink()) {
        throw new Error(`Explicit tarball for ${packageName} must be a regular non-symbolic-link file`);
    }
    const canonicalSource = realpathSync(archivePath);
    const inspection = inspectPackedArtifact(canonicalSource, packageName);
    const safePackageName = packageName.replace(/^@/u, '').replaceAll('/', '-');
    const filename = `${safePackageName}-${inspection.version}-${inspection.sha256.slice(0, 12)}.tgz`;
    const destinationPath = join(destination, filename);
    copyFileSync(canonicalSource, destinationPath, constants.COPYFILE_EXCL);
    return { ...inspectPackedArtifact(destinationPath, packageName, inspection.version), source };
}

function externalHostPackages({ hostCoreTarball, hostMiddlewareTarball, hostSourceCommit, destination }) {
    const source = { repository: 'SAP/open-ux-odata', commit: hostSourceCommit, dirty: false };
    const core = copyPackedPackage({
        archivePath: hostCoreTarball,
        packageName: HOST_CORE_PACKAGE,
        destination,
        source
    });
    const middleware = copyPackedPackage({
        archivePath: hostMiddlewareTarball,
        packageName: HOST_MIDDLEWARE_PACKAGE,
        destination,
        source
    });
    const middlewareManifest = JSON.parse(execute('tar', ['-xOf', hostMiddlewareTarball, 'package/package.json']));
    const requiredCoreVersion = middlewareManifest.dependencies?.[HOST_CORE_PACKAGE];
    if (requiredCoreVersion !== core.version) {
        throw new Error(
            `${HOST_MIDDLEWARE_PACKAGE}@${middleware.version} requires ${HOST_CORE_PACKAGE}@${String(requiredCoreVersion)}, but the supplied core is ${core.version}`
        );
    }
    return [core, middleware];
}

function hostInput(options) {
    const hasRoot = options.hostRoot !== undefined;
    const externalValues = [options.hostCoreTarball, options.hostMiddlewareTarball, options.hostSourceCommit];
    const hasExternal = externalValues.some((value) => value !== undefined);
    if (hasRoot === hasExternal) {
        throw new Error('Exactly one host input mode is required: --host-root or explicit host package tarballs');
    }
    if (hasRoot) {
        if (typeof options.hostRoot !== 'string' || !isAbsolute(options.hostRoot)) {
            throw new Error('--host-root must be an absolute path');
        }
        const root = resolve(options.hostRoot);
        return { mode: 'worktree', root };
    }
    if (typeof options.hostCoreTarball !== 'string' || typeof options.hostMiddlewareTarball !== 'string') {
        throw new Error('Both host package tarballs are required for the explicit host input mode');
    }
    if (typeof options.hostSourceCommit !== 'string' || !COMMIT_PATTERN.test(options.hostSourceCommit)) {
        throw new Error('--host-source-commit must be the exact 40-character lowercase host commit');
    }
    return {
        mode: 'tarballs',
        core: options.hostCoreTarball,
        middleware: options.hostMiddlewareTarball,
        source: { repository: 'SAP/open-ux-odata', commit: options.hostSourceCommit, dirty: false }
    };
}

/**
 * Bundle one development-kit entry point and all local modules into one portable file.
 *
 * @param {string} entryPoint source entry point
 * @param {string} outputFile bundled output path
 * @param {boolean} [requireShim] inject a CommonJS require shim
 */
export function bundleEntry(entryPoint, outputFile, requireShim = false) {
    const manager = packageManagerInvocation(TOOLS_ROOT);
    const args = [
        ...manager.prefix,
        'exec',
        'esbuild',
        entryPoint,
        '--bundle',
        '--platform=node',
        '--format=esm',
        '--target=node22',
        '--main-fields=module,main',
        `--outfile=${outputFile}`,
        '--log-level=warning'
    ];
    if (requireShim) {
        args.push(
            "--banner:js=import { createRequire as __mockgenCreateRequire } from 'node:module'; const require = __mockgenCreateRequire(import.meta.url);"
        );
    }
    execute(manager.command, args, { cwd: TOOLS_ROOT, capture: false });
}

function archiveEntries(archivePath) {
    const entries = execute('tar', ['-tzf', archivePath]).split('\n').filter(Boolean);
    const verbose = execute('tar', ['-tvzf', archivePath]).split('\n').filter(Boolean);
    entries.forEach((entry, index) => assertSafeArchiveEntry(entry, verbose[index] ?? ''));
    return entries;
}

export function renderReadme({ fingerprint, archiveSha256, reproducible, packages }) {
    const packageLines = packages.map((entry) => `- ${entry.packageName}@${entry.version}: ${entry.sha256}`).join('\n');
    return `# Mockserver data generator development kit

Fingerprint: \`${fingerprint}\`

Archive SHA-256: \`${archiveSha256 ?? 'reported after archive creation'}\`

Reproducible source state: \`${String(reproducible)}\`

## Packages

${packageLines}

## Install into an existing Fiori application

\`\`\`bash
node ./setup-local-fiori-app.mjs --app /absolute/path/to/generated-fiori-app
node ./setup-local-fiori-app.mjs --app /absolute/path/to/generated-fiori-app --verify
npm run start-mock
npm run start-mock -- --mockgen
\`\`\`

Use \`--dry-run\` to inspect the operation, \`--offline\` to require a warm
package-manager cache, \`--verify\` to run bounded metadata and entity HTTP
canaries, and \`--restore\` to restore the journaled application files. The
setup keeps one \`sap-fe-mockserver\`, one \`ui5-mock.yaml\`, and the existing
\`start-mock\` flow. The first command uses standard generation; \`--mockgen\`
activates the installed provider. Model weights are not included.

The verification-only debug configuration is created in an operating-system
temporary directory rather than inside the Fiori project. Installation and
restore still require a writable application.

## Optional classifier and SFT test

The retained pilot repository or extracted pilot bundle can be staged into the
production cache contract without adding model weights to this kit:

\`\`\`bash
node ./prepare-pilot-model-cache.mjs \\
  --pilot-root /absolute/path/to/sap-ai-mockserver-or-extracted-pilot \\
  --cache /absolute/path/to/local-mockgen-model/cache \\
  --manifest-out /absolute/path/to/local-mockgen-model/model-manifest.json

node ./setup-local-fiori-app.mjs \\
  --app /absolute/path/to/generated-fiori-app \\
  --kit-root /absolute/path/to/extracted-kit \\
  --model-manifest /absolute/path/to/local-mockgen-model/model-manifest.json \\
  --model-cache /absolute/path/to/local-mockgen-model/cache \\
  --verify
\`\`\`

The installer saves the exact \`onnxruntime-node\` version pinned by the
manifest, verifies the immutable cache, configures offline model paths, and
requires the HTTP canary to report both classifier and SFT readiness. This kit
contains no model manifest, runtime, or weights.
`;
}

/**
 * Build a portable development kit from the current tools and host worktrees.
 *
 * @param {object} options build options
 * @param {string} [options.hostRoot] open-ux-odata worktree containing the host SPI
 * @param {string} [options.hostCoreTarball] packed host-core archive when no worktree is available
 * @param {string} [options.hostMiddlewareTarball] packed middleware archive when no worktree is available
 * @param {string} [options.hostSourceCommit] exact source commit for the explicit host archives
 * @param {string} options.outDir output directory
 * @param {boolean} [options.requireClean] reject dirty source worktrees
 * @returns {DevKitReport} archive report
 */
export function buildDevKit({
    hostRoot,
    hostCoreTarball,
    hostMiddlewareTarball,
    hostSourceCommit,
    outDir,
    requireClean = false
}) {
    if (typeof outDir !== 'string' || !isAbsolute(outDir)) {
        throw new Error('--out must be an absolute path');
    }
    const host = hostInput({ hostRoot, hostCoreTarball, hostMiddlewareTarball, hostSourceCommit });
    const toolsSource = sourceState(TOOLS_ROOT, 'SAP/open-ux-tools');
    const hostSource = host.mode === 'worktree' ? sourceState(host.root, 'SAP/open-ux-odata') : host.source;
    if (requireClean && (toolsSource.dirty || hostSource.dirty)) {
        throw new Error('--require-clean cannot build from a dirty source worktree');
    }
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'mockserver-data-generator-dev-kit-'));
    try {
        const stagingRoot = join(temporaryRoot, 'payload');
        const packageDirectory = join(stagingRoot, 'packages');
        mkdirSync(packageDirectory, { recursive: true });
        const hostPackages =
            host.mode === 'worktree'
                ? [HOST_CORE_PACKAGE, HOST_MIDDLEWARE_PACKAGE].map((packageName) =>
                      packPackage({
                          root: host.root,
                          packageName,
                          destination: packageDirectory,
                          source: hostSource
                      })
                  )
                : externalHostPackages({
                      hostCoreTarball: host.core,
                      hostMiddlewareTarball: host.middleware,
                      hostSourceCommit: hostSource.commit,
                      destination: packageDirectory
                  });
        const packages = [
            packPackage({
                root: TOOLS_ROOT,
                packageName: GENERATOR_PACKAGE,
                destination: packageDirectory,
                source: toolsSource
            }),
            ...hostPackages
        ];

        const setupOutput = join(stagingRoot, 'setup-local-fiori-app.mjs');
        const configureOutput = join(stagingRoot, 'configure-app.mjs');
        const pilotModelOutput = join(stagingRoot, 'prepare-pilot-model-cache.mjs');
        bundleEntry(
            join(TOOLS_ROOT, 'scripts/mockserver-data-generator-dev-kit/setup-local-fiori-app.mjs'),
            setupOutput
        );
        bundleEntry(
            join(TOOLS_ROOT, 'scripts/mockserver-data-generator-dev-kit/lib/bundle-installer.mjs'),
            configureOutput,
            true
        );
        bundleEntry(
            join(TOOLS_ROOT, 'scripts/mockserver-data-generator-dev-kit/prepare-pilot-model-cache.mjs'),
            pilotModelOutput
        );
        const writerVersion = readJson(join(TOOLS_ROOT, 'packages/mockserver-config-writer/package.json')).version;
        const installer = {
            filename: 'setup-local-fiori-app.mjs',
            bytes: statSync(setupOutput).size,
            sha256: sha256File(setupOutput),
            configureFilename: 'configure-app.mjs',
            configureBytes: statSync(configureOutput).size,
            configureSha256: sha256File(configureOutput),
            pilotModelFilename: 'prepare-pilot-model-cache.mjs',
            pilotModelBytes: statSync(pilotModelOutput).size,
            pilotModelSha256: sha256File(pilotModelOutput),
            sourcePackageVersion: writerVersion
        };
        const manifest = createDevKitManifest({ packages, installer });
        const fingerprint = fingerprintManifest(manifest);
        manifest.fingerprint = fingerprint;
        writeFileSync(join(stagingRoot, 'dev-kit-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
        writeFileSync(
            join(stagingRoot, 'README.md'),
            renderReadme({ fingerprint, reproducible: manifest.reproducible, packages })
        );

        const kitName = `mockserver-data-generator-dev-kit-${fingerprint.slice(0, 16)}`;
        const namedRoot = join(temporaryRoot, kitName);
        renameSync(stagingRoot, namedRoot);
        mkdirSync(outDir, { recursive: true });
        const temporaryArchive = join(outDir, `.${kitName}.${randomUUID()}.tmp`);
        createDeterministicArchive(temporaryRoot, kitName, temporaryArchive);
        const entries = archiveEntries(temporaryArchive);
        const archivePath = join(outDir, `${kitName}.tgz`);
        renameSync(temporaryArchive, archivePath);
        return {
            archivePath,
            bytes: statSync(archivePath).size,
            sha256: sha256File(archivePath),
            fingerprint,
            reproducible: manifest.reproducible,
            entries: entries.length,
            packages: packages.map(({ packageName, version, sha256, bytes }) => ({
                packageName,
                version,
                sha256,
                bytes
            }))
        };
    } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
    }
}

function readOption(argv, name) {
    const index = argv.indexOf(name);
    return index < 0 ? undefined : argv[index + 1];
}

export function parseBuildArguments(argv) {
    const hostRoot = readOption(argv, '--host-root');
    const hostCoreTarball = readOption(argv, '--host-core-tgz');
    const hostMiddlewareTarball = readOption(argv, '--host-middleware-tgz');
    const hostSourceCommit = readOption(argv, '--host-source-commit');
    const outDir = readOption(argv, '--out');
    if (!outDir) {
        throw new Error(
            'Usage: build-dev-kit.mjs (--host-root <absolute-path> | --host-core-tgz <absolute-path> --host-middleware-tgz <absolute-path> --host-source-commit <commit>) --out <absolute-directory>'
        );
    }
    const parsed = {
        ...(hostRoot ? { hostRoot } : {}),
        ...(hostCoreTarball ? { hostCoreTarball } : {}),
        ...(hostMiddlewareTarball ? { hostMiddlewareTarball } : {}),
        ...(hostSourceCommit ? { hostSourceCommit } : {}),
        outDir,
        requireClean: argv.includes('--require-clean')
    };
    hostInput(parsed);
    return parsed;
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
    try {
        const report = buildDevKit(parseBuildArguments(process.argv.slice(2)));
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
        process.stderr.write(
            `MockGen development-kit build failed: ${error instanceof Error ? error.message : String(error)}\n`
        );
        process.exitCode = 1;
    }
}
