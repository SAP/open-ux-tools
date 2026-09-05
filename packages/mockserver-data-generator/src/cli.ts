#!/usr/bin/env node

import { lstat, readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareModelCache, type PrepareModelCacheOptions } from './model/downloader.js';
import { parseModelManifest, type ModelManifest } from './model/manifest.js';
import { defaultModelCacheRoot, verifyModelCache, type VerifiedModelCache } from './model/model-cache.js';
import { executeStartCommand } from './start.js';

type ModelCommand = 'prepare' | 'verify';

interface ParsedModelCommand {
    command: ModelCommand;
    manifestPath: string;
    cacheRoot: string;
    mirrorBaseUrl?: string;
    acquisitionTimeoutMs?: number;
}

interface ModelCommandDependencies {
    prepare?: (
        cacheRoot: string,
        manifest: ModelManifest,
        options?: PrepareModelCacheOptions
    ) => Promise<VerifiedModelCache>;
    verify?: (cacheRoot: string, manifest: ModelManifest) => Promise<VerifiedModelCache>;
    defaultCacheRoot?: () => string;
}

interface ModelComponentReport {
    id: string;
    kind: 'classifier' | 'sft';
    version: string;
    fingerprint: string;
    ready: boolean;
    failures: ReadonlyArray<{ role: string; reason: string }>;
}

export interface ModelCommandReport {
    command: ModelCommand;
    status: 'ready' | 'incomplete';
    bundleId: string;
    revision: string;
    lifecycle: 'development' | 'preview' | 'stable';
    expectedBytes: number;
    components: ReadonlyArray<ModelComponentReport>;
}

export interface ModelCommandResult {
    exitCode: 0 | 1;
    report: ModelCommandReport;
}

const PREPARE_TIMEOUT_MAXIMUM_MS = 30 * 60 * 1_000;

function usage(): string {
    return [
        'Start the existing Fiori mockserver command; append --mockgen to enable MockGen:',
        '  mockserver-data-generator start -- fiori run --config ./ui5-mock.yaml [fiori-options] [--mockgen]',
        '',
        'Prepare immutable MockGen model artifacts for later local/offline use:',
        '  mockserver-data-generator prepare --manifest <manifest.json> [--cache <directory>] \\',
        '    [--mirror <https-base-url>] [--timeout-ms <milliseconds>]',
        '',
        'Verify an existing model cache without network access:',
        '  mockserver-data-generator verify --manifest <manifest.json> [--cache <directory>]'
    ].join('\n');
}

function optionValues(argv: ReadonlyArray<string>, allowed: ReadonlySet<string>): ReadonlyMap<string, string> {
    const values = new Map<string, string>();
    for (let index = 1; index < argv.length; index += 1) {
        const name = argv[index];
        if (!name.startsWith('--') || !allowed.has(name)) {
            throw new TypeError(`Unknown option ${name}`);
        }
        if (values.has(name)) {
            throw new TypeError(`Option ${name} may be specified only once`);
        }
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) {
            throw new TypeError(`Option ${name} requires a value`);
        }
        values.set(name, value);
        index += 1;
    }
    return values;
}

function positiveTimeout(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > PREPARE_TIMEOUT_MAXIMUM_MS) {
        throw new TypeError(`--timeout-ms must be an integer between 1 and ${PREPARE_TIMEOUT_MAXIMUM_MS}`);
    }
    return parsed;
}

function parseCommand(argv: ReadonlyArray<string>, defaultCacheRootPath: string): ParsedModelCommand {
    const command = argv[0];
    if (command !== 'prepare' && command !== 'verify') {
        throw new TypeError('Choose exactly one model command: prepare or verify');
    }
    const allowed = new Set(['--manifest', '--cache', '--mirror', '--timeout-ms']);
    const options = optionValues(argv, allowed);
    const manifestPath = options.get('--manifest');
    if (!manifestPath) {
        throw new TypeError('--manifest is required');
    }
    const mirrorBaseUrl = options.get('--mirror');
    const acquisitionTimeoutMs = positiveTimeout(options.get('--timeout-ms'));
    if (command === 'verify' && (mirrorBaseUrl !== undefined || acquisitionTimeoutMs !== undefined)) {
        throw new TypeError('--mirror and --timeout-ms are only valid with prepare');
    }
    return Object.freeze({
        command,
        manifestPath: resolve(manifestPath),
        cacheRoot: resolve(options.get('--cache') ?? defaultCacheRootPath),
        ...(mirrorBaseUrl === undefined ? {} : { mirrorBaseUrl }),
        ...(acquisitionTimeoutMs === undefined ? {} : { acquisitionTimeoutMs })
    });
}

async function readManifest(manifestPath: string): Promise<ModelManifest> {
    let source: string;
    try {
        const details = await lstat(manifestPath);
        if (!details.isFile() || details.isSymbolicLink()) {
            throw new TypeError('not a regular file');
        }
        source = await readFile(manifestPath, 'utf8');
    } catch {
        throw new TypeError('Model manifest must be a readable regular non-symbolic-link file');
    }
    let input: unknown;
    try {
        input = JSON.parse(source);
    } catch {
        throw new TypeError('Model manifest must contain valid JSON');
    }
    return parseModelManifest(input);
}

function report(command: ModelCommand, manifest: ModelManifest, cache: VerifiedModelCache): ModelCommandReport {
    const components = manifest.components.map((component) => {
        const failures = cache.failures
            .filter((failure) => failure.componentId === component.id)
            .map(({ role, reason }) => Object.freeze({ role, reason }));
        return Object.freeze({
            id: component.id,
            kind: component.kind,
            version: component.version,
            fingerprint: component.fingerprint,
            ready: cache.files.has(component.id) && failures.length === 0,
            failures: Object.freeze(failures)
        });
    });
    return Object.freeze({
        command,
        status: cache.ready ? 'ready' : 'incomplete',
        bundleId: manifest.bundleId,
        revision: manifest.revision,
        lifecycle: manifest.lifecycle,
        expectedBytes: manifest.components.reduce(
            (total, component) => total + component.files.reduce((sum, file) => sum + file.bytes, 0),
            0
        ),
        components: Object.freeze(components)
    });
}

/**
 * Prepare or verify one immutable model bundle without disclosing cache paths.
 *
 * @param argv command arguments after the executable name
 * @param dependencies injected acquisition and verification functions for tests
 * @returns privacy-safe command result
 */
export async function executeModelCommand(
    argv: ReadonlyArray<string>,
    dependencies: ModelCommandDependencies = {}
): Promise<ModelCommandResult> {
    const parsed = parseCommand(argv, (dependencies.defaultCacheRoot ?? defaultModelCacheRoot)());
    const manifest = await readManifest(parsed.manifestPath);
    const cache =
        parsed.command === 'prepare'
            ? await (dependencies.prepare ?? prepareModelCache)(parsed.cacheRoot, manifest, {
                  ...(parsed.mirrorBaseUrl === undefined ? {} : { mirrorBaseUrl: parsed.mirrorBaseUrl }),
                  ...(parsed.acquisitionTimeoutMs === undefined
                      ? { acquisitionTimeoutMs: PREPARE_TIMEOUT_MAXIMUM_MS }
                      : { acquisitionTimeoutMs: parsed.acquisitionTimeoutMs })
              })
            : await (dependencies.verify ?? verifyModelCache)(parsed.cacheRoot, manifest);
    const commandReport = report(parsed.command, manifest, cache);
    return Object.freeze({ exitCode: commandReport.status === 'ready' ? 0 : 1, report: commandReport });
}

function isMainModule(): boolean {
    if (!process.argv[1]) {
        return false;
    }
    try {
        return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
    } catch {
        return false;
    }
}

if (isMainModule()) {
    const argv = process.argv.slice(2);
    if (argv.includes('--help') || argv.includes('-h')) {
        process.stdout.write(`${usage()}\n`);
    } else if (argv[0] === 'start') {
        executeStartCommand(argv)
            .then((exitCode) => {
                process.exitCode = exitCode;
            })
            .catch((error: unknown) => {
                process.stderr.write(
                    `MockGen start failed: ${error instanceof Error ? error.message : 'unknown error'}\n`
                );
                process.exitCode = 1;
            });
    } else {
        executeModelCommand(argv)
            .then(({ exitCode, report: commandReport }) => {
                process.stdout.write(`${JSON.stringify(commandReport, null, 2)}\n`);
                process.exitCode = exitCode;
            })
            .catch((error: unknown) => {
                process.stderr.write(
                    `MockGen model command failed: ${error instanceof Error ? error.message : 'unknown error'}\n`
                );
                process.exitCode = 1;
            });
    }
}
