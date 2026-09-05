#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    statSync,
    symlinkSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAXIMUM_PACKED_BYTES = 5 * 1024 * 1024;
const FORBIDDEN_EXTENSION = /\.(?:bin|ckpt|jsonl|map|onnx|pt|pth|safetensors)$/iu;
const FORBIDDEN_DIRECTORY =
    /(?:^|\/)(?:\.cache|\.mockgen-cache|generated-data-cache|judge-(?:outputs?|reports?|results?)|model-cache|provider-outputs?)(?:\/|$)/iu;
const FORBIDDEN_JUDGE_FILE = /^judge[-_](?:output|report|result)s?\.json$/iu;
const UNIX_DEVELOPER_PATH = /\/(?:(?:Users|home)\/[A-Za-z0-9._-]+|root)\//u;
const WINDOWS_DEVELOPER_PATH = /[A-Za-z]:\/Users\/[A-Za-z0-9._-]+\//u;
const UNC_DEVELOPER_PATH = /\\{2,}[A-Za-z0-9._-]+\\+[A-Za-z0-9.$_-]+\\+/u;
const MODEL_MANIFEST_FILE = /(?:^|\/)model-manifest(?:[-_.][^/]*)?\.json$/iu;
const ALLOWED_RESOURCE_FILES = new Set(['resources/model-manifest.json']);
const REQUIRED_RUNTIME_TARGETS = new Set(['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64']);
const CORE_DOCUMENTATION = [
    'README.md',
    'docs/architecture.md',
    'docs/host-contract.md',
    'docs/pilot-parity.md',
    'docs/security.md',
    'docs/troubleshooting.md'
];

function packageProfile(args) {
    if (args.length === 0) {
        return 'core';
    }
    if (args.length === 2 && args[0] === '--profile' && ['core', 'cap'].includes(args[1])) {
        return args[1];
    }
    throw new Error('Usage: check-package.mjs [--profile core|cap]');
}

function packedFiles(report) {
    if (!report || typeof report !== 'object' || !Array.isArray(report.files)) {
        throw new Error('pnpm pack returned an invalid JSON report');
    }
    return report.files.map((entry) => {
        if (!entry || typeof entry.path !== 'string' || entry.path.length === 0) {
            throw new Error('pnpm pack returned an invalid file entry');
        }
        return entry.path.replaceAll('\\', '/');
    });
}

async function assertPackageBoundary(packageRoot, files) {
    const canonicalRoot = realpathSync(packageRoot);
    for (const path of files) {
        if (path.toLowerCase().startsWith('resources/') && !ALLOWED_RESOURCE_FILES.has(path)) {
            throw new Error(`Unexpected published resource: ${path}`);
        }
        if (
            FORBIDDEN_EXTENSION.test(path) ||
            FORBIDDEN_DIRECTORY.test(path) ||
            FORBIDDEN_JUDGE_FILE.test(basename(path))
        ) {
            throw new Error(`Forbidden published artifact: ${path}`);
        }
        const unresolvedSource = resolve(canonicalRoot, path);
        if (unresolvedSource !== canonicalRoot && !unresolvedSource.startsWith(`${canonicalRoot}${sep}`)) {
            throw new Error(`Packed path escapes the package root: ${path}`);
        }
        const metadata = lstatSync(unresolvedSource);
        if (!metadata.isFile() || metadata.isSymbolicLink()) {
            throw new Error(`Packed archive member is not a regular file: ${path}`);
        }
        const source = realpathSync(unresolvedSource);
        if (source !== canonicalRoot && !source.startsWith(`${canonicalRoot}${sep}`)) {
            throw new Error(`Packed archive member resolves outside the package root: ${path}`);
        }
        const content = readFileSync(source);
        if (containsDeveloperPath(content.toString('utf8'))) {
            throw new Error(`Packed text contains an absolute developer path: ${path}`);
        }
        if (MODEL_MANIFEST_FILE.test(path)) {
            await assertPublishedModelManifest(packageRoot, path, content);
        }
    }
}

function containsDeveloperPath(content) {
    if (UNIX_DEVELOPER_PATH.test(content) || UNC_DEVELOPER_PATH.test(content)) {
        return true;
    }
    return WINDOWS_DEVELOPER_PATH.test(content.replace(/\\+/gu, '/'));
}

function assertOperationalDocumentation(packageRoot, files, profile) {
    if (profile !== 'core') {
        return;
    }
    const publishedFiles = new Set(files);
    for (const path of CORE_DOCUMENTATION) {
        if (!publishedFiles.has(path)) {
            throw new Error(`Packed core package is missing required documentation: ${path}`);
        }
    }

    for (const path of files.filter((candidate) => candidate.toLowerCase().endsWith('.md'))) {
        const sourcePath = join(packageRoot, path);
        const content = readFileSync(sourcePath, 'utf8');
        const relativeLinks = [...content.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)]
            .map((match) => match[1])
            .filter(Boolean)
            .filter((target) => !target.startsWith('#') && !target.startsWith('//'))
            .filter((target) => !/^[a-z][a-z\d+.-]*:/iu.test(target))
            .map((target) => target.split('#', 1)[0]);
        for (const target of relativeLinks) {
            const resolvedTarget = resolve(dirname(sourcePath), target);
            const packageRelativeTarget = relative(packageRoot, resolvedTarget);
            if (
                isAbsolute(packageRelativeTarget) ||
                packageRelativeTarget === '..' ||
                packageRelativeTarget.startsWith(`..${sep}`) ||
                !existsSync(resolvedTarget) ||
                !lstatSync(resolvedTarget).isFile()
            ) {
                throw new Error(`Broken relative Markdown link in packed package: ${path} -> ${target}`);
            }
        }
    }
}

function assertReleaseModelManifest(packageRoot, files, profile) {
    if (profile !== 'core') {
        return;
    }
    const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
    if (packageJson.version !== '0.0.0' && !files.includes('resources/model-manifest.json')) {
        throw new Error('A publishable generator package is missing its release model manifest');
    }
}

function extractPackedPackage(archivePath, temporaryDirectory, reportedFiles) {
    const entries = listArchiveLines(archivePath, '-tzf');
    const verboseEntries = listArchiveLines(archivePath, '-tvzf');
    if (entries.length !== verboseEntries.length) {
        throw new Error('Could not reconcile packed archive member types');
    }
    const archiveFiles = entries.map((entry, index) => {
        const normalized = entry.replaceAll('\\', '/').replace(/\/$/u, '');
        const parts = normalized.split('/');
        if (
            normalized.startsWith('/') ||
            /^[A-Za-z]:/u.test(normalized) ||
            parts[0] !== 'package' ||
            parts.some((part) => part === '' || part === '.' || part === '..')
        ) {
            throw new Error(`Unsafe packed archive entry: ${entry}`);
        }
        if (!verboseEntries[index].startsWith('-')) {
            throw new Error(`Packed archive member is not a regular file: ${entry}`);
        }
        return parts.slice(1).join('/');
    });
    if (
        new Set(archiveFiles).size !== archiveFiles.length ||
        JSON.stringify([...archiveFiles].sort()) !== JSON.stringify([...reportedFiles].sort())
    ) {
        throw new Error('pnpm pack report does not match the packed archive members');
    }
    const extractionRoot = join(temporaryDirectory, 'extracted');
    mkdirSync(extractionRoot);
    execFileSync('tar', ['-xzf', archivePath, '-C', extractionRoot], { stdio: ['ignore', 'pipe', 'pipe'] });
    return join(extractionRoot, 'package');
}

function listArchiveLines(archivePath, mode) {
    return execFileSync('tar', [mode, archivePath], { encoding: 'utf8' }).split('\n').filter(Boolean);
}

async function assertPublishedModelManifest(packageRoot, path, content) {
    let manifest;
    try {
        manifest = JSON.parse(content.toString('utf8'));
    } catch {
        throw new Error(`Published model manifest is not valid JSON: ${path}`);
    }
    let parsedManifest;
    try {
        const validatorPath = pathToFileURL(join(packageRoot, 'dist', 'model', 'manifest.js')).href;
        const validator = await import(validatorPath);
        if (typeof validator.parseModelManifest !== 'function') {
            throw new TypeError('packed runtime does not export parseModelManifest');
        }
        parsedManifest = validator.parseModelManifest(manifest);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Published model manifest fails runtime validation: ${message}: ${path}`);
    }
    if (parsedManifest.formatVersion !== 2) {
        throw new Error(`Published model manifest has no platform runtime: ${path}`);
    }
    const runtimeTargets = new Set(
        parsedManifest.runtimes.map((runtime) => `${runtime.platform}-${runtime.architecture}`)
    );
    if (
        runtimeTargets.size !== REQUIRED_RUNTIME_TARGETS.size ||
        [...REQUIRED_RUNTIME_TARGETS].some((target) => !runtimeTargets.has(target))
    ) {
        throw new Error(
            `Published model manifest must provide exactly these platform runtimes: ${[
                ...REQUIRED_RUNTIME_TARGETS
            ].join(', ')}: ${path}`
        );
    }
}

function assertNetworkFreePublicConstruction(packageRoot, installedPackageRoot, profile) {
    const installedNodeModules = join(installedPackageRoot, 'node_modules');
    try {
        const sourceNodeModules = realpathSync(join(packageRoot, 'node_modules'));
        symlinkSync(sourceNodeModules, installedNodeModules, 'junction');
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            throw error;
        }
    }
    const publicEntry = pathToFileURL(join(installedPackageRoot, 'dist', 'index.js')).href;
    const commonJsEntry =
        profile === 'cap'
            ? join(installedPackageRoot, 'cds-plugin.js')
            : join(installedPackageRoot, 'dist', 'fe-mockserver.cjs');
    const publicConstruction =
        profile === 'cap'
            ? `require(${JSON.stringify(commonJsEntry)});`
            : `const Provider = require(${JSON.stringify(commonJsEntry)}); new Provider();`;
    const probe = `
        import dgram from 'node:dgram';
        import dns from 'node:dns';
        import dnsPromises from 'node:dns/promises';
        import http from 'node:http';
        import http2 from 'node:http2';
        import https from 'node:https';
        import net from 'node:net';
        import tls from 'node:tls';
        import { createRequire, syncBuiltinESMExports } from 'node:module';

        const blocked = () => { throw new Error('NETWORK_ACCESS_DURING_PUBLIC_CONSTRUCTION'); };
        globalThis.fetch = blocked;
        if ('WebSocket' in globalThis) globalThis.WebSocket = class BlockedWebSocket { constructor() { blocked(); } };
        dgram.createSocket = blocked;
        dns.lookup = blocked;
        dns.resolve = blocked;
        for (const method of Object.keys(dnsPromises)) {
            if (typeof dnsPromises[method] === 'function') dnsPromises[method] = blocked;
        }
        http.get = blocked;
        http.request = blocked;
        http.Agent.prototype.createConnection = blocked;
        http2.connect = blocked;
        https.get = blocked;
        https.request = blocked;
        https.Agent.prototype.createConnection = blocked;
        net.connect = blocked;
        net.createConnection = blocked;
        net.Socket.prototype.connect = blocked;
        tls.connect = blocked;
        syncBuiltinESMExports();

        await import(${JSON.stringify(publicEntry)});
        const require = createRequire(import.meta.url);
        ${publicConstruction}
    `;
    execFileSync(process.execPath, ['--input-type=module', '--eval', probe], {
        cwd: installedPackageRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5_000
    });
}

function packPackage(temporaryDirectory) {
    const packageManager = process.env.npm_execpath;
    if (!packageManager) {
        throw new Error('No package-manager executable was inherited; run this check through pnpm check:package');
    }
    return execFileSync(
        process.execPath,
        [packageManager, 'pack', '--pack-destination', temporaryDirectory, '--json'],
        {
            cwd: process.cwd(),
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        }
    );
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'mockserver-data-generator-package-'));
try {
    const profile = packageProfile(process.argv.slice(2));
    const output = packPackage(temporaryDirectory);
    const report = JSON.parse(output);
    const files = packedFiles(report);
    const packedRoot = extractPackedPackage(report.filename, temporaryDirectory, files);
    await assertPackageBoundary(packedRoot, files);
    const bytes = statSync(report.filename).size;
    if (bytes > MAXIMUM_PACKED_BYTES) {
        throw new Error(`Packed tarball is ${bytes} bytes and exceeds the 5 MiB ceiling`);
    }
    assertNetworkFreePublicConstruction(process.cwd(), packedRoot, profile);
    assertOperationalDocumentation(packedRoot, files, profile);
    assertReleaseModelManifest(packedRoot, files, profile);
    process.stdout.write(
        `${JSON.stringify({
            packageName: report.name,
            maximumBytes: MAXIMUM_PACKED_BYTES,
            files: files.length,
            bytes,
            networkFree: true,
            profile
        })}\n`
    );
} finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
}
