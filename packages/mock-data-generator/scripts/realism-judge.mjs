#!/usr/bin/env node

// Realism judge: an LLM reads generated rows entity by entity and says, for every column, whether its values
// fit the column, and which rows hold values that contradict each other (a city of another country than the
// row's, a text that does not name its code). It complements the deterministic realism checks
// (realism-sweep.mjs), which cannot tell whether a value means what its field means.
//
// Every entity set of every corpus service is judged, all of its columns, in chunks of at most --columns
// columns that always include the keys. Verdicts are cached by (judge, protocol, payload) digest, so unchanged
// rows are never judged twice. The report lists every failing field with the judge's reason and examples, and
// the run fails when the share of passing fields is below --floor. A cell holding the standard mock server
// fallback (property name and row index) is shown as empty: the generator abstained there, the sweep counts
// such cells, and the judge scores what the generator claims to know.
//
// Transport: OpenAI-compatible chat completions (LITELLM_PROXY_URL, default http://localhost:6655/litellm/v1).
// The key is read from LITELLM_API_KEY and never written; logs carry counts only, never values.
//
// Usage:
//   LITELLM_API_KEY=... node scripts/realism-judge.mjs --corpus FILE --rows DIR --out DIR --cache FILE
//        [--judge MODEL] [--fallback-judge MODEL] [--concurrency 1..3] [--columns 30] [--shown-rows 10] [--floor 0.9] [--package ROOT]
//
//   --corpus  JSON array of { id, format: 'edmx'|'csn', path, alias? }, as for realism-sweep.mjs.
//   --rows    rows the sweep saved (DIR/<id>.rows.json).
//   --fallback-judge  a second model for the items the main judge cannot answer after its retries; the
//             report counts them.

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const PROTOCOL = 'mockgen-realism-rows-v2';
const PROXY = process.env.LITELLM_PROXY_URL ?? 'http://localhost:6655/litellm/v1';
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 240_000;
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const MAX_VALUE_LENGTH = 80;
const WORST_FIELDS = 50;

const SYSTEM = `You review generated mock data for business applications (SAP Fiori apps and OData services).

Each item shows one entity: its columns (name, label when there is one, type) and up to 10 generated rows as JSON objects. Decide for EVERY column whether its values are right for that column in a real business application:
1 = the values plausibly belong in that column: the right kind of content for what the column means, a sensible format and length, varied where real data varies;
0 = placeholders or filler ("Name 1", "Text 3"), names of other columns or of the service, random strings or digits where meaningful content is expected, values of another kind than the column holds (a code where a name is expected, a maintenance task in a bank's description), or implausible repetition.
An empty value (null or "") is neither right nor wrong: judge a column only on its non-empty values, and give 1 to a column with no non-empty value. Identifiers and keys are right when they look like identifiers of that kind.

Also list every contradiction between columns of the same row (a city in another country than the row's country, a text that does not describe its code, an end before its start, a currency that is not the country's when the columns say they belong together).

Reply with strict JSON only:
{"items":[{"itemId":"...","columns":{"<column>":0|1,...},"reasons":{"<column with 0>":"<one short sentence>"},"contradictions":[{"columns":["<column>","<column>"],"reason":"<one short sentence>"}]}]}
Every column of the item must be present in "columns"; "reasons" holds exactly the columns given 0.`;

const { values: args } = parseArgs({
    options: {
        corpus: { type: 'string', default: process.env.MOCKGEN_REALISM_CORPUS },
        rows: { type: 'string' },
        out: { type: 'string' },
        cache: { type: 'string' },
        judge: { type: 'string', default: 'anthropic--claude-4.8-opus' },
        concurrency: { type: 'string', default: '2' },
        columns: { type: 'string', default: '30' },
        'shown-rows': { type: 'string', default: '10' },
        floor: { type: 'string', default: '0.9' },
        'fallback-judge': { type: 'string' },
        package: { type: 'string', default: join(dirname(fileURLToPath(import.meta.url)), '..') }
    }
});
const concurrency = Math.min(3, Math.max(1, Number(args.concurrency)));
const columnsPerItem = Math.max(5, Number(args.columns));
const shownRows = Math.max(1, Number(args['shown-rows']));
const floor = Number(args.floor);
if (!args.corpus || !args.rows || !args.out || !args.cache || !(floor >= 0 && floor <= 1)) {
    console.error(
        'Usage: realism-judge.mjs --corpus FILE --rows DIR --out DIR --cache FILE [--judge MODEL] [--fallback-judge MODEL] [--concurrency 1..3] [--columns N] [--shown-rows N] [--floor 0..1]'
    );
    process.exit(2);
}
if (!process.env.LITELLM_API_KEY) {
    console.error('LITELLM_API_KEY is not set');
    process.exit(2);
}

const packageRoot = resolve(args.package);
const distModule = (path) => import(pathToFileURL(join(packageRoot, 'dist', path)).href);
const { parseEdmx } = await distModule('schema/edmx.js');
const { parseCsn } = await distModule('schema/csn.js');
// Packages before the standard mock server fallback write no fallback values.
const standardFallbackTest = await distModule('spec/standard-mockserver.js').then(
    (module) => module.standardFallbackTest ?? (() => () => false),
    () => () => () => false
);

const sha = (text) => createHash('sha256').update(text).digest('hex');
const log = (event, fields = {}) => process.stdout.write(`${JSON.stringify({ event, ...fields })}\n`);

/**
 * A cell as the judge sees it: long strings shortened.
 *
 * @param {unknown} value generated cell
 * @returns {unknown} the shown value
 */
function shown(value) {
    return typeof value === 'string' && value.length > MAX_VALUE_LENGTH
        ? `${value.slice(0, MAX_VALUE_LENGTH)}…`
        : value;
}

/**
 * The items of one service: every entity set with rows, its columns in chunks that always repeat the keys.
 *
 * @param {{id: string, format: string, path: string, alias?: string}} service corpus entry
 * @param {Record<string, object[]>} resources the generated rows
 * @returns {object[]} the items
 */
function itemsOf(service, resources) {
    const content = readFileSync(service.path, 'utf8');
    const graph =
        service.format === 'csn'
            ? parseCsn(content, service.alias ? { alias: service.alias } : {})
            : parseEdmx(content);
    const items = [];
    const isFallback = standardFallbackTest(graph);
    for (const entity of graph.entities) {
        const rows = (resources[entity.entitySetName] ?? []).slice(0, shownRows);
        if (rows.length === 0) continue;
        const keys = entity.properties.filter((property) => property.isKey);
        const others = entity.properties.filter((property) => !property.isKey);
        const width = Math.max(1, columnsPerItem - keys.length);
        for (let start = 0; start === 0 || start < others.length; start += width) {
            const properties = [...keys, ...others.slice(start, start + width)];
            items.push({
                service: service.id,
                entitySet: entity.entitySetName,
                payload: {
                    entity: entity.entitySetName,
                    columns: properties.map((property) => ({
                        name: property.name,
                        ...(property.label ? { label: property.label } : {}),
                        type: property.primitiveType
                    })),
                    rows: rows.map((row) =>
                        Object.fromEntries(
                            properties.map((property) => [
                                property.name,
                                isFallback(row[property.name]) ? null : shown(row[property.name])
                            ])
                        )
                    )
                }
            });
        }
    }
    return items;
}

/**
 * One chat completion with bounded, exponentially backed-off retries.
 *
 * @param {object[]} messages the chat messages
 * @param {string} model the judge model
 * @returns {Promise<string>} the reply text
 */
async function complete(messages, model) {
    for (let attempt = 1; ; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(`${PROXY}/chat/completions`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LITELLM_API_KEY}` },
                body: JSON.stringify({
                    model,
                    temperature: 0,
                    messages,
                    response_format: { type: 'json_object' }
                }),
                signal: controller.signal
            });
            if (!response.ok) {
                if (attempt < MAX_ATTEMPTS && RETRYABLE_STATUS.has(response.status)) {
                    throw Object.assign(new Error(`HTTP ${response.status}`), { retryable: true });
                }
                throw new Error(`HTTP ${response.status}`);
            }
            const body = await response.json();
            return String(body.choices?.[0]?.message?.content ?? '');
        } catch (error) {
            const retryable = error?.retryable || error?.name === 'AbortError' || error?.cause?.code === 'ECONNRESET';
            if (!retryable || attempt >= MAX_ATTEMPTS) throw error;
            await new Promise((done) => setTimeout(done, 2 ** attempt * 1_000));
        } finally {
            clearTimeout(timer);
        }
    }
}

/**
 * The verdict on one item, from the cache or the judge; checked against the item's columns.
 *
 * @param {object} item the item
 * @param {Map<string, object>} cache cached verdicts by key
 * @param {string} model the judge model
 * @returns {Promise<object>} the verdict
 */
async function judge(item, cache, model) {
    const text = JSON.stringify(item.payload);
    const key = sha(`${model}\n${PROTOCOL}\n${text}`);
    const cached = cache.get(key);
    if (cached) return cached;
    const reply = await complete(
        [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: JSON.stringify({ items: [{ itemId: 'i0', ...item.payload }] }) }
        ],
        model
    );
    const verdict = JSON.parse(reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1)).items?.[0];
    const names = item.payload.columns.map(({ name }) => name);
    if (!verdict || names.some((name) => ![0, 1].includes(verdict.columns?.[name]))) {
        throw new Error(`incomplete verdict for ${item.service} ${item.entitySet}`);
    }
    const checked = {
        key,
        columns: Object.fromEntries(names.map((name) => [name, verdict.columns[name]])),
        reasons: verdict.reasons ?? {},
        contradictions: Array.isArray(verdict.contradictions) ? verdict.contradictions : []
    };
    cache.set(key, checked);
    appendFileSync(args.cache, `${JSON.stringify(checked)}\n`);
    return checked;
}

const corpus = JSON.parse(readFileSync(resolve(args.corpus), 'utf8'));
const cache = new Map(
    existsSync(args.cache)
        ? readFileSync(args.cache, 'utf8')
              .split('\n')
              .filter(Boolean)
              .map((line) => JSON.parse(line))
              .map((entry) => [entry.key, entry])
        : []
);
const items = corpus.flatMap((service) => {
    const path = join(resolve(args.rows), `${service.id}.rows.json`);
    return existsSync(path) ? itemsOf(service, JSON.parse(readFileSync(path, 'utf8'))) : [];
});
log('items', {
    services: corpus.length,
    items: items.length,
    cached: items.filter((item) => cache.has(sha(`${args.judge}\n${PROTOCOL}\n${JSON.stringify(item.payload)}`))).length
});

const results = [];
const failures = [];
let fallbackItems = 0;
let next = 0;
await Promise.all(
    Array.from({ length: concurrency }, async () => {
        while (next < items.length) {
            const item = items[next++];
            try {
                results.push({ item, verdict: await judge(item, cache, args.judge) });
            } catch (error) {
                if (args['fallback-judge']) {
                    try {
                        results.push({ item, verdict: await judge(item, cache, args['fallback-judge']) });
                        fallbackItems++;
                        continue;
                    } catch {
                        // Reported with the main judge's error.
                    }
                }
                failures.push({
                    service: item.service,
                    entitySet: item.entitySet,
                    error: String(error?.message ?? error)
                });
            }
            if ((results.length + failures.length) % 25 === 0)
                log('progress', { done: results.length, failed: failures.length, of: items.length });
        }
    })
);

// A field is judged once per item it appears in; keys repeat across chunks and count once, failing if any chunk failed them.
const fields = new Map();
const contradictions = [];
for (const { item, verdict } of results) {
    for (const [column, passed] of Object.entries(verdict.columns)) {
        const id = `${item.service}\u0000${item.entitySet}\u0000${column}`;
        const field = fields.get(id) ?? {
            service: item.service,
            entitySet: item.entitySet,
            property: column,
            passed: true
        };
        if (passed === 0) {
            field.passed = false;
            field.reason = verdict.reasons[column] ?? '';
            field.examples = item.payload.rows
                .map((row) => row[column])
                .filter((value) => value !== null && value !== '')
                .slice(0, 3);
        }
        fields.set(id, field);
    }
    contradictions.push(
        ...verdict.contradictions.map((entry) => ({ service: item.service, entitySet: item.entitySet, ...entry }))
    );
}
const all = [...fields.values()];
const failing = all.filter(({ passed }) => !passed);
const share = all.length === 0 ? 0 : (all.length - failing.length) / all.length;
const report = {
    protocol: PROTOCOL,
    judge: args.judge,
    fallbackJudge: args['fallback-judge'] ?? null,
    fallbackItems,
    services: corpus.length,
    items: items.length,
    judgedItems: results.length,
    failedItems: failures.length,
    fields: all.length,
    failingFields: failing.length,
    passingShare: Number(share.toFixed(4)),
    floor,
    passed: failures.length === 0 && share >= floor,
    failing,
    contradictions,
    failures
};
mkdirSync(resolve(args.out), { recursive: true });
writeFileSync(join(resolve(args.out), 'judge-report.json'), JSON.stringify(report, null, 1));
const lines = [
    `# Realism judge — ${args.judge} (${PROTOCOL})`,
    '',
    `${results.length}/${items.length} items judged${fallbackItems > 0 ? ` (${fallbackItems} by ${args['fallback-judge']} after ${args.judge} failed)` : ''}, ${failures.length} failed. Fields passing: ${all.length - failing.length} / ${all.length} (${(share * 100).toFixed(1)}%, floor ${(floor * 100).toFixed(0)}%). Row contradictions: ${contradictions.length}.`,
    '',
    `## Failing fields (first ${WORST_FIELDS})`,
    '',
    ...failing
        .slice(0, WORST_FIELDS)
        .map(
            (field) =>
                `- ${field.service} ${field.entitySet}.${field.property}: ${field.reason} — ${field.examples.map((value) => JSON.stringify(value)).join(', ')}`
        ),
    '',
    `## Row contradictions (first ${WORST_FIELDS})`,
    '',
    ...contradictions
        .slice(0, WORST_FIELDS)
        .map((entry) => `- ${entry.service} ${entry.entitySet} [${(entry.columns ?? []).join(', ')}]: ${entry.reason}`)
];
writeFileSync(join(resolve(args.out), 'judge-report.md'), `${lines.join('\n')}\n`);
log('done', {
    fields: all.length,
    failing: failing.length,
    passingShare: report.passingShare,
    contradictions: contradictions.length,
    failedItems: failures.length
});
process.exitCode = report.passed ? 0 : 1;
