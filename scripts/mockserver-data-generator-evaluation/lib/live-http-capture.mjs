import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startFinancePreview } from './finance-preview.mjs';

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
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

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseList(value, name) {
    const values = value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    if (values.length === 0) throw new TypeError(`${name} must contain at least one value`);
    return [...new Set(values)];
}

function assertLocalPath(value, name, { service = false } = {}) {
    if (typeof value !== 'string' || value.length === 0 || /(?:^[a-z][a-z\d+.-]*:|^\/\/|[\\#])/iu.test(value)) {
        throw new TypeError(`${name} must be a local path`);
    }
    const path = service ? value : value.split('?')[0];
    if ((!service && path.startsWith('/')) || path.split('/').some((part) => part === '..' || part === '.')) {
        throw new TypeError(`${name} must not escape the configured service path`);
    }
    if (/%(?:2f|2e|5c)/iu.test(value)) throw new TypeError(`${name} contains an encoded path escape`);
    if (service && !value.startsWith('/')) throw new TypeError(`${name} must start with /`);
    return value;
}

export function parseArguments(argv) {
    const values = new Map();
    let includeGeneratedValues = false;
    for (let index = 0; index < argv.length; index += 1) {
        const name = argv[index];
        if (name === '--include-generated-values') {
            if (includeGeneratedValues) throw new TypeError('Duplicate --include-generated-values option');
            includeGeneratedValues = true;
            continue;
        }
        const value = argv[++index];
        if (
            ![
                '--app',
                '--config',
                '--output',
                '--service-path',
                '--resources',
                '--navigations',
                '--options-file'
            ].includes(name) ||
            !value ||
            value.startsWith('--') ||
            values.has(name)
        ) {
            throw new TypeError(`Invalid or duplicate live-http-capture option ${name ?? '<missing>'}`);
        }
        values.set(name, value);
    }
    for (const required of ['--app', '--config', '--output', '--service-path', '--resources']) {
        if (!values.has(required)) throw new TypeError(`live-http-capture requires ${required}`);
    }
    return Object.freeze({
        app: resolve(values.get('--app')),
        config: values.get('--config'),
        output: resolve(values.get('--output')),
        servicePath: assertLocalPath(values.get('--service-path'), '--service-path', { service: true }),
        resources: parseList(values.get('--resources'), '--resources').map((value) =>
            assertLocalPath(value, '--resources')
        ),
        navigations: (values.has('--navigations') ? parseList(values.get('--navigations'), '--navigations') : []).map(
            (value) => assertLocalPath(value, '--navigations')
        ),
        optionsFile: values.has('--options-file') ? resolve(values.get('--options-file')) : undefined,
        includeGeneratedValues
    });
}

function requestPath(servicePath, path) {
    if (path.startsWith('/')) return path;
    return `${servicePath.replace(/\/$/u, '')}/${path}`;
}

async function observeRequest(url, fetchImpl, includeGeneratedValues, kind, timeoutMs) {
    const started = performance.now();
    let response;
    let body = '';
    let failed = false;
    try {
        response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
        body = await response.text();
    } catch (cause) {
        failed = true;
    }
    let parsed;
    try {
        parsed = body.length > 0 ? JSON.parse(body) : undefined;
    } catch {
        parsed = undefined;
    }
    const json = response ? (response.headers.get('content-type') ?? '').includes('json') : false;
    const shapeOk =
        kind === 'metadata'
            ? body.length > 0 &&
              /<(?:[\w.-]+:)?(?:edmx|Edmx|DataServices)\b/iu.test(body) &&
              ((response?.headers.get('content-type') ?? '').includes('xml') || /^\s*</u.test(body))
            : json && isPlainObject(parsed) && (kind === 'collection' ? Array.isArray(parsed.value) : true);
    const observation = {
        responseKind: kind,
        method: 'GET',
        path: new URL(url).pathname.replace(/\([^)]*\)/gu, '(key)'),
        status: response?.status ?? 0,
        durationMs: Math.max(0, Math.round(performance.now() - started)),
        hash: sha256(body),
        checks: {
            reachable: response !== undefined,
            statusOk: response?.status >= 200 && response?.status < 300,
            protocol: response?.status >= 200 && response?.status < 300 && shapeOk,
            collection: kind === 'collection' ? response?.status >= 200 && response?.status < 300 && shapeOk : null,
            navigation: kind === 'navigation' ? response?.status >= 200 && response?.status < 300 && shapeOk : null
        },
        ...(failed ? { error: 'fetch-failed' } : {}),
        ...(includeGeneratedValues ? { generatedValues: body } : {})
    };
    return Object.freeze(observation);
}

export async function buildLiveHttpReport({
    baseUrl,
    servicePath,
    resources,
    navigations = [],
    fetchImpl = fetch,
    includeGeneratedValues = false,
    timeoutMs = 15000
}) {
    if (typeof baseUrl !== 'string' || typeof servicePath !== 'string' || !Array.isArray(resources)) {
        throw new TypeError('Live HTTP report requires baseUrl, servicePath and resources');
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be positive');
    const paths = [
        ['metadata', requestPath(servicePath, '$metadata')],
        ...resources.map((resource) => ['collection', requestPath(servicePath, resource)]),
        ...navigations.map((navigation) => ['navigation', requestPath(servicePath, navigation)])
    ];
    const requests = [];
    for (const [kind, path] of paths) {
        requests.push(await observeRequest(new URL(path, baseUrl), fetchImpl, includeGeneratedValues, kind, timeoutMs));
    }
    const metadata = requests[0];
    const expected = requests.slice(1);
    const collections = requests.filter((request) => request.responseKind === 'collection');
    const navigationsObserved = requests.filter((request) => request.responseKind === 'navigation');
    return Object.freeze({
        version: 1,
        executionMode: 'live-http',
        ui: Object.freeze({ status: 'not-run' }),
        servicePath,
        requests: Object.freeze(requests),
        checks: Object.freeze({
            metadata: metadata.checks.statusOk && metadata.checks.reachable && metadata.checks.protocol,
            expectedResources: collections.every((request) => request.checks.statusOk && request.checks.protocol),
            expectedNavigations: navigationsObserved.every(
                (request) => request.checks.statusOk && request.checks.protocol
            ),
            allExpected: requests.every((request) => request.checks.statusOk && request.checks.protocol),
            httpOnly: true
        }),
        passed: requests.length > 0 && requests.every((request) => request.checks.statusOk && request.checks.protocol)
    });
}

export async function executeLiveHttpCaptureCommand(argv, dependencies = {}) {
    const options = parseArguments(argv);
    const generatorOptions = options.optionsFile ? JSON.parse(await readFile(options.optionsFile, 'utf8')) : {};
    if (!isPlainObject(generatorOptions)) throw new TypeError('--options-file must contain a JSON object');
    const preview = await (dependencies.startPreview ?? startFinancePreview)({
        app: options.app,
        config: options.config,
        generatorOptions
    });
    try {
        const report = await buildLiveHttpReport({
            baseUrl: preview.url,
            servicePath: options.servicePath,
            resources: options.resources,
            navigations: options.navigations,
            fetchImpl: dependencies.fetchImpl ?? fetch,
            includeGeneratedValues: options.includeGeneratedValues
        });
        const safeOptions = {
            ...(typeof generatorOptions.mode === 'string' ? { mode: generatorOptions.mode } : {}),
            ...(typeof generatorOptions.pipeline === 'string' ? { pipeline: generatorOptions.pipeline } : {})
        };
        for (const key of ['sampleDataset', 'syntheticScenario']) {
            const value = generatorOptions[key];
            if (isPlainObject(value) && typeof value.id === 'string' && typeof value.version === 'string') {
                safeOptions[key] = { id: value.id, version: value.version, sha256: sha256(canonicalJson(value)) };
            }
        }
        const output = {
            ...report,
            requestedExecution: generatorOptions.mode ?? 'deterministic',
            observedExecution: 'not-instrumented',
            optionsSha256: sha256(canonicalJson(generatorOptions)),
            requestedProvider: safeOptions,
            ui: { status: 'not-run' }
        };
        await (
            dependencies.writeReport ??
            (async (path, value) => {
                const { writeFile } = await import('node:fs/promises');
                await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
            })
        )(options.output, output);
        return output;
    } finally {
        await preview.close();
    }
}
