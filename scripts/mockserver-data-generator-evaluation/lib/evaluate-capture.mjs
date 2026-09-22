import { createHash } from 'node:crypto';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { readApplicationContext } from './capture-app.mjs';

const CAPTURE_REPORT_VERSION = 1;
const CAPTURE_EVALUATION_VERSION = 1;
const SHA256 = /^[a-f0-9]{64}$/u;

function usage() {
    return [
        'Usage:',
        '  node scripts/mockserver-data-generator-evaluation/evaluate-capture.mjs \\',
        '    --capture <capture-output-dir> --output <report.json> [--app <original-app> --config <relative-yaml>]',
        '',
        'The report is privacy-safe: it records capture files, resource names, property names,',
        'row indexes, rule identifiers, and aggregate counts, but never row values.'
    ].join('\n');
}

export function parseArguments(argv) {
    const values = new Map();
    for (let index = 0; index < argv.length; index += 2) {
        const name = argv[index];
        const value = argv[index + 1];
        if (
            !['--capture', '--output', '--app', '--config'].includes(name) ||
            !value ||
            value.startsWith('--') ||
            values.has(name)
        ) {
            throw new TypeError(`${usage()}\nInvalid or duplicate evaluate-capture option ${name ?? '<missing>'}`);
        }
        values.set(name, value);
    }
    if (!values.has('--capture') || !values.has('--output')) {
        throw new TypeError(`${usage()}\nevaluate-capture requires --capture and --output`);
    }
    if (values.has('--app') !== values.has('--config')) {
        throw new TypeError('--app and --config must be supplied together');
    }
    return Object.freeze({
        capture: resolve(values.get('--capture')),
        output: resolve(values.get('--output')),
        ...(values.has('--app') ? { app: resolve(values.get('--app')), config: values.get('--config') } : {})
    });
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readRegularJson(path, label) {
    const details = await lstat(path);
    if (!details.isFile() || details.isSymbolicLink()) {
        throw new TypeError(`${label} must be a non-symbolic-link regular JSON file`);
    }
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
        throw new TypeError(
            `${label} must contain valid JSON: ${error instanceof Error ? error.message : 'unknown error'}`
        );
    }
}

function assertContainedFile(root, filename) {
    if (typeof filename !== 'string' || filename.length === 0 || isAbsolute(filename)) {
        throw new TypeError('Capture file names must be non-empty relative paths');
    }
    const path = resolve(root, filename);
    if (path !== root && !path.startsWith(`${root}${sep}`)) {
        throw new TypeError('Capture file resolves outside the capture directory');
    }
    return path;
}

function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function fingerprint(value) {
    return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function normalize(value) {
    return String(value)
        .replace(/[^a-z0-9]/giu, '')
        .toLowerCase();
}

function propertiesForRows(rows) {
    return [...new Set(rows.flatMap((row) => Object.keys(row)))];
}

function findProperty(properties, predicates) {
    return properties.find((property) => predicates.some((predicate) => predicate(normalize(property), property)));
}

function hasToken(name, token) {
    return name.includes(token);
}

function rowIssue(rule, resource, rowIndex, property, message) {
    return Object.freeze({ rule, resource, rowIndex, ...(property ? { property } : {}), message });
}

function captureIssue(rule, message, details = {}) {
    return Object.freeze({ rule, message, ...details });
}

function evaluateCountryRows(capture, resource, rows) {
    const issues = [];
    const unverified = [];
    const properties = propertiesForRows(rows);
    const decisions = new Map(
        (capture.inspection.fieldDecisions ?? [])
            .filter((decision) => decision.resource === resource)
            .map((decision) => [decision.property, decision])
    );
    const countries = properties.filter((name) => /country$/iu.test(name));
    const unverifiedProperties = new Set();
    for (const countryProperty of countries) {
        const prefix = countryProperty.slice(0, -7);
        const countryName = properties.find((name) => name.toLowerCase() === (prefix + 'CountryName').toLowerCase());
        for (const [index, row] of rows.entries()) {
            const code = row[countryProperty];
            if (typeof code !== 'string' || !/^[A-Z]{2}$/u.test(code)) {
                issues.push(
                    rowIssue('country-format', resource, index, countryProperty, 'Invalid country code format')
                );
                continue;
            }
            if (countryName) {
                const nameDecision = decisions.get(countryName);
                const codeDecision = decisions.get(countryProperty);
                const evidence = [nameDecision?.evidence, codeDecision?.evidence].filter(isPlainObject);
                const ownership = (capture.inspection.sourceOwnership ?? []).find(
                    (entry) => entry.resource === resource
                );
                if (ownership?.initialRows?.source === 'json' && ownership.initialRows.rowCount > 0) {
                    unverified.push(
                        captureIssue(
                            'authored-text-unverified',
                            'Authored country text is present but its row values are not available to the evaluator',
                            { resource, property: countryName }
                        )
                    );
                    continue;
                }
                const hasLocale = typeof capture.inspection.locale === 'string' && capture.inspection.locale.length > 0;
                const hasTextLink = evidence.some(
                    (entry) =>
                        (Array.isArray(entry.annotations) &&
                            entry.annotations.some((annotation) =>
                                /(?:common\.text|text|language|locale|value.?list)/iu.test(JSON.stringify(annotation))
                            )) ||
                        (isPlainObject(entry.links) &&
                            (typeof entry.links.valueListCollection === 'string' ||
                                (Array.isArray(entry.links.valueListMappings) &&
                                    entry.links.valueListMappings.length > 0) ||
                                (Array.isArray(entry.links.valueListParameters) &&
                                    entry.links.valueListParameters.length > 0)))
                );
                const hasExplicitRoles =
                    nameDecision?.acceptedRole === 'country_name' && codeDecision?.acceptedRole === 'country';
                if (!hasExplicitRoles || (!hasLocale && !hasTextLink)) {
                    if (!unverifiedProperties.has(countryName)) {
                        unverified.push(
                            captureIssue(
                                'localized-text-unverified',
                                'Country name cannot be checked without explicit semantic roles and locale or text-link evidence',
                                { resource, property: countryName }
                            )
                        );
                        unverifiedProperties.add(countryName);
                    }
                    continue;
                }
                const locales = hasLocale ? [capture.inspection.locale] : ['en', 'de', 'fr', 'it', 'cs'];
                const names = locales.map((locale) =>
                    new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' }).of(code)
                );
                if (!names.includes(row[countryName])) {
                    issues.push(
                        rowIssue(
                            'finance-country-name',
                            resource,
                            index,
                            countryName,
                            'Country name does not match explicit locale'
                        )
                    );
                }
            }
        }
    }
    return { issues, unverified };
}

function evaluateBankRows(resource, rows) {
    const issues = [];
    const properties = propertiesForRows(rows);
    const bics = properties.filter((name) => /bic$|swiftcode$|swift$/iu.test(name));
    for (const property of bics) {
        for (const [index, row] of rows.entries()) {
            const bic = row[property];
            if (typeof bic !== 'string' || !/^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/u.test(bic)) {
                issues.push(rowIssue('finance-bank-bic', resource, index, property, 'Invalid BIC format'));
            }
        }
    }
    return issues;
}

function evaluateFullNames(resource, rows) {
    const issues = [];
    const properties = propertiesForRows(rows);
    const firstProperty = findProperty(properties, [(name) => name.includes('firstname') || name === 'givenname']);
    const lastProperty = findProperty(properties, [
        (name) => name.includes('lastname') || name === 'familyname' || name === 'surname'
    ]);
    // Prefer an explicit full-name field. A broad `*name` match turns unrelated
    // fields such as BankName or FileName into a person-name assertion.
    const fullProperty =
        findProperty(properties, [(name) => name === 'fullname' || name === 'personfullname']) ??
        findProperty(properties, [(name) => name === 'name']);
    if (!firstProperty || !lastProperty || !fullProperty) {
        return issues;
    }
    for (const [rowIndex, row] of rows.entries()) {
        const first = row[firstProperty];
        const last = row[lastProperty];
        const full = row[fullProperty];
        if (
            typeof first === 'string' &&
            typeof last === 'string' &&
            typeof full === 'string' &&
            (!full.includes(first) || !full.includes(last))
        ) {
            issues.push(
                rowIssue(
                    'finance-full-name',
                    resource,
                    rowIndex,
                    fullProperty,
                    'Full name does not contain both first and last name'
                )
            );
        }
    }
    return issues;
}

function parseTemporal(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const milliseconds = Date.parse(value);
    return Number.isNaN(milliseconds) ? undefined : milliseconds;
}

function evaluateTemporalOrdering(resource, rows) {
    const issues = [];
    const properties = propertiesForRows(rows);
    const createdProperty = findProperty(properties, [
        (name) => ['createdat', 'createdon', 'creationdate', 'creationtimestamp'].includes(name)
    ]);
    const changedProperty = findProperty(properties, [
        (name) => ['changedat', 'changedon', 'modifiedat', 'modifiedon', 'lastchangedat'].includes(name)
    ]);
    if (!createdProperty || !changedProperty || createdProperty === changedProperty) {
        return issues;
    }
    for (const [rowIndex, row] of rows.entries()) {
        const created = parseTemporal(row[createdProperty]);
        const changed = parseTemporal(row[changedProperty]);
        if (created !== undefined && changed !== undefined && created > changed) {
            issues.push(
                rowIssue(
                    'temporal-ordering',
                    resource,
                    rowIndex,
                    changedProperty,
                    'Change timestamp is before creation timestamp'
                )
            );
        }
    }
    return issues;
}

function evaluateSemanticFormats(resource, rows) {
    const issues = [];
    for (const [rowIndex, row] of rows.entries()) {
        for (const [property, value] of Object.entries(row)) {
            const name = property.toLowerCase().replace(/[_-]/gu, '');
            if (value === null || value === undefined) {
                continue;
            }
            let valid = true;
            if (name.includes('iban')) {
                valid = typeof value === 'string' && /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/u.test(value);
                if (valid) {
                    // Streaming remainder is independent of the generator's BigInt implementation.
                    let remainder = 0;
                    for (const character of value.slice(4) + value.slice(0, 4)) {
                        const digits = /[A-Z]/u.test(character) ? String(character.charCodeAt(0) - 55) : character;
                        for (const digit of digits) {
                            remainder = (remainder * 10 + Number(digit)) % 97;
                        }
                    }
                    valid = remainder === 1;
                }
            } else if (name.includes('email') && !name.includes('type') && !name.includes('flag')) {
                valid = typeof value === 'string' && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(value);
            }
            if (!valid) {
                issues.push(
                    rowIssue(
                        'semantic-format',
                        resource,
                        rowIndex,
                        property,
                        'Value fails independent format validation'
                    )
                );
            }
        }
    }
    return issues;
}

function evaluateRelationshipMappings(capture, unverified) {
    const issues = [];
    const resources = { ...capture.authoredContext, ...capture.inspection.generatedValues };
    for (const relationship of capture.inspection.relationships ?? []) {
        const sourceRows = resources[relationship.fromResource];
        const targetRows = resources[relationship.toResource];
        if (!Array.isArray(sourceRows) || !Array.isArray(targetRows)) {
            const missingResource = !Array.isArray(sourceRows) ? relationship.fromResource : relationship.toResource;
            const ownership = (capture.inspection.sourceOwnership ?? []).find(
                (entry) => entry.resource === missingResource
            );
            if (ownership && !ownership.eligible) {
                unverified.push(
                    captureIssue(
                        'relationship-endpoint-unavailable',
                        'Relationship endpoint is outside the captured eligible resource scope',
                        { resource: missingResource }
                    )
                );
                continue;
            }
            issues.push(
                captureIssue('relationship-resource-missing', 'Relationship endpoint is absent from the capture', {
                    resource: missingResource
                })
            );
            continue;
        }
        if (!Array.isArray(relationship.mappings) || relationship.mappings.length === 0) {
            issues.push(captureIssue('relationship-contract', 'Relationship has no ordered property mappings'));
            continue;
        }
        const mappingsValid = relationship.mappings.every(
            (mapping) =>
                isPlainObject(mapping) &&
                typeof mapping.sourceProperty === 'string' &&
                typeof mapping.targetProperty === 'string'
        );
        if (!mappingsValid) {
            issues.push(captureIssue('relationship-contract', 'Relationship mapping properties are invalid'));
            continue;
        }
        // Preserve mapping order and distinguish an absent property from an explicit null.
        const key = (row, propertyNames) =>
            fingerprint(
                propertyNames.map((property) => ({
                    present: Object.hasOwn(row, property),
                    value: Object.hasOwn(row, property) ? row[property] : undefined
                }))
            );
        const targetKeys = new Set(
            targetRows.map((row) =>
                key(
                    row,
                    relationship.mappings.map(({ targetProperty }) => targetProperty)
                )
            )
        );
        for (const [rowIndex, row] of sourceRows.entries()) {
            const sourceKey = key(
                row,
                relationship.mappings.map(({ sourceProperty }) => sourceProperty)
            );
            const hasAllSourceProperties = relationship.mappings.every(({ sourceProperty }) =>
                Object.hasOwn(row, sourceProperty)
            );
            if (!hasAllSourceProperties || !targetKeys.has(sourceKey)) {
                issues.push(
                    rowIssue(
                        'relationship-mapping',
                        relationship.fromResource,
                        rowIndex,
                        relationship.mappings[0]?.sourceProperty,
                        `No matching target row in ${relationship.toResource}`
                    )
                );
            }
        }
    }
    return issues;
}

function evaluateChildCounts(capture, unverified) {
    const issues = [];
    const resources = capture.inspection.generatedValues ?? {};
    const incoming = new Map();
    for (const relationship of capture.inspection.relationships ?? []) {
        if (!Array.isArray(relationship.mappings) || relationship.mappings.length === 0) {
            continue;
        }
        const children = resources[relationship.fromResource] ?? [];
        const counts = new Map();
        for (const row of children) {
            const key = fingerprint(
                relationship.mappings.map(({ sourceProperty }) => ({
                    present: Object.hasOwn(row, sourceProperty),
                    value: Object.hasOwn(row, sourceProperty) ? row[sourceProperty] : undefined
                }))
            );
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const contexts = incoming.get(relationship.toResource) ?? [];
        contexts.push({ relationship, counts });
        incoming.set(relationship.toResource, contexts);
    }
    for (const [resource, rows] of Object.entries(resources)) {
        const properties = propertiesForRows(rows);
        const hasCountCandidate = properties.some(
            (property) =>
                /^(?:numberof|childcount$|haschildren$)/u.test(normalize(property)) ||
                /(?:Count|_count)$/u.test(property)
        );
        if (!hasCountCandidate) continue;
        const contexts = incoming.get(resource);
        if (!contexts) {
            continue;
        }
        if (contexts.length > 1) {
            unverified.push(
                captureIssue(
                    'ambiguous-child-count',
                    'Child count cannot be attributed when multiple relationships target the same resource',
                    { resource }
                )
            );
            continue;
        }
        const countProperty = findProperty(properties, [
            (name) => name === 'childcount' || name === 'numberofchildren'
        ]);
        const hasProperty = findProperty(properties, [
            (name) => name.startsWith('has') && !name.includes('draft') && !name.includes('active')
        ]);
        if (!countProperty && !hasProperty) {
            continue;
        }
        for (const [rowIndex, row] of rows.entries()) {
            for (const context of contexts) {
                const key = fingerprint(
                    context.relationship.mappings.map(({ targetProperty }) => ({
                        present: Object.hasOwn(row, targetProperty),
                        value: Object.hasOwn(row, targetProperty) ? row[targetProperty] : undefined
                    }))
                );
                const count = context.counts.get(key) ?? 0;
                if (countProperty && typeof row[countProperty] === 'number' && row[countProperty] !== count) {
                    issues.push(
                        rowIssue(
                            'child-count',
                            resource,
                            rowIndex,
                            countProperty,
                            'Child count does not match generated relationship rows'
                        )
                    );
                }
                if (hasProperty && typeof row[hasProperty] === 'boolean' && row[hasProperty] !== count > 0) {
                    issues.push(
                        rowIssue(
                            'child-has-flag',
                            resource,
                            rowIndex,
                            hasProperty,
                            'Has flag does not match generated relationship rows'
                        )
                    );
                }
            }
        }
    }
    return issues;
}

function evaluateValueListProjection(capture) {
    const issues = [];
    const resources = capture.inspection.generatedValues ?? {};
    const accepted = new Map(
        (capture.inspection.fieldDecisions ?? [])
            .filter((decision) => typeof decision.acceptedRole === 'string')
            .map((decision) => [`${decision.resource}:${decision.property}`, decision.acceptedRole])
    );
    for (const [resource, rows] of Object.entries(resources)) {
        const properties = propertiesForRows(rows);
        const codeTextPairs = [
            ['country', 'country_name'],
            ['region', 'region_name'],
            ['bank_name', 'bic']
        ];
        for (const [codeRole, textRole] of codeTextPairs) {
            const codeProperty = properties.find((property) => accepted.get(`${resource}:${property}`) === codeRole);
            const textProperty = properties.find((property) => accepted.get(`${resource}:${property}`) === textRole);
            if (!codeProperty || !textProperty) {
                continue;
            }
            for (const [rowIndex, row] of rows.entries()) {
                if (
                    row[codeProperty] === null ||
                    row[codeProperty] === undefined ||
                    row[textProperty] === null ||
                    row[textProperty] === undefined
                ) {
                    issues.push(
                        rowIssue(
                            'value-list-projection',
                            resource,
                            rowIndex,
                            textProperty,
                            'Projected value-list pair contains a missing value'
                        )
                    );
                }
            }
        }
    }
    return issues;
}

function validateCaptureEnvelope(capture, filename) {
    if (
        !isPlainObject(capture) ||
        capture.captureVersion !== CAPTURE_REPORT_VERSION ||
        !isPlainObject(capture.inspection)
    ) {
        throw new TypeError(`Capture ${filename} must be a captureVersion ${CAPTURE_REPORT_VERSION} envelope`);
    }
    if (capture.inspection.version !== 1 || !['legacy', 'semantic-v2'].includes(capture.inspection.pipeline)) {
        throw new TypeError(`Capture ${filename} contains an unsupported inspection contract`);
    }
    if (!isPlainObject(capture.inspection.generatedValues)) {
        throw new TypeError(`Capture ${filename} must include generatedValues from an explicit local capture`);
    }
}

function evaluateEvidenceAvailability(capture) {
    const unverified = [];
    const inspection = capture.inspection;
    if (!Array.isArray(inspection.fieldDecisions)) {
        unverified.push(
            captureIssue('field-context-unavailable', 'Field decisions are unavailable; semantic claims are unverified')
        );
    }
    if (!Array.isArray(inspection.sourceOwnership)) {
        unverified.push(
            captureIssue(
                'source-ownership-unavailable',
                'Source ownership is unavailable; authored context is unverified'
            )
        );
    }
    for (const decision of inspection.fieldDecisions ?? []) {
        if (decision.providerState === 'unavailable' || decision.providerState === 'unknown') {
            unverified.push(
                captureIssue('semantic-evidence-unavailable', 'Semantic provider evidence is unavailable', {
                    resource: decision.resource,
                    property: decision.property
                })
            );
        }
    }
    return unverified;
}

function evaluateCapture(capture, filename) {
    validateCaptureEnvelope(capture, filename);
    const resources = capture.inspection.generatedValues;
    const unverified = evaluateEvidenceAvailability(capture);
    const issues = [
        ...Object.entries(resources).flatMap(([resource, rows]) =>
            Array.isArray(rows) && rows.length === 0
                ? [captureIssue('resource-non-empty', 'A requested generated resource is empty', { resource })]
                : []
        ),
        ...evaluateRelationshipMappings(capture, unverified),
        ...evaluateChildCounts(capture, unverified),
        ...evaluateValueListProjection(capture)
    ];
    for (const ownership of capture.inspection.sourceOwnership ?? []) {
        if (ownership.eligible && !Object.hasOwn(resources, ownership.resource)) {
            issues.push(
                captureIssue('resource-missing', 'An eligible resource is absent', { resource: ownership.resource })
            );
        }
    }
    for (const invariant of capture.inspection.invariants ?? []) {
        if (invariant.status === 'unverified') {
            unverified.push(
                captureIssue('reported-invariant-unverified', 'Generation could not verify an invariant', {
                    invariant: invariant.name
                })
            );
        } else if (invariant.status === 'failed' || (!invariant.status && invariant.passed === false)) {
            issues.push(
                captureIssue('reported-invariant', 'Generation reported a failed invariant', {
                    invariant: invariant.name
                })
            );
        }
    }
    for (const [resource, rows] of Object.entries(resources)) {
        if (!Array.isArray(rows)) {
            issues.push(captureIssue('generated-values-shape', 'Generated resource is not an array', { resource }));
            continue;
        }
        const countryResult = evaluateCountryRows(capture, resource, rows);
        issues.push(
            ...evaluateSemanticFormats(resource, rows),
            ...countryResult.issues,
            ...evaluateBankRows(resource, rows),
            ...evaluateFullNames(resource, rows),
            ...evaluateTemporalOrdering(resource, rows)
        );
        unverified.push(...countryResult.unverified);
    }
    return Object.freeze({
        file: filename,
        serviceIndex: capture.serviceIndex,
        scenario: capture.scenario,
        pipeline: capture.inspection.pipeline,
        resourceCount: Object.keys(resources).length,
        authoredContextResources: Object.keys(capture.authoredContext ?? {}).length,
        rowCount: Object.values(resources).reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0),
        issueCount: issues.length,
        unverifiedCount: unverified.length,
        unverified: Object.freeze(unverified),
        // A capture with unavailable evidence cannot pass semantic evaluation.
        passed: issues.length === 0 && unverified.length === 0,
        issues: Object.freeze(issues)
    });
}

async function writeJson(path, value) {
    await lstat(dirname(path));
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

export async function executeEvaluateCaptureCommand(argv) {
    const options = parseArguments(argv);
    const captureRoot = options.capture;
    const summary = await readRegularJson(resolve(captureRoot, 'capture-summary.json'), 'capture summary');
    if (!isPlainObject(summary) || summary.version !== 1 || !Array.isArray(summary.captures)) {
        throw new TypeError('capture-summary.json must be a version 1 capture summary');
    }
    if (!isPlainObject(summary.hashes) || typeof summary.hashes.app !== 'string' || !SHA256.test(summary.hashes.app)) {
        throw new TypeError('capture summary must bind the app hash');
    }
    const captures = [];
    for (const [index, entry] of summary.captures.entries()) {
        if (!isPlainObject(entry) || typeof entry.file !== 'string') {
            throw new TypeError(`capture summary entry ${index} must name a capture file`);
        }
        const capture = await readRegularJson(assertContainedFile(captureRoot, entry.file), `capture ${entry.file}`);
        validateCaptureEnvelope(capture, entry.file);
        capture.authoredContext =
            options.app && capture.scenario === 'source-precedence'
                ? await readApplicationContext(options.app, options.config, capture, summary.hashes.app)
                : undefined;
        captures.push(evaluateCapture(capture, entry.file));
    }
    const report = Object.freeze({
        version: CAPTURE_EVALUATION_VERSION,
        command: 'mockgen:evaluate-capture',
        hashes: Object.freeze({ app: summary.hashes.app, report: fingerprint(captures) }),
        captureCount: captures.length,
        issueCount: captures.reduce((total, capture) => total + capture.issueCount, 0),
        unverifiedCount: captures.reduce((total, capture) => total + capture.unverifiedCount, 0),
        passed: captures.length > 0 && captures.every((capture) => capture.passed),
        captures: Object.freeze(captures)
    });
    await writeJson(options.output, report);
    return report;
}
