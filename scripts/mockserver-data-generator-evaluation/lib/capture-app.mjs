import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';

const PIPELINES = new Set(['legacy', 'semantic-v2']);
const SCENARIOS = ['source-precedence', 'generator-only'];

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJson).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function parseArguments(argv) {
    const requiredOptions = ['--app', '--config', '--pipeline', '--output'];
    const allowed = new Set([...requiredOptions, '--execution', '--model-manifest', '--model-cache']);
    const values = new Map();
    for (let index = 0; index < argv.length; index += 2) {
        const name = argv[index];
        const value = argv[index + 1];
        if (!allowed.has(name) || !value || value.startsWith('--') || values.has(name)) {
            throw new TypeError(`Invalid or duplicate capture-app option ${name ?? '<missing>'}`);
        }
        values.set(name, value);
    }
    for (const required of requiredOptions) {
        if (!values.has(required)) {
            throw new TypeError(`capture-app requires ${required}`);
        }
    }
    const pipelines = values
        .get('--pipeline')
        .split(',')
        .map((pipeline) => pipeline.trim());
    if (
        pipelines.length === 0 ||
        pipelines.some((pipeline) => !PIPELINES.has(pipeline)) ||
        new Set(pipelines).size !== pipelines.length
    ) {
        throw new TypeError('--pipeline must contain unique legacy and/or semantic-v2 values');
    }
    const execution = values.get('--execution') ?? 'deterministic';
    if (!['deterministic', 'learned'].includes(execution)) {
        throw new TypeError('--execution must be deterministic or learned');
    }
    if (execution === 'learned' && !values.has('--model-manifest')) {
        throw new TypeError(
            'Learned inspection requires --model-manifest; models are loaded from the verified offline cache'
        );
    }
    return {
        execution,
        manifestPath: values.has('--model-manifest') ? resolve(values.get('--model-manifest')) : undefined,
        cacheDirectory: values.has('--model-cache') ? resolve(values.get('--model-cache')) : undefined,
        app: resolve(values.get('--app')),
        config: values.get('--config'),
        pipelines,
        output: resolve(values.get('--output'))
    };
}

async function assertDirectory(path, label) {
    let details;
    try {
        details = await lstat(path);
    } catch {
        throw new TypeError(`${label} must be a readable directory`);
    }
    if (!details.isDirectory() || details.isSymbolicLink()) {
        throw new TypeError(`${label} must be a non-symbolic-link directory`);
    }
}

async function readRegularFile(path, label) {
    let details;
    try {
        details = await lstat(path);
    } catch {
        throw new TypeError(`${label} must be a readable regular file`);
    }
    if (!details.isFile() || details.isSymbolicLink()) {
        throw new TypeError(`${label} must be a non-symbolic-link regular file`);
    }
    return readFile(path, 'utf8');
}

async function fileExists(path) {
    try {
        const details = await lstat(path);
        return details.isFile() && !details.isSymbolicLink();
    } catch {
        return false;
    }
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertContained(root, candidate, label) {
    if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
        throw new TypeError(`${label} must resolve inside the application directory`);
    }
    return candidate;
}

/** Resolve a relative app path while rejecting symlink and traversal escapes. */
export async function resolveContainedPath(root, value, label, { allowMissing = false } = {}) {
    if (typeof value !== 'string' || value.length === 0 || isAbsolute(value)) {
        throw new TypeError(`${label} must be a non-empty relative path`);
    }
    const candidate = resolve(root, value);
    try {
        return assertContained(root, await realpath(candidate), label);
    } catch (error) {
        if (!allowMissing || error?.code !== 'ENOENT') throw error;
        let parent = candidate;
        while (parent !== dirname(parent)) {
            try {
                assertContained(root, await realpath(parent), label);
                return candidate;
            } catch (parentError) {
                if (parentError?.code !== 'ENOENT') throw parentError;
                parent = dirname(parent);
            }
        }
        throw new TypeError(`${label} must resolve inside the application directory`);
    }
}

async function inspectSources(appRoot, mockdataPath, targets) {
    const existingData = {};
    const materials = [];
    for (const target of targets) {
        const jsonPath = resolve(mockdataPath, `${target.name}.json`);
        const jsPath = resolve(mockdataPath, `${target.name}.js`);
        const tsPath = resolve(mockdataPath, `${target.name}.ts`);
        const [safeJsonPath, safeJsPath, safeTsPath] = await Promise.all([
            resolveContainedPath(appRoot, relative(appRoot, jsonPath), `Authored JSON for ${target.name}`, {
                allowMissing: true
            }),
            resolveContainedPath(appRoot, relative(appRoot, jsPath), `Contributor for ${target.name}`, {
                allowMissing: true
            }),
            resolveContainedPath(appRoot, relative(appRoot, tsPath), `Contributor for ${target.name}`, {
                allowMissing: true
            })
        ]);
        const contributorPath = (await fileExists(safeTsPath))
            ? safeTsPath
            : (await fileExists(safeJsPath))
              ? safeJsPath
              : undefined;
        if (contributorPath) {
            const source = await readRegularFile(contributorPath, `Contributor for ${target.name}`);
            materials.push([relative(mockdataPath, contributorPath), sha256(source)]);
            existingData[target.name] = {
                contributor: { present: true, hasInitialData: true },
                initialRows: { source: 'contributor', present: true, enumerable: false }
            };
            continue;
        }
        if (await fileExists(safeJsonPath)) {
            const source = await readRegularFile(safeJsonPath, `Authored JSON for ${target.name}`);
            let rows;
            try {
                rows = source.length === 0 ? [] : JSON.parse(source);
            } catch {
                throw new TypeError(`Authored JSON for ${target.name} must contain valid JSON`);
            }
            if (!Array.isArray(rows) || rows.some((row) => !isPlainObject(row))) {
                throw new TypeError(`Authored JSON for ${target.name} must contain an array of row objects`);
            }
            materials.push([relative(mockdataPath, safeJsonPath), sha256(source)]);
            existingData[target.name] = {
                contributor: { present: false },
                initialRows: { source: 'json', present: true, rows }
            };
            continue;
        }
        existingData[target.name] = {
            contributor: { present: false },
            initialRows: { source: 'none', present: false }
        };
    }
    return { existingData, materials };
}

function mockserverConfiguration(document) {
    const middleware = document?.server?.customMiddleware;
    if (!Array.isArray(middleware)) {
        throw new TypeError('Mockserver YAML must contain server.customMiddleware');
    }
    const entry = middleware.find((candidate) => candidate?.name === 'sap-fe-mockserver');
    if (!isPlainObject(entry?.configuration) || !Array.isArray(entry.configuration.services)) {
        throw new TypeError('Mockserver YAML must configure sap-fe-mockserver services');
    }
    return entry.configuration;
}

function providerSetting(configuration, service) {
    if (Object.prototype.hasOwnProperty.call(service, 'mockDataGenerator')) {
        return service.mockDataGenerator;
    }
    return configuration.mockDataGenerator;
}

function generationOptions(setting, pipeline) {
    const options = isPlainObject(setting?.options) ? setting.options : {};
    return {
        ...options,
        pipeline
    };
}

function untouchedRequestData(targets, existingData, allowlistedEmptyNames) {
    const allowlisted = new Set(allowlistedEmptyNames);
    return targets.filter((target) => {
        const initialRows = existingData[target.name]?.initialRows;
        return (
            initialRows?.present !== true ||
            (initialRows.source === 'json' && initialRows.rows.length === 0 && allowlisted.has(target.name))
        );
    });
}

function generatorOnlyData(targets) {
    return Object.fromEntries(
        targets.map((target) => [
            target.name,
            { contributor: { present: false }, initialRows: { source: 'none', present: false } }
        ])
    );
}

async function atomicJsonWrite(path, value) {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, path);
}

async function defaultParseMetadataTargets(content) {
    const { parseEdmx } = await import('../../../packages/mockserver-data-generator/dist/schema/edmx.js');
    return parseEdmx(content).entities.map((entity) => ({ name: entity.entitySetName, kind: 'entity-set' }));
}

async function defaultInspectService(...args) {
    const { inspectService } = await import('../../../packages/mockserver-data-generator/dist/index.js');
    return inspectService(...args);
}

/** Read original authored context for independent local evaluation; never persist its rows. */
export async function readApplicationContext(appPath, config, capture, expectedAppHash) {
    const app = await realpath(appPath);
    const configPath = await resolveContainedPath(app, config, '--config');
    const configSource = await readRegularFile(configPath, '--config');
    if (sha256(configSource) !== capture.hashes?.config) {
        throw new TypeError('Application configuration hash differs from captured evidence');
    }
    const configuration = mockserverConfiguration(parseYaml(configSource));
    if (!Number.isSafeInteger(capture.serviceIndex) || !configuration.services[capture.serviceIndex]) {
        throw new TypeError('Captured service is absent from application configuration');
    }
    const appMaterials = [[relative(app, configPath), sha256(configSource)]];
    let existingData;
    for (const [index, service] of configuration.services.entries()) {
        const metadataPath = await resolveContainedPath(app, service.metadataPath, 'Metadata');
        const metadata = await readRegularFile(metadataPath, 'Metadata');
        if (index === capture.serviceIndex && sha256(metadata) !== capture.hashes?.metadata) {
            throw new TypeError('Application metadata hash differs from captured evidence');
        }
        appMaterials.push([relative(app, metadataPath), sha256(metadata)]);
        const mockdataPath = await resolveContainedPath(
            app,
            service.mockdataPath ?? dirname(service.metadataPath),
            'Mockdata',
            { allowMissing: true }
        );
        const sources = await inspectSources(app, mockdataPath, await defaultParseMetadataTargets(metadata));
        sources.materials.forEach(([name, hash]) =>
            appMaterials.push([`${relative(app, mockdataPath)}/${name}`, hash])
        );
        if (index === capture.serviceIndex) existingData = sources.existingData;
    }
    if (sha256(canonicalJson(appMaterials.sort(([left], [right]) => left.localeCompare(right)))) !== expectedAppHash) {
        throw new TypeError('Application source hash differs from captured evidence');
    }
    const resources = {};
    for (const ownership of capture.inspection.sourceOwnership ?? []) {
        if (ownership.eligible || ownership.initialRows?.source !== 'json') continue;
        const source = existingData?.[ownership.resource]?.initialRows;
        if (source?.source !== 'json' || sha256(canonicalJson(source.rows)) !== ownership.initialRows.sha256) {
            throw new TypeError('Authored context hash differs from captured evidence');
        }
        resources[ownership.resource] = source.rows;
    }
    return resources;
}

/** Capture identical pipeline runs for authored-precedence and generator-only app scenarios. */
async function captureApp(parsed, dependencies) {
    await assertDirectory(parsed.app, '--app');
    const app = await realpath(parsed.app);
    const outputRelative = relative(app, parsed.output);
    if (outputRelative === '' || (!outputRelative.startsWith('..') && !isAbsolute(outputRelative))) {
        throw new TypeError('--output must be outside the application directory');
    }
    const configPath = await resolveContainedPath(app, parsed.config, '--config');
    const configSource = await readRegularFile(configPath, '--config');
    const configuration = mockserverConfiguration(parseYaml(configSource));
    const parseMetadataTargets = dependencies.parseMetadataTargets ?? defaultParseMetadataTargets;
    const inspectService = dependencies.inspectService ?? defaultInspectService;
    const captures = [];
    const metadataHashes = [];
    const appMaterials = [[relative(app, configPath), sha256(configSource)]];

    for (const [serviceIndex, service] of configuration.services.entries()) {
        if (
            !isPlainObject(service) ||
            typeof service.urlPath !== 'string' ||
            typeof service.metadataPath !== 'string'
        ) {
            throw new TypeError('Each mockserver service requires urlPath and metadataPath');
        }
        const metadataPath = await resolveContainedPath(
            app,
            service.metadataPath,
            `Metadata for service ${service.urlPath}`
        );
        const mockdataPath = await resolveContainedPath(
            app,
            service.mockdataPath ?? dirname(service.metadataPath),
            `Mockdata for service ${service.urlPath}`,
            { allowMissing: true }
        );
        const metadata = await readRegularFile(metadataPath, `Metadata for service ${service.urlPath}`);
        const metadataHash = sha256(metadata);
        metadataHashes.push(metadataHash);
        appMaterials.push([relative(app, metadataPath), metadataHash]);
        const targets = await parseMetadataTargets(metadata);
        const { existingData, materials } = await inspectSources(app, mockdataPath, targets);
        materials.forEach(([name, hash]) => appMaterials.push([`${relative(app, mockdataPath)}/${name}`, hash]));
        const setting = providerSetting(configuration, service);
        const allowlistedEmptyNames =
            isPlainObject(setting) && Array.isArray(setting.generateForEmptyJson)
                ? setting.generateForEmptyJson.filter((name) => typeof name === 'string')
                : [];

        for (const scenario of SCENARIOS) {
            const scenarioExistingData =
                scenario === 'generator-only'
                    ? generatorOnlyData(targets)
                    : Object.fromEntries(
                          Object.entries(existingData).map(([name, data]) => [
                              name,
                              allowlistedEmptyNames.includes(name) &&
                              data.initialRows.source === 'json' &&
                              data.initialRows.rows.length === 0
                                  ? { ...data, initialRows: { source: 'none', present: false } }
                                  : data
                          ])
                      );
            const scenarioTargets =
                scenario === 'generator-only'
                    ? targets
                    : setting === false
                      ? []
                      : untouchedRequestData(targets, existingData, allowlistedEmptyNames);
            for (const pipeline of parsed.pipelines) {
                const inspection = await inspectService(
                    {
                        metadata: { format: 'edmx', content: metadata },
                        service: {
                            urlPath: service.urlPath,
                            ...(typeof service.alias === 'string' ? { alias: service.alias } : {}),
                            odataVersion:
                                /(?:DataServiceVersion\s*=\s*["']2\.0|Edmx\b[^>]*Version\s*=\s*["']1\.0)/u.test(
                                    metadata
                                )
                                    ? '2.0'
                                    : '4.0'
                        },
                        targets: scenarioTargets,
                        existingData: scenarioExistingData
                    },
                    generationOptions(setting, pipeline),
                    dependencies.runtime,
                    { includeGeneratedValues: true }
                );
                const file = `service-${serviceIndex + 1}.${scenario}.${pipeline}.json`;
                await atomicJsonWrite(resolve(parsed.output, file), {
                    captureVersion: 1,
                    executionMode: dependencies.runtime ? 'learned-inspection' : 'deterministic-inspection',
                    scenario,
                    serviceIndex,
                    hashes: { config: sha256(configSource), metadata: metadataHash },
                    inspection
                });
                captures.push({ serviceIndex, service: service.urlPath, scenario, pipeline, file });
            }
        }
    }

    const summary = {
        version: 1,
        command: 'mockgen:capture-app',
        executionMode: dependencies.runtime ? 'learned-inspection' : 'deterministic-inspection',
        hashes: {
            app: sha256(canonicalJson(appMaterials.sort(([left], [right]) => left.localeCompare(right)))),
            config: sha256(configSource),
            metadata: metadataHashes
        },
        captures
    };
    await atomicJsonWrite(resolve(parsed.output, 'capture-summary.json'), summary);
    return summary;
}

async function loadRuntime(parsed) {
    const { parseModelManifest, verifyModelCache, defaultModelCacheRoot, createLearnedRuntime } =
        await import('../../../packages/mockserver-data-generator/dist/index.js');
    const manifest = parseModelManifest(JSON.parse(await readRegularFile(parsed.manifestPath, 'Model manifest')));
    const cache = await verifyModelCache(parsed.cacheDirectory ?? defaultModelCacheRoot(), manifest);
    return createLearnedRuntime(manifest, cache);
}

/** Capture deterministic or explicitly loaded offline learned execution, never silently substitute modes. */
export async function executeCaptureAppCommand(argv, dependencies = {}) {
    const parsed = parseArguments(argv);
    const handle = parsed.execution === 'learned' ? await (dependencies.loadRuntime ?? loadRuntime)(parsed) : undefined;
    try {
        if (handle && !handle.runtime.classifier && !handle.runtime.sft) {
            throw new TypeError('Learned inspection has no available learned components');
        }
        return await captureApp(parsed, { ...dependencies, ...(handle ? { runtime: handle.runtime } : {}) });
    } finally {
        await handle?.dispose();
    }
}
