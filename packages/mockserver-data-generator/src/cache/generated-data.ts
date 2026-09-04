import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, realpath, rename, unlink, utimes } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import type {
    JsonValue,
    MockDataGeneratorCapabilities,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorFingerprints,
    MockDataGeneratorResult,
    MockDataRow
} from '../types.js';

export const DEFAULT_GENERATED_DATA_CACHE_BYTES = 32 * 1024 * 1024;

interface GeneratedDataCacheEntry {
    formatVersion: 1;
    key: string;
    checksum: string;
    result: MockDataGeneratorResult;
}

export interface GeneratedDataCacheWriteOptions {
    maximumBytes?: number;
}

export interface GeneratedDataCacheReadOptions {
    validate?(result: MockDataGeneratorResult): void;
}

function canonicalJson(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function cacheKey(value: string): string {
    if (!/^[a-f0-9]{64}$/.test(value)) {
        throw new TypeError('generated-data cache key must be a lowercase SHA-256');
    }
    return value;
}

function record(value: unknown, label: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value as Record<string, unknown>;
}

function string(value: unknown, label: string, maximumLength = 1_000): string {
    if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength) {
        throw new TypeError(`${label} must be a bounded non-empty string`);
    }
    return value;
}

function jsonValue(value: unknown, depth = 0): JsonValue {
    if (depth > 12) {
        throw new TypeError('generated-data cache value nesting is too deep');
    }
    if (value === null || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new TypeError('generated-data cache contains a non-finite number');
        }
        return value;
    }
    if (typeof value === 'string') {
        if (value.length > 1_000_000) {
            throw new TypeError('generated-data cache contains an oversized string');
        }
        return value;
    }
    if (Array.isArray(value)) {
        if (value.length > 10_000) {
            throw new TypeError('generated-data cache contains an oversized array');
        }
        return Object.freeze(value.map((entry) => jsonValue(entry, depth + 1)));
    }
    const input = record(value, 'generated-data cache JSON value');
    const entries = Object.entries(input);
    if (entries.length > 1_000) {
        throw new TypeError('generated-data cache contains an oversized object');
    }
    return Object.freeze(Object.fromEntries(entries.map(([name, entry]) => [name, jsonValue(entry, depth + 1)])));
}

function rows(value: unknown, resourceName: string): ReadonlyArray<MockDataRow> {
    if (!Array.isArray(value) || value.length > 1_000) {
        throw new TypeError(`generated-data cache rows for ${resourceName} must be a bounded array`);
    }
    return Object.freeze(
        value.map((entry) => {
            const parsed = jsonValue(entry);
            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new TypeError(`generated-data cache row for ${resourceName} must be an object`);
            }
            return parsed as MockDataRow;
        })
    );
}

function diagnostics(value: unknown): ReadonlyArray<MockDataGeneratorDiagnostic> {
    if (!Array.isArray(value) || value.length > 1_000) {
        throw new TypeError('generated-data cache diagnostics must be a bounded array');
    }
    return Object.freeze(
        value.map((entry) => {
            const input = record(entry, 'generated-data cache diagnostic');
            if (!['info', 'warning', 'error'].includes(String(input.severity))) {
                throw new TypeError('generated-data cache diagnostic severity is invalid');
            }
            return Object.freeze({
                code: string(input.code, 'generated-data cache diagnostic code', 200),
                severity: input.severity as MockDataGeneratorDiagnostic['severity'],
                message: string(input.message, 'generated-data cache diagnostic message', 2_000),
                ...(input.target === undefined
                    ? {}
                    : { target: string(input.target, 'generated-data cache diagnostic target', 1_000) })
            });
        })
    );
}

function capabilities(value: unknown): MockDataGeneratorCapabilities {
    const input = record(value, 'generated-data cache capabilities');
    if (
        !['deterministic', 'semantic', 'hybrid'].includes(String(input.mode)) ||
        !['ready', 'unavailable', 'degraded'].includes(String(input.classifier)) ||
        !['ready', 'unavailable', 'degraded'].includes(String(input.sft))
    ) {
        throw new TypeError('generated-data cache capabilities are invalid');
    }
    return Object.freeze({
        mode: input.mode as MockDataGeneratorCapabilities['mode'],
        classifier: input.classifier as MockDataGeneratorCapabilities['classifier'],
        sft: input.sft as MockDataGeneratorCapabilities['sft']
    });
}

function fingerprints(value: unknown, expectedKey: string): MockDataGeneratorFingerprints {
    const input = record(value, 'generated-data cache fingerprints');
    const request = string(input.request, 'generated-data cache request fingerprint', 200);
    if (request !== expectedKey) {
        throw new TypeError('generated-data cache request fingerprint does not match its key');
    }
    return Object.freeze({
        request,
        ...(input.classifier === undefined
            ? {}
            : { classifier: string(input.classifier, 'generated-data cache classifier fingerprint', 200) }),
        ...(input.sft === undefined ? {} : { sft: string(input.sft, 'generated-data cache SFT fingerprint', 200) })
    });
}

function result(value: unknown, expectedKey: string): MockDataGeneratorResult {
    const input = record(value, 'generated-data cache result');
    const resourceInput = record(input.resources, 'generated-data cache resources');
    if (Object.keys(resourceInput).length > 1_000) {
        throw new TypeError('generated-data cache contains too many resources');
    }
    const resources = Object.freeze(
        Object.fromEntries(
            Object.entries(resourceInput).map(([name, value]) => [
                string(name, 'generated-data cache resource name', 1_000),
                rows(value, name)
            ])
        )
    );
    return Object.freeze({
        resources,
        diagnostics: diagnostics(input.diagnostics),
        capabilities: capabilities(input.capabilities),
        fingerprints: fingerprints(input.fingerprints, expectedKey)
    });
}

async function ensureCacheRoot(cacheRoot: string): Promise<{ directory: string; resolved: string }> {
    const directory = resolve(cacheRoot);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const details = await lstat(directory);
    if (!details.isDirectory() || details.isSymbolicLink()) {
        throw new TypeError('generated-data cache root must be a real directory');
    }
    return { directory, resolved: await realpath(directory) };
}

async function safeEntryPath(cacheRoot: string, key: string): Promise<string> {
    const { directory, resolved } = await ensureCacheRoot(cacheRoot);
    const path = join(directory, `${cacheKey(key)}.json`);
    if (!path.startsWith(`${directory}${sep}`) || !resolved) {
        throw new TypeError('generated-data cache entry resolves outside its cache root');
    }
    return path;
}

async function quarantine(path: string, key: string): Promise<void> {
    try {
        await rename(path, join(dirname(path), `${key}.corrupt-${randomUUID()}.json`));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }
    }
}

async function enforceQuota(cacheRoot: string, maximumBytes: number): Promise<void> {
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1 || maximumBytes > DEFAULT_GENERATED_DATA_CACHE_BYTES) {
        throw new TypeError('generated-data cache quota must be a positive integer of at most 32 MiB');
    }
    const { directory } = await ensureCacheRoot(cacheRoot);
    const candidates = await Promise.all(
        (await readdir(directory, { withFileTypes: true }))
            .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !entry.name.includes('.partial-'))
            .map(async (entry) => {
                const path = join(directory, entry.name);
                const details = await lstat(path);
                return { path, name: entry.name, bytes: details.size, lastUsed: details.mtimeMs };
            })
    );
    candidates.sort((left, right) => left.lastUsed - right.lastUsed || left.name.localeCompare(right.name));
    let total = candidates.reduce((sum, entry) => sum + entry.bytes, 0);
    for (const candidate of candidates) {
        if (total <= maximumBytes) {
            break;
        }
        await unlink(candidate.path);
        total -= candidate.bytes;
    }
}

function parseEntry(value: unknown, expectedKey: string): MockDataGeneratorResult {
    const input = record(value, 'generated-data cache entry');
    if (input.formatVersion !== 1 || input.key !== expectedKey) {
        throw new TypeError('generated-data cache entry identity is invalid');
    }
    const parsedResult = result(input.result, expectedKey);
    if (input.checksum !== sha256(canonicalJson(input.result))) {
        throw new TypeError('generated-data cache entry checksum is invalid');
    }
    return parsedResult;
}

/** Default generated-data cache location within the SAP tools user-data directory. */
export function defaultGeneratedDataCacheRoot(homeDirectory = homedir()): string {
    return join(homeDirectory, '.saptools', 'mockserver-data-generator', 'generated-data');
}

/** Read, validate, freeze, and touch one whole-service cache entry. */
export async function readGeneratedDataCache(
    cacheRoot: string,
    key: string,
    options: GeneratedDataCacheReadOptions = {}
): Promise<MockDataGeneratorResult | undefined> {
    const path = await safeEntryPath(cacheRoot, key);
    try {
        const details = await lstat(path);
        if (!details.isFile() || details.isSymbolicLink() || details.size > DEFAULT_GENERATED_DATA_CACHE_BYTES) {
            throw new TypeError('generated-data cache entry is not a bounded regular file');
        }
        const handle = await open(path, constants.O_RDONLY);
        let source: string;
        try {
            source = await handle.readFile('utf8');
        } finally {
            await handle.close();
        }
        const parsed = parseEntry(JSON.parse(source) as unknown, key);
        options.validate?.(parsed);
        const now = new Date();
        await utimes(path, now, now);
        return parsed;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return undefined;
        }
        await quarantine(path, key);
        return undefined;
    }
}

/** Atomically publish one validated whole-service cache entry. */
export async function writeGeneratedDataCache(
    cacheRoot: string,
    key: string,
    generated: MockDataGeneratorResult,
    options: GeneratedDataCacheWriteOptions = {}
): Promise<void> {
    const path = await safeEntryPath(cacheRoot, key);
    const parsed = result(JSON.parse(JSON.stringify(generated)) as unknown, key);
    const entry: GeneratedDataCacheEntry = {
        formatVersion: 1,
        key,
        checksum: sha256(canonicalJson(parsed)),
        result: parsed
    };
    const source = `${JSON.stringify(entry)}\n`;
    const maximumBytes = options.maximumBytes ?? DEFAULT_GENERATED_DATA_CACHE_BYTES;
    if (Buffer.byteLength(source) > maximumBytes) {
        throw new TypeError('generated-data cache entry exceeds the cache quota');
    }
    const temporaryPath = `${path}.partial-${process.pid}-${randomUUID()}`;
    const handle = await open(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
        await handle.writeFile(source);
        await handle.sync();
    } finally {
        await handle.close();
    }
    try {
        await rename(temporaryPath, path);
    } catch (error) {
        await quarantine(temporaryPath, key);
        throw error;
    }
    await enforceQuota(cacheRoot, maximumBytes);
}
