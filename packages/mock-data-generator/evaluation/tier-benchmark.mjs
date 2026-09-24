// Corpus-wide value-tier and fine-tuned-tier accounting for one package build and one profile.
//
// Counts value slots (rows x properties), splits the typed floor into keys, booleans, protocol sets,
// realistic-by-construction types and generic typed cells, and measures the fine-tuned tier from the
// calls it actually makes (the package's own generator, prompts, grammar and sampler, wrapped only to
// observe). Every service is one inspection pass with the package's learned runtime, so tiers, field
// decisions, model statistics and rows all come from the same execution.
//
// Profiles:
//   two-row  2 rows, seed 123, the package's default fine-tuned budget (the historical benchmark)
//   editor   10 rows, seed 1, sftTimeoutMs 30000, sftBudgetMs 20000 (the data editor's request)
//
// Usage:
//   node tier-benchmark.mjs PACKAGE_ROOT --registry r.json --source-root /abs [--profile two-row|editor]
//        [--rows N] [--seed N] [--sft-budget-ms N] [--sft-timeout-ms N] [--sft-model-rows N] [--output summary.json]
//        [--records services.jsonl] [--fields fields.jsonl] [--rows-out rows.jsonl --rows-for ids.json]
//        [--only ids.json] [--limit N]
//
// `--records` is appended per service and makes a run resumable: services already recorded are skipped
// and folded into the summary. Packages that predate per-field tiers in the inspection report can be
// measured from a copy whose `valueTierStatistics` calls `globalThis.__MOCKGEN_FIELD_TIER_HOOK__` and
// `globalThis.__MOCKGEN_SFT_STATISTICS_HOOK__`; the summary records which source was used.
import { existsSync } from 'node:fs';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { availableParallelism, loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const argument = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index === -1 ? fallback : process.argv[index + 1];
};

const PROFILES = {
    'two-row': { rowsPerEntity: 2, seed: 123 },
    editor: { rowsPerEntity: 10, seed: 1, sftTimeoutMs: 30_000, sftBudgetMs: 20_000 }
};
const REALISTIC_BY_CONSTRUCTION = new Set(['guid', 'date', 'datetime', 'datetimeoffset', 'time']);
// A string at its declared length is a cut-off only when the column is long enough for free text.
const AT_CAP_MINIMUM_LENGTH = 6;

const packageRoot = resolve(process.argv[2] ?? '');
const registryPath = argument('--registry');
const sourceRoot = argument('--source-root');
const profileName = argument('--profile', 'two-row');
const profile = PROFILES[profileName];
if (!process.argv[2] || !registryPath || !sourceRoot || !profile) {
    throw new TypeError(
        'Usage: tier-benchmark.mjs PACKAGE_ROOT --registry r.json --source-root /abs [--profile two-row|editor] ...'
    );
}
const settings = {
    profile: profileName,
    rowsPerEntity: Number(argument('--rows', String(profile.rowsPerEntity))),
    seed: Number(argument('--seed', String(profile.seed))),
    ...(argument('--sft-budget-ms') || profile.sftBudgetMs
        ? { sftBudgetMs: Number(argument('--sft-budget-ms', String(profile.sftBudgetMs))) }
        : {}),
    ...(argument('--sft-timeout-ms') || profile.sftTimeoutMs
        ? { sftTimeoutMs: Number(argument('--sft-timeout-ms', String(profile.sftTimeoutMs))) }
        : {}),
    ...(argument('--sft-model-rows') ? { sftModelRows: Number(argument('--sft-model-rows')) } : {})
};
// The editor profile mirrors the generator the data editor creates: builds that define execution-mode
// defaults apply the `data-editor` ones under the explicit profile settings, as the editor does.
if (profileName === 'editor') {
    const standalone = await import(join(packageRoot, 'dist/standalone.js'));
    const defaults = standalone.executionModeDefaults?.('data-editor') ?? {};
    for (const [key, value] of Object.entries(defaults)) {
        if (!(key in settings)) settings[key] = value;
    }
}
const outputPath = argument('--output');
const recordsPath = argument('--records');
const fieldsPath = argument('--fields');
const rowsOutPath = argument('--rows-out');
const rowsFor = argument('--rows-for')
    ? new Set(JSON.parse(await readFile(argument('--rows-for'), 'utf8')))
    : undefined;
const only = argument('--only') ? new Set(JSON.parse(await readFile(argument('--only'), 'utf8'))) : undefined;
const limit = Number(argument('--limit', '0'));

const index = await import(join(packageRoot, 'dist/index.js'));
const { packagedRuntimeManifest } = await import(join(packageRoot, 'dist/standalone.js'));
const { parsePackagedModelManifest, verifyPackagedModels } = await import(
    join(packageRoot, 'dist/model/packaged-models.js')
);
const { propertyValueIsValid } = await import(join(packageRoot, 'dist/generation/constraints.js'));
const { parseEdmx } = await import(join(packageRoot, 'dist/schema/edmx.js'));
const { parseCsn } = await import(join(packageRoot, 'dist/schema/csn.js'));
const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));

// Observe native causal-model calls: the learned runtime imports the same onnxruntime-node module.
const ortCounters = { calls: 0, forwardTokens: 0, prefills: 0, ms: 0 };
{
    const require = createRequire(join(packageRoot, 'package.json'));
    const ort = await import(require.resolve('onnxruntime-node'));
    const runtimeModule = ort.InferenceSession ? ort : ort.default;
    const create = runtimeModule.InferenceSession.create.bind(runtimeModule.InferenceSession);
    runtimeModule.InferenceSession.create = async (...args) => {
        const session = await create(...args);
        const run = session.run.bind(session);
        session.run = async (feeds, ...rest) => {
            if (!feeds['past_key_values.0.key']) {
                return run(feeds, ...rest);
            }
            const startedAt = performance.now();
            const output = await run(feeds, ...rest);
            ortCounters.ms += performance.now() - startedAt;
            ortCounters.calls += 1;
            ortCounters.forwardTokens += feeds.input_ids.dims[1];
            if (feeds['past_key_values.0.key'].dims[2] === 0) {
                ortCounters.prefills += 1;
            }
            return output;
        };
        return session;
    };
}

const loadStartedAt = performance.now();
const rawManifest = JSON.parse(await readFile(join(packageRoot, 'resources/models/manifest.json'), 'utf8'));
const manifest = parsePackagedModelManifest(rawManifest);
const verification = await verifyPackagedModels(join(packageRoot, 'resources/models'), manifest);
if (!verification.ready) {
    throw new Error('Packaged model verification failed');
}
const handle = await index.createLearnedRuntime(packagedRuntimeManifest(manifest), {
    ready: true,
    files: verification.files,
    failures: []
});
if (!handle.runtime.classifier || !handle.runtime.sft) {
    throw new Error(`Learned runtime incomplete: ${JSON.stringify(handle.diagnostics)}`);
}
const modelLoadMs = Math.round(performance.now() - loadStartedAt);

// Per-service observation of the fine-tuned tier, filled by the wrapped generator.
let calls = [];
let currentGraph;
const sft = Object.freeze({
    fingerprint: handle.runtime.sft.fingerprint,
    dispose: () => handle.runtime.sft.dispose?.(),
    generate: async (input, signal) => {
        const before = { ...ortCounters };
        const startedAt = performance.now();
        const call = {
            entity: input.entityName,
            rowCount: input.rowCount,
            fields: input.fields.map(({ name, primitiveType, maxLength, nullable }) => ({
                name,
                primitiveType,
                maxLength,
                nullable
            }))
        };
        try {
            const output = await handle.runtime.sft.generate(input, signal);
            call.rows = output.rows;
            call.statistics = output.statistics;
            return output;
        } catch (error) {
            call.error = String(error?.code ?? error?.message ?? error).slice(0, 120);
            throw error;
        } finally {
            call.ms = performance.now() - startedAt;
            call.ortCalls = ortCounters.calls - before.calls;
            call.forwardTokens = ortCounters.forwardTokens - before.forwardTokens;
            call.ortMs = ortCounters.ms - before.ms;
            call.prefills = ortCounters.prefills - before.prefills;
            calls.push(call);
        }
    }
});

let fieldTierHook = new Map();
let sftStatisticsHook;
globalThis.__MOCKGEN_FIELD_TIER_HOOK__ = (resource, property, tier, cells, modelCells) =>
    fieldTierHook.set(`${resource}.${property}`, { tier, cells, modelCells });
globalThis.__MOCKGEN_SFT_STATISTICS_HOOK__ = (statistics) => {
    sftStatisticsHook = statistics;
};

/**
 * Cell-level quality of the model's raw answers, before acceptance.
 *
 * @param {Array<object>} observed the wrapped calls of one service
 * @returns {Record<string, number>} counters
 */
function llmCallMetrics(observed) {
    const metrics = {
        calls: 0,
        failedCalls: 0,
        rowsRequested: 0,
        rowsComplete: 0,
        cells: 0,
        validCells: 0,
        nullCells: 0,
        stringCells: 0,
        atCapCells: 0,
        ortCalls: 0,
        forwardTokens: 0,
        prefills: 0,
        ms: 0,
        ortMs: 0
    };
    for (const call of observed) {
        metrics.calls += 1;
        metrics.rowsRequested += call.rowCount;
        metrics.ortCalls += call.ortCalls;
        metrics.forwardTokens += call.forwardTokens;
        metrics.prefills += call.prefills;
        metrics.ms += call.ms;
        metrics.ortMs += call.ortMs;
        if (call.error || !Array.isArray(call.rows)) {
            metrics.failedCalls += 1;
            continue;
        }
        const entity = currentGraph?.entities.find(({ name }) => name === call.entity);
        const properties = new Map((entity?.properties ?? []).map((property) => [property.name, property]));
        for (const row of call.rows) {
            if (!row || typeof row !== 'object' || Object.keys(row).length === 0) {
                continue;
            }
            metrics.rowsComplete += 1;
            for (const field of call.fields) {
                if (!(field.name in row)) {
                    continue;
                }
                const value = row[field.name];
                metrics.cells += 1;
                const property = properties.get(field.name);
                if (property && propertyValueIsValid(property, value)) {
                    metrics.validCells += 1;
                }
                if (value === null) {
                    metrics.nullCells += 1;
                } else if (typeof value === 'string') {
                    metrics.stringCells += 1;
                    if (
                        field.maxLength !== undefined &&
                        field.maxLength >= AT_CAP_MINIMUM_LENGTH &&
                        Array.from(value).length === field.maxLength
                    ) {
                        metrics.atCapCells += 1;
                    }
                }
            }
        }
    }
    metrics.ms = Math.round(metrics.ms);
    metrics.ortMs = Math.round(metrics.ortMs);
    return metrics;
}

/**
 * Where a typed cell sits: keys, booleans, SAP Gateway protocol sets, types whose generic value is
 * already realistic (guids, dates, times), or generic typed values.
 *
 * @param {string} resource entity set
 * @param {{isKey: boolean, primitiveType: string}} property schema property
 * @returns {string} typed class
 */
function typedClass(resource, property) {
    if (resource.startsWith('SAP__')) return 'protocol';
    if (property.isKey) return 'key';
    if (property.primitiveType === 'bool') return 'boolean';
    if (REALISTIC_BY_CONSTRUCTION.has(property.primitiveType)) return 'realistic';
    return 'generic';
}

/**
 * Why the fine-tuned tier did not fill a field.
 *
 * @param {object | undefined} assignment the field's resource assignment
 * @param {object | undefined} field the field's statistics
 * @param {object | undefined} skipped the resource's skip record
 * @returns {string | undefined} reason, or undefined when every eligible slot was accepted
 */
function llmRejectReason(assignment, field, skipped) {
    if (skipped) return `skipped-${skipped.reason}`;
    if (!assignment || !field) return undefined;
    if (field.acceptedSlots >= field.eligibleSlots) return undefined;
    if (assignment.outcome && ['timeout', 'failed', 'unverified'].includes(assignment.outcome))
        return assignment.outcome;
    if (!assignment.parsed) return 'no-answer';
    if ((field.invalidSlots ?? 0) > 0) return 'invalid-value';
    if ((assignment.rowsWithoutCandidate ?? 0) > 0) return 'incomplete-row';
    return assignment.outcome === undefined ? 'unknown' : 'row-rejected';
}

const registry = JSON.parse(await readFile(registryPath, 'utf8'));
let candidates = registry.services.filter((service) => ['edmx', 'csn'].includes(service.source?.format));
if (only) candidates = candidates.filter(({ id }) => only.has(id));
if (limit > 0) candidates = candidates.slice(0, limit);

const done = new Map();
if (recordsPath && existsSync(recordsPath)) {
    for (const line of (await readFile(recordsPath, 'utf8')).split('\n')) {
        if (line.trim()) {
            const record = JSON.parse(line);
            done.set(record.id, record);
        }
    }
}

const runLoadStart = loadavg()[0];
for (const service of candidates) {
    if (done.has(service.id)) continue;
    const loadAtStart = loadavg()[0];
    let content;
    let graph;
    try {
        content = await readFile(join(sourceRoot, service.source.uri), 'utf8');
    } catch {
        const record = { id: service.id, status: 'failed', reason: 'unreadable-source' };
        done.set(service.id, record);
        if (recordsPath) await appendFile(recordsPath, `${JSON.stringify(record)}\n`);
        continue;
    }
    try {
        graph = service.source.format === 'csn' ? parseCsn(content) : parseEdmx(content);
    } catch (error) {
        const record = { id: service.id, status: 'failed', reason: `parse: ${String(error?.message).slice(0, 120)}` };
        done.set(service.id, record);
        if (recordsPath) await appendFile(recordsPath, `${JSON.stringify(record)}\n`);
        continue;
    }
    const targets = [...new Set(graph.entities.map((entity) => entity.entitySetName))].map((name) => ({
        name,
        kind: 'entity-set'
    }));
    if (targets.length === 0) {
        const record = { id: service.id, status: 'no-targets' };
        done.set(service.id, record);
        if (recordsPath) await appendFile(recordsPath, `${JSON.stringify(record)}\n`);
        continue;
    }
    calls = [];
    currentGraph = graph;
    fieldTierHook = new Map();
    sftStatisticsHook = undefined;
    const startedAt = performance.now();
    let record;
    const fieldLines = [];
    try {
        const report = await index.inspectService(
            {
                metadata: { format: service.source.format === 'csn' ? 'csn' : 'edmx', content },
                service: { urlPath: `/${service.id}`, odataVersion: service.source.format === 'csn' ? '4.0' : '2.0' },
                targets,
                existingData: {}
            },
            { pipeline: 'semantic-v2', mode: 'auto', ...settings },
            { ...handle.runtime, sft },
            { includeGeneratedValues: true }
        );
        const elapsedMs = Math.round(performance.now() - startedAt);
        const statistics = report.statistics?.sft ?? sftStatisticsHook;
        const assignments = new Map((statistics?.assignments ?? []).map((entry) => [entry.resource, entry]));
        const skipped = new Map((statistics?.skippedResources ?? []).map((entry) => [entry.resource, entry]));
        const properties = new Map(
            graph.entities.flatMap((entity) =>
                entity.properties.map((property) => [`${entity.entitySetName}.${property.name}`, property])
            )
        );
        const tiers = { authored: 0, declared: 0, recognised: 0, model: 0, typed: 0, structural: 0, slots: 0 };
        const typedSplit = { key: 0, boolean: 0, protocol: 0, realistic: 0, generic: 0 };
        const typedByType = {};
        let tierSource = 'inspection';
        let plannedSlots = 0;
        for (const decision of report.fieldDecisions) {
            const id = `${decision.resource}.${decision.property}`;
            const valueTier = decision.valueTier ?? fieldTierHook.get(id);
            if (!valueTier) continue;
            if (!decision.valueTier) tierSource = 'hook';
            const property = properties.get(id) ?? decision;
            const remaining = valueTier.cells - valueTier.modelCells;
            tiers.model += valueTier.modelCells;
            tiers[valueTier.tier] += remaining;
            tiers.slots += valueTier.cells;
            let klass;
            if (valueTier.tier === 'typed' && remaining > 0) {
                klass = typedClass(decision.resource, property);
                typedSplit[klass] += remaining;
                if (klass === 'generic' || klass === 'realistic') {
                    typedByType[property.primitiveType] = (typedByType[property.primitiveType] ?? 0) + remaining;
                }
            }
            const assignment = assignments.get(decision.resource);
            const field = assignment?.fields.find(({ name }) => name === decision.property);
            const skip = skipped.get(decision.resource);
            const llmPlanned = Boolean(field) || Boolean(skip?.fields.includes(decision.property));
            if (llmPlanned) plannedSlots += valueTier.cells;
            if (fieldsPath) {
                const concept = decision.evidence?.finalCandidate?.concept ?? decision.evidence?.rawCandidate?.concept;
                fieldLines.push(
                    JSON.stringify({
                        service: service.id,
                        resource: decision.resource,
                        property: decision.property,
                        type: decision.primitiveType,
                        isKey: decision.isKey,
                        maxLength: property.maxLength,
                        tier: valueTier.tier,
                        cells: valueTier.cells,
                        modelCells: valueTier.modelCells,
                        ...(klass ? { typedClass: klass } : {}),
                        acceptedRole: decision.acceptedRole,
                        abstentionReason: decision.abstentionReason,
                        detectionSource: decision.detectionSource,
                        headATop: decision.rawTop?.[0],
                        classifierPrediction: decision.classifierPrediction,
                        ...(concept ? { concept: { id: concept.id, similarity: concept.similarity } } : {}),
                        llmPlanned,
                        ...(llmPlanned
                            ? {
                                  llmOutcome: skip ? `skipped-${skip.reason}` : (assignment?.outcome ?? 'unavailable'),
                                  llmAccepted: field?.acceptedSlots ?? 0,
                                  llmInvalid: field?.invalidSlots,
                                  llmRejectReason: llmRejectReason(assignment, field, skip)
                              }
                            : {})
                    })
                );
            }
        }
        if (tiers.slots === 0 && Object.values(report.generatedValues ?? {}).some((rows) => rows.length > 0)) {
            throw new Error('no per-field tiers: the package predates them and is not instrumented');
        }
        const llm = llmCallMetrics(calls);
        record = {
            id: service.id,
            status: 'ok',
            elapsedMs,
            load: [Number(loadAtStart.toFixed(2)), Number(loadavg()[0].toFixed(2))],
            tierSource,
            tiers,
            typedSplit,
            typedByType,
            sft: {
                attempts: statistics?.attempts,
                parsedResponses: statistics?.parsedResponses,
                eligibleSlots: statistics?.eligibleSlots,
                acceptedSlots: statistics?.acceptedSlots,
                plannedSlots,
                skippedResources: statistics?.skippedResources?.length ?? 0,
                outcomes: [...assignments.values()].reduce((counts, { outcome }) => {
                    counts[outcome ?? 'unavailable'] = (counts[outcome ?? 'unavailable'] ?? 0) + 1;
                    return counts;
                }, {})
            },
            llm,
            budgetExhausted: report.diagnostics.some(({ code }) => code === 'SFT_BUDGET_EXHAUSTED')
        };
        if (rowsOutPath && (!rowsFor || rowsFor.has(service.id))) {
            const fieldTier = Object.fromEntries(
                report.fieldDecisions.flatMap((decision) => {
                    const valueTier =
                        decision.valueTier ?? fieldTierHook.get(`${decision.resource}.${decision.property}`);
                    return valueTier ? [[`${decision.resource}.${decision.property}`, valueTier]] : [];
                })
            );
            await appendFile(
                rowsOutPath,
                `${JSON.stringify({ id: service.id, resources: report.generatedValues, fieldTier })}\n`
            );
        }
    } catch (error) {
        record = {
            id: service.id,
            status: 'failed',
            reason: String(error?.message ?? error).slice(0, 200),
            elapsedMs: Math.round(performance.now() - startedAt)
        };
    }
    done.set(service.id, record);
    if (fieldsPath && fieldLines.length > 0) await appendFile(fieldsPath, `${fieldLines.join('\n')}\n`);
    if (recordsPath) await appendFile(recordsPath, `${JSON.stringify(record)}\n`);
}
await handle.dispose();

const records = candidates.map(({ id }) => done.get(id)).filter(Boolean);
const ok = records.filter(({ status }) => status === 'ok');
const sum = (select) => ok.reduce((total, record) => total + (select(record) ?? 0), 0);
const totals = Object.fromEntries(
    ['authored', 'declared', 'recognised', 'model', 'typed', 'structural', 'slots'].map((key) => [
        key,
        sum((record) => record.tiers[key])
    ])
);
const typedSplit = Object.fromEntries(
    ['key', 'boolean', 'protocol', 'realistic', 'generic'].map((key) => [key, sum((record) => record.typedSplit[key])])
);
const addressableByPrimitiveType = {};
for (const record of ok) {
    for (const [type, count] of Object.entries(record.typedByType)) {
        addressableByPrimitiveType[type] = (addressableByPrimitiveType[type] ?? 0) + count;
    }
}
const llmTotals = Object.fromEntries(
    Object.keys(ok[0]?.llm ?? {}).map((key) => [key, sum((record) => record.llm[key])])
);
const nonStructural = totals.slots - totals.structural;
const pct = (value, of = nonStructural) => (of > 0 ? Number(((value / of) * 100).toFixed(2)) : 0);
const ratio = (value, of) => (of > 0 ? Number((value / of).toFixed(4)) : 0);
const elapsed = ok.map(({ elapsedMs }) => elapsedMs).sort((left, right) => left - right);
const quantile = (q) => (elapsed.length ? elapsed[Math.min(elapsed.length - 1, Math.floor(q * elapsed.length))] : 0);
const report = {
    format: 'mockgen-tier-benchmark',
    version: 2,
    package: {
        name: packageJson.name,
        version: packageJson.version,
        root: packageRoot,
        sftFingerprint: handle.runtime.sft.fingerprint,
        classifierFingerprint: handle.runtime.classifier.fingerprint
    },
    settings,
    host: {
        availableParallelism: availableParallelism(),
        node: process.version,
        loadAverage: { start: Number(runLoadStart.toFixed(2)), end: Number(loadavg()[0].toFixed(2)) },
        modelLoadMs
    },
    tierSources: [...new Set(ok.map(({ tierSource }) => tierSource))],
    corpus: {
        attempted: candidates.length,
        generated: ok.length,
        failed: records.filter(({ status }) => status === 'failed').length,
        noTargets: records.filter(({ status }) => status === 'no-targets').length
    },
    totals,
    shares: {
        recognised: pct(totals.recognised),
        model: pct(totals.model),
        typed: pct(totals.typed),
        declared: pct(totals.declared),
        authored: pct(totals.authored),
        genericTyped: pct(typedSplit.generic)
    },
    typedSplit,
    addressableByPrimitiveType,
    llm: {
        plannedSlots: sum((record) => record.sft.plannedSlots),
        eligibleSlots: sum((record) => record.sft.eligibleSlots),
        acceptedSlots: sum((record) => record.sft.acceptedSlots),
        acceptedOfPlanned: ratio(
            totals.model,
            sum((record) => record.sft.plannedSlots)
        ),
        servicesBudgetExhausted: ok.filter(({ budgetExhausted }) => budgetExhausted).length,
        outcomes: ok.reduce((counts, record) => {
            for (const [key, value] of Object.entries(record.sft.outcomes)) counts[key] = (counts[key] ?? 0) + value;
            return counts;
        }, {}),
        ...llmTotals,
        validCellRate: ratio(llmTotals.validCells ?? 0, llmTotals.cells ?? 0),
        nullRate: ratio(llmTotals.nullCells ?? 0, llmTotals.cells ?? 0),
        atCapRate: ratio(llmTotals.atCapCells ?? 0, llmTotals.stringCells ?? 0),
        completeRowRate: ratio(llmTotals.rowsComplete ?? 0, llmTotals.rowsRequested ?? 0),
        forwardTokensPerRequestedRow: ratio(llmTotals.forwardTokens ?? 0, llmTotals.rowsRequested ?? 0),
        msPerForwardToken: ratio(llmTotals.ms ?? 0, llmTotals.forwardTokens ?? 0)
    },
    timing: {
        totalMs: elapsed.reduce((total, value) => total + value, 0),
        medianMs: quantile(0.5),
        p90Ms: quantile(0.9),
        maxMs: elapsed.at(-1) ?? 0
    },
    failures: records.filter(({ status }) => status === 'failed').map(({ id, reason }) => ({ id, reason }))
};
if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
