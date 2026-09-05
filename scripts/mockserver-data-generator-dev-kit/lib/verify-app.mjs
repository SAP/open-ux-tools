import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

function unquote(value) {
    const trimmed = value.trim();
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

function packageRoot(appRoot, packageName) {
    return join(appRoot, 'node_modules', ...packageName.split('/'));
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

function packageEntryTargets(packageJson) {
    const targets = [
        packageJson.main,
        packageJson.types,
        packageJson.typings,
        ...collectExportTargets(packageJson.exports)
    ].filter((entry) => typeof entry === 'string');
    return targets.length > 0 ? [...new Set(targets)] : ['dist/index.js'];
}

/**
 * Verify the installed local package set and standard mockserver configuration.
 *
 * @param {string} appRoot application root
 * @param {Array<{packageName: string, version: string, specification: string}>} expectedPackages expected local packages
 * @returns {{installed: true, middlewareCount: number, providerName: string}} verification report
 */
export function verifyInstalledApplication(appRoot, expectedPackages) {
    const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8'));
    if (packageJson.scripts?.['start-mockgen'] !== undefined || existsSync(join(appRoot, 'ui5-mockgen.yaml'))) {
        throw new Error('MockGen must use the existing start-mock and ui5-mock.yaml flow');
    }
    if (!String(packageJson.scripts?.['start-mock'] ?? '').includes('ui5-mock.yaml')) {
        throw new Error('start-mock does not target ui5-mock.yaml');
    }
    if (packageJson.ui5?.dependencies?.includes('@sap-ux/mockserver-data-generator')) {
        throw new Error('@sap-ux/mockserver-data-generator must not be present in package.json ui5.dependencies');
    }
    for (const expected of expectedPackages) {
        const configured = packageJson.devDependencies?.[expected.packageName];
        if (configured !== expected.specification || !String(configured).startsWith('file:')) {
            throw new Error(`${expected.packageName} does not resolve from the application-local development kit`);
        }
        const root = packageRoot(appRoot, expected.packageName);
        const installedManifestPath = join(root, 'package.json');
        if (!existsSync(installedManifestPath)) {
            throw new Error(`${expected.packageName} is not installed`);
        }
        const installedManifest = JSON.parse(readFileSync(installedManifestPath, 'utf8'));
        if (installedManifest.name !== expected.packageName || installedManifest.version !== expected.version) {
            throw new Error(`${expected.packageName} installed identity or version does not match the kit`);
        }
        if (
            packageEntryTargets(installedManifest).some((entry) => !existsSync(join(root, entry.replace(/^\.\//u, ''))))
        ) {
            throw new Error(`${expected.packageName} is missing a required installed export`);
        }
    }
    const yaml = readFileSync(join(appRoot, 'ui5-mock.yaml'), 'utf8');
    const middlewareCount = yaml.match(/^\s*-\s+name:\s*['"]?sap-fe-mockserver['"]?\s*$/gmu)?.length ?? 0;
    if (middlewareCount !== 1) {
        throw new Error(`Expected exactly one sap-fe-mockserver middleware, received ${middlewareCount}`);
    }
    const providerName = yaml.match(
        /^\s+name:\s*['"]?(@sap-ux\/mockserver-data-generator\/fe-mockserver)['"]?\s*$/mu
    )?.[1];
    if (!providerName) {
        throw new Error('ui5-mock.yaml does not configure the MockGen provider');
    }
    return { installed: true, middlewareCount, providerName };
}

function blockEnd(lines, startIndex, parentIndent, limit = lines.length) {
    const end = lines.findIndex(
        (line, index) =>
            index > startIndex &&
            index < limit &&
            line.trim().length > 0 &&
            (line.match(/^\s*/u)?.[0].length ?? 0) <= parentIndent
    );
    return end < 0 ? limit : end;
}

function disableGeneratedDataCache(lines, middlewareIndex) {
    const middlewareIndent = lines[middlewareIndex].match(/^\s*/u)?.[0].length ?? 0;
    const middlewareEnd = blockEnd(lines, middlewareIndex, middlewareIndent);
    const generatorIndex = lines.findIndex(
        (line, index) =>
            index > middlewareIndex && index < middlewareEnd && /^\s+mockDataGenerator:\s*(?:#.*)?$/u.test(line)
    );
    if (generatorIndex < 0) {
        throw new Error('MockGen provider configuration is unavailable for learned verification');
    }
    const generatorIndent = lines[generatorIndex].match(/^\s*/u)?.[0] ?? '';
    const generatorEnd = blockEnd(lines, generatorIndex, generatorIndent.length, middlewareEnd);
    const optionsIndex = lines.findIndex(
        (line, index) => index > generatorIndex && index < generatorEnd && /^\s+options:\s*(?:#.*)?$/u.test(line)
    );
    if (optionsIndex < 0) {
        lines.splice(
            generatorIndex + 1,
            0,
            `${generatorIndent}  options:`,
            `${generatorIndent}    generatedDataCache: false`
        );
        return;
    }
    const optionsIndent = lines[optionsIndex].match(/^\s*/u)?.[0] ?? '';
    const optionsEnd = blockEnd(lines, optionsIndex, optionsIndent.length, generatorEnd);
    const cacheIndex = lines.findIndex(
        (line, index) =>
            index > optionsIndex && index < optionsEnd && /^\s+generatedDataCache:\s*(?:[^#]*)(?:#.*)?$/u.test(line)
    );
    if (cacheIndex >= 0) {
        lines[cacheIndex] = `${optionsIndent}  generatedDataCache: false`;
    } else {
        lines.splice(optionsIndex + 1, 0, `${optionsIndent}  generatedDataCache: false`);
    }
}

function configureGeneratedDataCacheDirectory(lines, middlewareIndex, directory) {
    const middlewareIndent = lines[middlewareIndex].match(/^\s*/u)?.[0].length ?? 0;
    const middlewareEnd = blockEnd(lines, middlewareIndex, middlewareIndent);
    const generatorIndex = lines.findIndex(
        (line, index) =>
            index > middlewareIndex && index < middlewareEnd && /^\s+mockDataGenerator:\s*(?:#.*)?$/u.test(line)
    );
    if (generatorIndex < 0) {
        throw new Error('MockGen provider configuration is unavailable for performance verification');
    }
    const generatorIndent = lines[generatorIndex].match(/^\s*/u)?.[0] ?? '';
    let generatorEnd = blockEnd(lines, generatorIndex, generatorIndent.length, middlewareEnd);
    let optionsIndex = lines.findIndex(
        (line, index) => index > generatorIndex && index < generatorEnd && /^\s+options:\s*(?:#.*)?$/u.test(line)
    );
    if (optionsIndex < 0) {
        lines.splice(generatorIndex + 1, 0, `${generatorIndent}  options:`);
        optionsIndex = generatorIndex + 1;
        generatorEnd += 1;
    }
    const optionsIndent = lines[optionsIndex].match(/^\s*/u)?.[0] ?? '';
    const upsert = (name, value) => {
        const optionsEnd = blockEnd(lines, optionsIndex, optionsIndent.length, generatorEnd);
        const optionIndex = lines.findIndex(
            (line, index) =>
                index > optionsIndex && index < optionsEnd && new RegExp(`^\\s+${name}:\\s*`, 'u').test(line)
        );
        const rendered = `${optionsIndent}  ${name}: ${value}`;
        if (optionIndex >= 0) {
            lines[optionIndex] = rendered;
        } else {
            lines.splice(optionsIndex + 1, 0, rendered);
            generatorEnd += 1;
        }
    };
    upsert('generatedDataCacheDirectory', JSON.stringify(directory));
    upsert('generatedDataCache', 'true');
}

/**
 * Create an isolated copy of the UI5 configuration with mockserver debug
 * logging enabled. The canary needs this to observe host-side evidence that
 * the provider, rather than the standard fallback, supplied the rows. Keeping
 * the copy outside the application also supports verification of a read-only
 * project checkout.
 *
 * @param {string} appRoot application root
 * @param {{expectedLearned?: boolean, generatedDataCacheDirectory?: string}} [options] canary configuration options
 * @returns {{path: string, cleanup: () => void}} temporary configuration
 */
export function createCanaryConfiguration(appRoot, options = {}) {
    const sourcePath = join(appRoot, 'ui5-mock.yaml');
    const lines = readFileSync(sourcePath, 'utf8').split(/\r?\n/u);
    const middlewareIndex = lines.findIndex((line) => /^\s*-\s+name:\s*['"]?sap-fe-mockserver['"]?\s*$/u.test(line));
    if (middlewareIndex < 0) {
        throw new Error('No sap-fe-mockserver middleware is available for verification');
    }
    const middlewareIndent = lines[middlewareIndex].match(/^\s*/u)?.[0].length ?? 0;
    const middlewareEnd = lines.findIndex(
        (line, index) =>
            index > middlewareIndex &&
            line.trim().length > 0 &&
            (line.match(/^\s*/u)?.[0].length ?? 0) <= middlewareIndent
    );
    const searchEnd = middlewareEnd < 0 ? lines.length : middlewareEnd;
    const configurationIndex = lines.findIndex(
        (line, index) => index > middlewareIndex && index < searchEnd && /^\s+configuration:\s*(?:#.*)?$/u.test(line)
    );
    if (configurationIndex < 0) {
        throw new Error('sap-fe-mockserver configuration is invalid');
    }
    const configurationIndent = lines[configurationIndex].match(/^\s*/u)?.[0] ?? '';
    const childIndent = `${configurationIndent}  `;
    const configurationEnd = lines.findIndex(
        (line, index) =>
            index > configurationIndex &&
            line.trim().length > 0 &&
            (line.match(/^\s*/u)?.[0].length ?? 0) <= configurationIndent.length
    );
    const debugIndex = lines.findIndex(
        (line, index) =>
            index > configurationIndex &&
            (configurationEnd < 0 || index < configurationEnd) &&
            new RegExp(`^${childIndent}debug:`, 'u').test(line)
    );
    if (debugIndex >= 0) {
        lines[debugIndex] = `${childIndent}debug: true`;
    } else {
        lines.splice(configurationIndex + 1, 0, `${childIndent}debug: true`);
    }
    if (options.generatedDataCacheDirectory) {
        configureGeneratedDataCacheDirectory(lines, middlewareIndex, options.generatedDataCacheDirectory);
    } else if (options.expectedLearned) {
        disableGeneratedDataCache(lines, middlewareIndex);
    }
    const directory = mkdtempSync(join(tmpdir(), 'mockserver-data-generator-canary-'));
    const path = join(directory, `${randomUUID()}.yaml`);
    writeFileSync(path, `${lines.join('\n').replace(/\n+$/u, '')}\n`, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600
    });
    return {
        path,
        cleanup: () => rmSync(directory, { recursive: true, force: true })
    };
}

/**
 * Discover the first configured service and entity set used by the HTTP canary.
 *
 * @param {string} appRoot application root
 * @returns {{servicePath: string, metadataPath: string, entitySet: string}}
 */
export function discoverCanaryTarget(appRoot) {
    const yaml = readFileSync(join(appRoot, 'ui5-mock.yaml'), 'utf8');
    const servicePath = yaml.match(/^\s*-\s+urlPath:\s*(.+?)\s*$/mu)?.[1];
    const metadataValue = yaml.match(/^\s+metadataPath:\s*(.+?)\s*$/mu)?.[1];
    if (!servicePath || !metadataValue) {
        throw new Error('No mockserver service is available for verification');
    }
    const metadataPath = resolve(appRoot, unquote(metadataValue));
    if (!existsSync(metadataPath)) {
        throw new Error(`Mockserver metadata file does not exist: ${metadataPath}`);
    }
    const metadata = readFileSync(metadataPath, 'utf8');
    const entitySet =
        metadata.match(/<EntitySet\s+[^>]*Name=["']([^"']+)["']/u)?.[1] ??
        metadata.match(/\bentity\s+([A-Za-z_]\w*)\b/u)?.[1];
    if (!entitySet) {
        throw new Error('No entity set is available for verification');
    }
    return { servicePath: unquote(servicePath).replace(/\/$/u, ''), metadataPath, entitySet };
}

function freePort() {
    return new Promise((resolvePort, reject) => {
        const server = createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : undefined;
            server.close((error) => (error ? reject(error) : resolvePort(port)));
        });
    });
}

async function waitForResponse(url, timeoutMs, processState) {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
        if (processState.exit !== undefined) {
            throw new Error(`Fiori mockserver exited before verification with ${processState.exit}`);
        }
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
            if (response.ok) {
                return response;
            }
            lastError = new Error(`${url} returned HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        await delay(200);
    }
    throw new Error(
        `Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
}

function stopProcess(child) {
    if (child.exitCode !== null || child.pid === undefined) {
        return;
    }
    try {
        if (process.platform === 'win32') {
            child.kill('SIGTERM');
        } else {
            process.kill(-child.pid, 'SIGTERM');
        }
    } catch {
        child.kill('SIGTERM');
    }
}

/**
 * Verify host-side evidence that the configured provider supplied the rows and,
 * when requested, that both learned components were ready.
 *
 * @param {string} output captured mockserver process output
 * @param {string} entitySet canary entity set
 * @param {boolean} [expectedLearned] whether learned runtime evidence is required
 * @returns {{providerExecuted: true, learnedRuntimeVerified?: true}} process evidence report
 */
export function verifyCanaryProcessEvidence(output, entitySet, expectedLearned = false) {
    const providerEvidence = `Provider mockdata found for ${entitySet}`;
    if (!output.includes(providerEvidence)) {
        throw new Error(
            'MockGen provider did not publish the canary rows; standard fallback may have served the response'
        );
    }
    if (expectedLearned) {
        const learnedEvidence = 'MOCK_DATA_GENERATOR_CAPABILITIES: mode=hybrid classifier=ready sft=ready';
        if (!output.includes(learnedEvidence)) {
            throw new Error('MockGen classifier and SFT runtime were not both ready for the learned canary');
        }
        return { providerExecuted: true, learnedRuntimeVerified: true };
    }
    return { providerExecuted: true };
}

/**
 * Extract monotonic provider timings emitted by the exact installed generator
 * and host. A phase is accepted only once so concatenated or stale process
 * output cannot be mistaken for one canary observation.
 *
 * @param {string} output captured mockserver process output
 * @param {{expectedCacheHit?: boolean}} [options] timing evidence requirements
 * @returns {{runtimeInitializationMs?: number, wholeServiceGenerationMs?: number, generatedDataCacheHitMs?: number, hostProviderMs?: number}}
 */
export function extractCanaryTimings(output, options = {}) {
    const phaseNames = new Map([
        ['runtime-initialization', 'runtimeInitializationMs'],
        ['whole-service', 'wholeServiceGenerationMs'],
        ['generated-data-cache-hit', 'generatedDataCacheHitMs']
    ]);
    const result = {};
    for (const [phase, property] of phaseNames) {
        const matches = [
            ...output.matchAll(
                new RegExp(`MOCK_DATA_GENERATOR_TIMING: phase=${phase} durationMs=(\\d+(?:\\.\\d+)?)\\s*$`, 'gmu')
            )
        ];
        if (matches.length > 1) {
            throw new Error(`Canary output must contain at most one unique timing for ${phase}`);
        }
        if (matches.length === 1) {
            result[property] = Number(matches[0][1]);
        }
    }
    const hostMatches = [
        ...output.matchAll(/mock-data-generator:complete service=\S+ durationMs=(\d+(?:\.\d+)?)\s*$/gmu)
    ];
    if (hostMatches.length > 1) {
        throw new Error('Canary output must contain at most one unique timing for the host provider');
    }
    if (hostMatches.length === 1) {
        result.hostProviderMs = Number(hostMatches[0][1]);
    }
    if (options.expectedCacheHit) {
        if (result.generatedDataCacheHitMs === undefined || !output.includes('GENERATED_DATA_CACHE_HIT:')) {
            throw new Error('Canary output has no verified generated-data cache-hit timing');
        }
        if (result.runtimeInitializationMs !== undefined) {
            throw new Error('Generated-data cache-hit canary initialized a learned model runtime');
        }
    }
    return result;
}

/**
 * Start the application-local Fiori/UI5 command headlessly and exercise metadata and entity endpoints.
 *
 * @param {string} appRoot application root
 * @param {{timeoutMs?: number, expectedLearned?: boolean, expectedCacheHit?: boolean, generatedDataCacheDirectory?: string}} [options] canary options
 * @returns {Promise<{integrationVerified: true, providerExecuted: true, learnedRuntimeVerified?: true, runtimeInitializationMs?: number, wholeServiceGenerationMs?: number, generatedDataCacheHitMs?: number, hostProviderMs?: number, port: number, metadataUrl: string, entityUrl: string, entitySet: string, rows: number}>} HTTP canary report
 */
export async function runFioriCanary(appRoot, options = {}) {
    const target = discoverCanaryTarget(appRoot);
    const fiori = join(appRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'fiori.cmd' : 'fiori');
    const ui5 = join(appRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'ui5.cmd' : 'ui5');
    const executable = existsSync(fiori) ? fiori : existsSync(ui5) ? ui5 : undefined;
    if (!executable) {
        throw new Error('Application-local fiori or ui5 executable is not installed');
    }
    const canaryConfiguration = createCanaryConfiguration(appRoot, options);
    const port = await freePort();
    const args = executable === fiori ? ['run'] : ['serve'];
    args.push('--config', canaryConfiguration.path, '--port', String(port));
    const child = spawn(executable, args, {
        cwd: appRoot,
        env: { ...process.env, BROWSER: 'none' },
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
    });
    const processState = { exit: undefined, output: '' };
    child.stdout?.on('data', (chunk) => {
        processState.output = `${processState.output}${String(chunk)}`.slice(-20_000);
    });
    child.stderr?.on('data', (chunk) => {
        processState.output = `${processState.output}${String(chunk)}`.slice(-20_000);
    });
    child.once('exit', (code, signal) => {
        processState.exit = signal ? `signal ${signal}` : `exit code ${String(code)}`;
    });
    try {
        const origin = `http://127.0.0.1:${String(port)}`;
        const metadataUrl = `${origin}${target.servicePath}/$metadata`;
        const metadataResponse = await waitForResponse(metadataUrl, options.timeoutMs ?? 30_000, processState);
        await metadataResponse.arrayBuffer();
        const entityUrl = `${origin}${target.servicePath}/${encodeURIComponent(target.entitySet)}?$top=1`;
        const entityResponse = await waitForResponse(entityUrl, options.timeoutMs ?? 30_000, processState);
        const payload = await entityResponse.json();
        const rows = Array.isArray(payload?.value) ? payload.value : payload?.d?.results;
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error('MockGen canary entity response contained no rows');
        }
        const processEvidence = verifyCanaryProcessEvidence(
            processState.output,
            target.entitySet,
            options.expectedLearned
        );
        const timings = extractCanaryTimings(processState.output, { expectedCacheHit: options.expectedCacheHit });
        return {
            integrationVerified: true,
            ...processEvidence,
            ...timings,
            port,
            metadataUrl,
            entityUrl,
            entitySet: target.entitySet,
            rows: rows.length
        };
    } catch (error) {
        const detail = processState.output.trim();
        throw new Error(`${error instanceof Error ? error.message : String(error)}${detail ? `\n${detail}` : ''}`);
    } finally {
        stopProcess(child);
        canaryConfiguration.cleanup();
    }
}
