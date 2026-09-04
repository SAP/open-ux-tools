import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, posix, win32 } from 'node:path';

const SHA256_PATTERN = /^[a-f\d]{64}$/u;
const MODEL_ARTIFACT_PATTERN = /\.(?:onnx|safetensors|pt|pth|ckpt)$/iu;

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

/**
 * Inspect a packed npm artifact without extracting it into a consumer project.
 *
 * @param {string} archivePath path to the npm tarball
 * @param {string} expectedName expected package name
 * @param {string} [expectedVersion] optional expected package version
 * @returns {{packageName: string, version: string, filename: string, bytes: number, sha256: string, entries: string[]}}
 */
export function inspectPackedArtifact(archivePath, expectedName, expectedVersion) {
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
