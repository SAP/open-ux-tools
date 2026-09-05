#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
    existsSync,
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
const PACKAGE_SPECS = [
    { name: '@sap-ux/mockserver-data-generator', owner: 'tools' },
    { name: '@sap-ux/fe-mockserver-core', owner: 'host' },
    { name: '@sap-ux/ui5-middleware-fe-mockserver', owner: 'host' }
];

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
\`\`\`

Use \`--dry-run\` to inspect the operation, \`--offline\` to require a warm
package-manager cache, \`--verify\` to run bounded metadata and entity HTTP
canaries, and \`--restore\` to restore the journaled application files. The
setup keeps one \`sap-fe-mockserver\`, one \`ui5-mock.yaml\`, and the existing
\`start-mock\` flow. Model weights are not included.

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
 * @param {string} options.hostRoot open-ux-odata worktree containing the host SPI
 * @param {string} options.outDir output directory
 * @param {boolean} [options.requireClean] reject dirty source worktrees
 * @returns {object} archive report
 */
export function buildDevKit({ hostRoot, outDir, requireClean = false }) {
    if (!isAbsolute(hostRoot) || !isAbsolute(outDir)) {
        throw new Error('--host-root and --out must be absolute paths');
    }
    const canonicalHostRoot = resolve(hostRoot);
    const toolsSource = sourceState(TOOLS_ROOT, 'SAP/open-ux-tools');
    const hostSource = sourceState(canonicalHostRoot, 'SAP/open-ux-odata');
    if (requireClean && (toolsSource.dirty || hostSource.dirty)) {
        throw new Error('--require-clean cannot build from a dirty source worktree');
    }
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'mockserver-data-generator-dev-kit-'));
    try {
        const stagingRoot = join(temporaryRoot, 'payload');
        const packageDirectory = join(stagingRoot, 'packages');
        mkdirSync(packageDirectory, { recursive: true });
        const packages = PACKAGE_SPECS.map((spec) =>
            packPackage({
                root: spec.owner === 'tools' ? TOOLS_ROOT : canonicalHostRoot,
                packageName: spec.name,
                destination: packageDirectory,
                source: spec.owner === 'tools' ? toolsSource : hostSource
            })
        );

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
    const outDir = readOption(argv, '--out');
    if (!hostRoot || !outDir) {
        throw new Error('Usage: build-dev-kit.mjs --host-root <absolute-path> --out <absolute-directory>');
    }
    return { hostRoot, outDir, requireClean: argv.includes('--require-clean') };
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
