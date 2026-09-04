import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    copyFileSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    utimesSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, posix, relative, resolve, win32 } from 'node:path';

const SHA256_PATTERN = /^[a-f\d]{64}$/u;
const MODEL_ARTIFACT_PATTERN = /\.(?:onnx|safetensors|pt|pth|ckpt)$/iu;
const REPRODUCIBLE_ARCHIVE_TIME = new Date('2000-01-01T00:00:00.000Z');

/**
 * Calculate a file SHA-256 digest.
 *
 * @param {string} filePath file to hash
 * @returns {string} lowercase hexadecimal digest
 */
export function sha256File(filePath) {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * Verify one file against an expected SHA-256 digest.
 *
 * @param {string} filePath file to verify
 * @param {string} expected expected lowercase hexadecimal digest
 */
export function verifyFileChecksum(filePath, expected) {
    if (!SHA256_PATTERN.test(expected) || sha256File(filePath) !== expected) {
        throw new Error(`Checksum mismatch for ${filePath}`);
    }
}

/**
 * Reject paths or tar metadata that could escape or alias archive contents.
 *
 * @param {string} entry archive entry name
 * @param {string} [verboseLine] optional verbose tar listing line
 */
export function assertSafeArchiveEntry(entry, verboseLine = '') {
    const normalized = entry.replaceAll('\\', '/');
    const parts = normalized.split('/');
    if (
        !entry ||
        entry.includes('\0') ||
        isAbsolute(entry) ||
        win32.isAbsolute(entry) ||
        normalized.startsWith('/') ||
        parts.includes('..') ||
        posix.normalize(normalized).startsWith('../')
    ) {
        throw new Error(`Unsafe archive entry: ${entry}`);
    }
    const mode = verboseLine.trimStart().slice(0, 10);
    if (/\s(?:->|link to)\s/iu.test(verboseLine) || (mode && !['-', 'd'].includes(mode[0]))) {
        throw new Error(`Archive link or special entry is not allowed: ${entry}`);
    }
    if (/[sS]/u.test(mode)) {
        throw new Error(`Unsafe archive mode for entry: ${entry}`);
    }
}

function collectExportTargets(value, targets = []) {
    if (typeof value === 'string') {
        targets.push(value);
    } else if (value && typeof value === 'object') {
        for (const nested of Object.values(value)) {
            collectExportTargets(nested, targets);
        }
    }
    return targets;
}

function inspectArchiveEntries(archivePath) {
    const archiveInfo = lstatSync(archivePath);
    if (archiveInfo.isSymbolicLink() || !archiveInfo.isFile()) {
        throw new Error(`Packed artifact is not a regular file: ${archivePath}`);
    }
    const entries = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' })
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean);
    const verboseEntries = execFileSync('tar', ['-tvzf', archivePath], { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    for (let index = 0; index < entries.length; index += 1) {
        assertSafeArchiveEntry(entries[index], verboseEntries[index] ?? '');
        if (MODEL_ARTIFACT_PATTERN.test(entries[index])) {
            throw new Error(`Packed npm artifact contains model weights: ${entries[index]}`);
        }
    }
    return entries;
}

function normalizedManifest(packageJson) {
    const normalized = { ...packageJson };
    for (const field of [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
        'peerDependencies',
        'peerDependenciesMeta'
    ]) {
        const value = normalized[field];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            normalized[field] = Object.fromEntries(
                Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
            );
        }
    }
    return normalized;
}

/**
 * Canonicalize order-insensitive dependency maps in a validated package tarball and repack it.
 * Conditional export maps are deliberately left untouched because their key order is semantic.
 *
 * @param {string} archivePath package tarball to replace with its normalized form
 * @param {{command: string, prefix: string[]}} manager pinned package-manager invocation
 */
export function normalizePackedArtifact(archivePath, manager) {
    const entries = inspectArchiveEntries(archivePath);
    if (!entries.includes('package/package.json')) {
        throw new Error('Packed artifact is missing package/package.json');
    }
    if (!manager || typeof manager.command !== 'string' || !Array.isArray(manager.prefix)) {
        throw new TypeError('A pinned package-manager invocation is required');
    }

    const temporaryRoot = mkdtempSync(join(tmpdir(), 'mockgen-normalize-package-'));
    try {
        const extractedRoot = join(temporaryRoot, 'extracted');
        const packedRoot = join(temporaryRoot, 'packed');
        mkdirSync(extractedRoot);
        mkdirSync(packedRoot);
        execFileSync('tar', ['-xzf', archivePath, '-C', extractedRoot], { stdio: ['ignore', 'pipe', 'pipe'] });

        const packageRoot = join(extractedRoot, 'package');
        const manifestPath = join(packageRoot, 'package.json');
        const packageInfo = lstatSync(packageRoot);
        const manifestInfo = lstatSync(manifestPath);
        if (
            packageInfo.isSymbolicLink() ||
            !packageInfo.isDirectory() ||
            manifestInfo.isSymbolicLink() ||
            !manifestInfo.isFile()
        ) {
            throw new Error('Packed artifact has an invalid package root or manifest');
        }

        const packageJson = JSON.parse(readFileSync(manifestPath, 'utf8'));
        writeFileSync(manifestPath, `${JSON.stringify(normalizedManifest(packageJson), null, 2)}\n`);
        const output = execFileSync(
            manager.command,
            [...manager.prefix, 'pack', '--pack-destination', packedRoot, '--json'],
            {
                cwd: packageRoot,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
                env: { ...process.env, npm_config_ignore_scripts: 'true' }
            }
        );
        const packed = JSON.parse(output);
        const filename = Array.isArray(packed) ? packed[0]?.filename : packed.filename;
        const normalizedPath = resolve(packageRoot, String(filename ?? ''));
        const normalizedRelativePath = relative(packedRoot, normalizedPath);
        const normalizedInfo = lstatSync(normalizedPath);
        if (
            !filename ||
            normalizedRelativePath.startsWith('..') ||
            isAbsolute(normalizedRelativePath) ||
            normalizedInfo.isSymbolicLink() ||
            !normalizedInfo.isFile()
        ) {
            throw new Error('Package manager produced an unsafe normalized artifact path');
        }
        copyFileSync(normalizedPath, archivePath);
    } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
    }
}

function normalizeTreeTimestamps(itemPath) {
    const info = lstatSync(itemPath);
    if (info.isSymbolicLink()) {
        throw new Error(`Archive source contains a symbolic link: ${itemPath}`);
    }
    if (info.isDirectory()) {
        for (const name of readdirSync(itemPath).sort()) {
            normalizeTreeTimestamps(join(itemPath, name));
        }
    } else if (!info.isFile()) {
        throw new Error(`Archive source contains a special entry: ${itemPath}`);
    }
    utimesSync(itemPath, REPRODUCIBLE_ARCHIVE_TIME, REPRODUCIBLE_ARCHIVE_TIME);
}

/**
 * Create a gzip-compressed ustar archive after removing build-time timestamp variance.
 * The source is a disposable staging tree and is intentionally normalized in place.
 *
 * @param {string} sourceRoot absolute staging directory
 * @param {string} entryName contained entry to archive
 * @param {string} archivePath destination archive path
 */
export function createDeterministicArchive(sourceRoot, entryName, archivePath) {
    assertSafeArchiveEntry(entryName);
    const entryPath = resolve(sourceRoot, entryName);
    const entryRelativePath = relative(sourceRoot, entryPath);
    if (entryRelativePath.startsWith('..') || isAbsolute(entryRelativePath)) {
        throw new Error(`Archive source escapes its staging directory: ${entryName}`);
    }
    normalizeTreeTimestamps(entryPath);
    execFileSync('tar', ['--format=ustar', '-czf', archivePath, '-C', sourceRoot, entryName], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, COPYFILE_DISABLE: '1', COPY_EXTENDED_ATTRIBUTES_DISABLE: '1' }
    });
    const archive = readFileSync(archivePath);
    if (archive.length < 10 || archive[0] !== 0x1f || archive[1] !== 0x8b || archive[2] !== 0x08) {
        throw new Error('Archive writer did not produce a gzip stream');
    }
    archive.fill(0, 4, 8);
    writeFileSync(archivePath, archive);
}

/**
 * Inspect a packed npm artifact without extracting it into a consumer project.
 *
 * @param {string} archivePath path to the npm tarball
 * @param {string} expectedName expected package name
 * @param {string} [expectedVersion] optional expected package version
 * @returns {{packageName: string, version: string, filename: string, bytes: number, sha256: string, entries: string[]}}
 */
export function inspectPackedArtifact(archivePath, expectedName, expectedVersion) {
    const entries = inspectArchiveEntries(archivePath);
    if (!entries.includes('package/package.json')) {
        throw new Error('Packed artifact is missing package/package.json');
    }
    const packageJson = JSON.parse(
        execFileSync('tar', ['-xOf', archivePath, 'package/package.json'], { encoding: 'utf8' })
    );
    if (packageJson.name !== expectedName) {
        throw new Error(`Package name mismatch: expected ${expectedName}, received ${String(packageJson.name)}`);
    }
    if (expectedVersion !== undefined && packageJson.version !== expectedVersion) {
        throw new Error(
            `Package version mismatch for ${expectedName}: expected ${expectedVersion}, received ${String(packageJson.version)}`
        );
    }
    const targets = [
        packageJson.main,
        packageJson.types,
        packageJson.typings,
        ...collectExportTargets(packageJson.bin),
        ...collectExportTargets(packageJson.exports)
    ]
        .filter((target) => typeof target === 'string' && /^(?:\.\/)?dist\//u.test(target))
        .map((target) => `package/${target.replace(/^\.\//u, '')}`);
    if (targets.length === 0 || targets.some((target) => !entries.includes(target))) {
        throw new Error(`Packed artifact for ${expectedName} is missing required build output`);
    }
    return {
        packageName: packageJson.name,
        version: packageJson.version,
        filename: archivePath.split(/[\\/]/u).at(-1),
        bytes: statSync(archivePath).size,
        sha256: sha256File(archivePath),
        entries
    };
}
