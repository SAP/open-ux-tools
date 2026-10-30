#!/usr/bin/env node

// Realism sweep: run the realism checks (dist/quality/realism.js) over a corpus of services and report, per check,
// how many fields and cells fail, with the worst fields and their example values. With a baseline report it fails
// when a gating check got worse; with --require-hard it fails while a hard check has any finding. The generator's
// realism guard withholds values the placeholder and name-leak checks would flag, so those checks pass by
// construction on generated rows: the cells it withheld are reported next to them, per field.
//
// Usage:
//   node scripts/realism-sweep.mjs --corpus FILE --out DIR [--rows DIR] [--profile editor|two-row] [--sft off|on|editor]
//                                  [--baseline REPORT] [--require-hard] [--package ROOT]
//
//   --corpus   JSON array of { id, format: 'edmx'|'csn', path, alias? }; defaults to $MOCKGEN_REALISM_CORPUS.
//              Corpus files list private services and stay outside the repository.
//   --rows     assess rows already generated (DIR/<id>.rows.json, as the regression harness writes them)
//              instead of generating them. Generated rows are saved to OUT/rows/ in the same form, so a later
//              version of the checks can assess them again.
//   --profile  editor: data-editor mode, 10 rows, seed 1 (default); two-row: api mode, 2 rows, seed 123.
//   --sft      off: no model answers (default); on: model budgets as in the regression harness; editor: the
//              data editor's model budget.
//   --package  package root whose dist/ is assessed (default: this package).
//
// The report records the build it assessed (realism-evidence.mjs) and its baseline; `check:release` reads the
// reports listed in $MOCKGEN_REALISM_REPORTS and refuses a release without a passing one per release profile.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { buildFingerprint } from './realism-evidence.mjs';

/**
 * Checks reported but never gating: a creation equal to its change, and a constant column, are legitimate in
 * real data (records never changed, a service with one company code), so they only describe the rows.
 */
const REPORT_ONLY_CHECKS = new Set(['temporal-identity', 'constant-column']);
const WITHHELD_DIAGNOSTIC = 'REALISM_VALUE_WITHHELD';
const WORST_FIELDS = 20;
const PROFILES = {
    'two-row': { executionMode: 'api', options: { rowsPerEntity: 2, seed: 123 } },
    editor: { executionMode: 'data-editor', options: { rowsPerEntity: 10, seed: 1 } }
};
const SFT = {
    off: { sftBudgetMs: 1, sftTimeoutMs: 30_000 },
    on: { sftBudgetMs: 120_000, sftTimeoutMs: 120_000, sftDeadlineMs: 600_000 },
    // The budget the data editor gives the model per service.
    editor: { sftBudgetMs: 30_000, sftTimeoutMs: 30_000 }
};

const { values: args } = parseArgs({
    options: {
        corpus: { type: 'string', default: process.env.MOCKGEN_REALISM_CORPUS },
        out: { type: 'string' },
        rows: { type: 'string' },
        profile: { type: 'string', default: 'editor' },
        sft: { type: 'string', default: 'off' },
        baseline: { type: 'string' },
        'require-hard': { type: 'boolean', default: false },
        package: { type: 'string', default: join(dirname(fileURLToPath(import.meta.url)), '..') }
    }
});
const profile = PROFILES[args.profile];
const sft = SFT[args.sft];
if (!args.corpus || !args.out || !profile || !sft) {
    console.error(
        'Usage: realism-sweep.mjs --corpus FILE --out DIR [--rows DIR] [--profile editor|two-row] [--sft off|on|editor] [--baseline REPORT] [--require-hard]'
    );
    process.exit(2);
}

const packageRoot = resolve(args.package);
const distModule = (path) => import(pathToFileURL(join(packageRoot, 'dist', path)).href);
const {
    assessRealism,
    REALISM_CHECKS_VERSION,
    REALISM_HARD_CHECKS: HARD_CHECKS
} = await distModule('quality/realism.js');
if (!HARD_CHECKS) {
    throw new TypeError(`${packageRoot} predates the realism hard checks; assess its rows with --rows instead`);
}
const { buildGeographyReferences } = await distModule('quality/geography-references.js');
const { parseEdmx } = await distModule('schema/edmx.js');
// Packages before the standard mock server fallback have no fallback values to count.
const standardFallbackTest = await distModule('spec/standard-mockserver.js').then(
    (module) => module.standardFallbackTest ?? (() => () => false),
    () => () => () => false
);
const { parseCsn } = await distModule('schema/csn.js');

const require = createRequire(import.meta.url);
const geography = buildGeographyReferences({
    timeZones: require('cldr-bcp47/bcp47/timezone.json').keyword.u.tz,
    callingCodes: require('libphonenumber-js/metadata.min.json').country_calling_codes
});

const corpus = JSON.parse(readFileSync(resolve(args.corpus), 'utf8'));
if (
    !Array.isArray(corpus) ||
    corpus.some((entry) => !entry?.id || !['edmx', 'csn'].includes(entry.format) || !entry.path)
) {
    throw new TypeError(`Corpus ${args.corpus} must be an array of { id, format: 'edmx'|'csn', path, alias? }`);
}
const out = resolve(args.out);
mkdirSync(out, { recursive: true });

/**
 * Parse a corpus service into the schema graph the checks read.
 *
 * @param {{format: string, alias?: string}} service corpus entry
 * @param {string} content metadata document
 * @returns {object} schema graph
 */
function graphOf(service, content) {
    return service.format === 'csn'
        ? parseCsn(content, service.alias ? { alias: service.alias } : {})
        : parseEdmx(content);
}

let generator;
/**
 * Generate rows for a service through the public API, the path the data editor uses.
 *
 * @param {{id: string, format: string, alias?: string}} service corpus entry
 * @param {string} content metadata document
 * @param {object} graph schema graph
 * @returns {Promise<{resources: Record<string, object[]>, withheld: Array<{field: string, cells: number}>}>} rows per
 * entity set, and the cells the realism guard withheld per field
 */
async function generate(service, content, graph) {
    if (!generator) {
        const api = await distModule('public.js');
        generator = await api.createMockDataGenerator({ executionMode: profile.executionMode });
    }
    const targets = [...new Set(graph.entities.map((entity) => entity.entitySetName))].map((name) => ({
        name,
        kind: 'entity-set'
    }));
    const result = await generator.generateService(
        {
            metadata: { format: service.format, content },
            service: {
                urlPath: `/${service.id}`,
                odataVersion: service.format === 'csn' ? '4.0' : '2.0',
                ...(service.alias ? { alias: service.alias } : {})
            },
            targets,
            existingData: {}
        },
        { mode: 'auto', ...profile.options, ...sft }
    );
    const withheld = (result.diagnostics ?? [])
        .filter(({ code }) => code === WITHHELD_DIAGNOSTIC)
        .map(({ target, message }) => ({ field: target, cells: Number.parseInt(message, 10) || 0 }));
    return { resources: result.resources, withheld };
}

/**
 * Non-key string cells of a service, how many of them are empty (null or the empty string) and how many hold
 * the standard mock server fallback (property name and row index): fields no tier knew a value for. Fewer
 * findings bought with more empty or fallback cells is no improvement, so all are reported.
 *
 * @param {object} graph schema graph
 * @param {Record<string, object[]>} resources rows per entity set
 * @returns {{cells: number, empty: number, fallback: number}} the counts
 */
function emptyStrings(graph, resources) {
    let cells = 0;
    let empty = 0;
    let fallback = 0;
    const isFallback = standardFallbackTest(graph);
    for (const entity of graph.entities) {
        const columns = entity.properties.filter(({ primitiveType, isKey }) => primitiveType === 'string' && !isKey);
        for (const row of resources[entity.entitySetName] ?? []) {
            for (const property of columns) {
                const value = row[property.name];
                cells++;
                empty += value === null || value === '' || value === undefined ? 1 : 0;
                fallback += isFallback(value) ? 1 : 0;
            }
        }
    }
    return { cells, empty, fallback };
}

const services = [];
const findings = [];
const withheldFields = [];
const empties = { cells: 0, empty: 0, fallback: 0 };
if (!args.rows) {
    mkdirSync(join(out, 'rows'), { recursive: true });
}
for (const service of corpus) {
    try {
        const content = readFileSync(service.path, 'utf8');
        const graph = graphOf(service, content);
        const rowsFile = args.rows ? join(resolve(args.rows), `${service.id}.rows.json`) : undefined;
        if (rowsFile && !existsSync(rowsFile)) {
            services.push({ id: service.id, status: 'no-rows' });
            continue;
        }
        const generated = rowsFile ? undefined : await generate(service, content, graph);
        const resources = generated ? generated.resources : JSON.parse(readFileSync(rowsFile, 'utf8'));
        withheldFields.push(...(generated?.withheld ?? []).map((entry) => ({ service: service.id, ...entry })));
        if (!rowsFile) {
            writeFileSync(join(out, 'rows', `${service.id}.rows.json`), JSON.stringify(resources));
        }
        const assessment = assessRealism({ graph, resources, geography });
        const counted = emptyStrings(graph, resources);
        empties.cells += counted.cells;
        empties.empty += counted.empty;
        empties.fallback += counted.fallback;
        services.push({
            id: service.id,
            status: 'ok',
            coverage: assessment.coverage,
            findings: assessment.findings.length
        });
        findings.push(...assessment.findings.map((finding) => ({ service: service.id, ...finding })));
    } catch (error) {
        services.push({ id: service.id, status: 'error', error: String(error?.message ?? error) });
    }
    process.stdout.write(`${service.id} ${services.at(-1).status}\n`);
}
await generator?.dispose?.();

const checks = {};
for (const { coverage } of services.filter(({ status }) => status === 'ok')) {
    for (const [check, { fields, cells }] of Object.entries(coverage)) {
        checks[check] ??= { fields: 0, cells: 0, failingFields: 0, failingCells: 0, services: 0 };
        checks[check].fields += fields;
        checks[check].cells += cells;
    }
}
for (const [check, total] of Object.entries(checks)) {
    const found = findings.filter((finding) => finding.check === check);
    total.failingFields = found.length;
    total.failingCells = found.reduce((sum, finding) => sum + finding.failingCells, 0);
    total.services = new Set(found.map((finding) => finding.service)).size;
}
const worst = Object.fromEntries(
    Object.keys(checks).map((check) => [
        check,
        findings
            .filter((finding) => finding.check === check)
            .sort(
                (left, right) =>
                    right.failingCells - left.failingCells || left.service.localeCompare(right.service, 'en')
            )
            .slice(0, WORST_FIELDS)
    ])
);

const regressions = [];
let baselineIdentity;
if (args.baseline) {
    const baseline = JSON.parse(readFileSync(resolve(args.baseline), 'utf8'));
    if (baseline.checksVersion !== REALISM_CHECKS_VERSION) {
        throw new TypeError(
            `Baseline ${args.baseline} used checks version ${baseline.checksVersion}, not ${REALISM_CHECKS_VERSION}; reassess its rows with --rows first`
        );
    }
    baselineIdentity = {
        packageVersion: baseline.packageVersion,
        profile: baseline.profile,
        checksVersion: baseline.checksVersion
    };
    for (const [check, total] of Object.entries(checks).filter(([check]) => !REPORT_ONLY_CHECKS.has(check))) {
        const before = baseline.checks?.[check];
        if (before && (total.failingCells > before.failingCells || total.failingFields > before.failingFields)) {
            regressions.push(
                `${check}: ${before.failingFields} fields/${before.failingCells} cells -> ${total.failingFields}/${total.failingCells}`
            );
        }
    }
}
const hardFailures = Object.entries(checks)
    .filter(([check, total]) => HARD_CHECKS.has(check) && total.failingFields > 0)
    .map(([check, total]) => `${check}: ${total.failingFields} fields, ${total.failingCells} cells`);
const errors = services.filter(({ status }) => status === 'error');
const withheld = {
    fields: withheldFields.length,
    cells: withheldFields.reduce((sum, entry) => sum + entry.cells, 0),
    worst: [...withheldFields]
        .sort((left, right) => right.cells - left.cells || left.service.localeCompare(right.service, 'en'))
        .slice(0, WORST_FIELDS)
};

const packageVersion = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version;
const report = {
    checksVersion: REALISM_CHECKS_VERSION,
    packageVersion,
    build: buildFingerprint(packageRoot),
    baseline: baselineIdentity,
    profile: args.rows ? `rows:${args.rows}` : `${args.profile}/sft-${args.sft}`,
    services: services.length,
    errors: errors.length,
    emptyStrings: empties,
    withheld,
    checks,
    hardFailures,
    regressions,
    worst,
    perService: services
};
writeFileSync(join(out, 'realism-report.json'), JSON.stringify(report, null, 1));
writeFileSync(
    join(out, 'realism-findings.jsonl'),
    findings.map((finding) => JSON.stringify(finding)).join('\n') + '\n'
);

const lines = [
    `# Realism sweep — ${packageVersion} (${report.profile})`,
    '',
    `${services.length} services, ${errors.length} errors. Empty non-key strings: ${empties.empty} / ${empties.cells}; standard fallback: ${empties.fallback}.`,
    `Withheld by the realism guard (placeholders and leaked names the hard checks then no longer see): ${withheld.cells} cells in ${withheld.fields} fields.`,
    '',
    '| Check | Fields failing / checked | Cells failing / checked | Services |',
    '|---|---|---|---|',
    ...Object.entries(checks).map(
        ([check, total]) =>
            `| ${check}${HARD_CHECKS.has(check) ? ' (hard)' : ''}${REPORT_ONLY_CHECKS.has(check) ? ' (report only)' : ''} | ${total.failingFields} / ${total.fields} | ${total.failingCells} / ${total.cells} | ${total.services} |`
    ),
    ''
];
if (withheld.worst.length > 0) {
    lines.push(`## withheld by the realism guard — worst ${withheld.worst.length}`, '');
    withheld.worst.forEach((entry) => lines.push(`- ${entry.service} ${entry.field}: ${entry.cells}`));
    lines.push('');
}
for (const [check, list] of Object.entries(worst).filter(([, list]) => list.length > 0)) {
    lines.push(`## ${check} — worst ${list.length}`, '');
    for (const finding of list) {
        const related = finding.related ? ` (with ${finding.related})` : '';
        lines.push(
            `- ${finding.service} ${finding.entitySet}.${finding.property}${related}: ${finding.failingCells}/${finding.checkedCells} — ${finding.examples.map((example) => JSON.stringify(example)).join(', ')}`
        );
    }
    lines.push('');
}
writeFileSync(join(out, 'realism-report.md'), lines.join('\n'));

console.log(lines.slice(0, 9 + Object.keys(checks).length).join('\n'));
for (const message of [
    ...errors.map(({ id, error }) => `error ${id}: ${error}`),
    ...regressions.map((line) => `worse ${line}`)
]) {
    console.error(message);
}
if (args['require-hard']) {
    hardFailures.forEach((line) => console.error(`hard ${line}`));
}
process.exitCode =
    errors.length > 0 || regressions.length > 0 || (args['require-hard'] && hardFailures.length > 0) ? 1 : 0;
