import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { readFileSync, statSync } from 'node:fs';

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

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

/**
 * Record portable evidence for one model artifact.
 *
 * @param {string} id Stable candidate identifier.
 * @param {string} file Absolute or relative artifact path.
 * @returns {{id: string, filename: string, bytes: number, sha256: string}}
 */
export function artifactRecord(id, file) {
    const content = readFileSync(file);
    return Object.freeze({
        id,
        filename: basename(file),
        bytes: statSync(file).size,
        sha256: sha256(content)
    });
}

function isVerifiedHumanAdjudication(row) {
    if (row.adjudication !== 'human_adjudicated') {
        return false;
    }
    const rationale = row.adjudicationDetail?.humanRationale;
    return typeof rationale === 'string' && !/automated adjudication/i.test(rationale);
}

/**
 * Separate rows whose recorded review method supports evaluation from unresolved rows.
 *
 * @param {ReadonlyArray<Record<string, any>>} rows Pilot classifier rows.
 * @returns {{eligible: ReadonlyArray<Record<string, any>>, quarantined: ReadonlyArray<Record<string, any>>}}
 */
export function selectGovernedClassifierRows(rows) {
    const eligible = [];
    const quarantined = [];
    for (const row of rows) {
        if (row.adjudication === 'llm_agreement' || isVerifiedHumanAdjudication(row)) {
            eligible.push(row);
        } else {
            quarantined.push(row);
        }
    }
    return Object.freeze({ eligible: Object.freeze(eligible), quarantined: Object.freeze(quarantined) });
}

function normalizePrimitiveType(value) {
    const type = value.toLowerCase();
    if (['boolean', 'bool'].includes(type)) {
        return 'bool';
    }
    if (['byte', 'decimal', 'double', 'float', 'number', 'single'].includes(type)) {
        return 'decimal';
    }
    if (['int', 'int16', 'int32', 'int64', 'integer'].includes(type)) {
        return 'int';
    }
    return 'string';
}

function parseField(line) {
    const match = /^-\s+([^:]+):\s*([^,\s]+)(.*)$/.exec(line.trim());
    if (!match) {
        return undefined;
    }
    const [, name, rawType, qualifiers] = match;
    const maxLength = /maxLength=(\d+)/.exec(qualifiers)?.[1];
    return Object.freeze({
        name: name.trim(),
        primitiveType: normalizePrimitiveType(rawType),
        nullable: !/\[required\]/i.test(qualifiers),
        ...(maxLength ? { maxLength: Number.parseInt(maxLength, 10) } : {})
    });
}

/**
 * Convert a pilot held-out prompt to the production package SFT input shape.
 *
 * @param {string} id Cohort case identifier.
 * @param {Record<string, any>} value Held-out prompt value.
 * @returns {{id: string, domain: string, entityName: string, fields: ReadonlyArray<Record<string, any>>}}
 */
export function parseHeldOutPrompt(id, value) {
    const fields = String(value.userPrompt ?? '')
        .split(/\r?\n/)
        .map(parseField)
        .filter((field) => field !== undefined);
    if (!value.entitySet || !value.domain || fields.length === 0) {
        throw new TypeError(`Held-out prompt ${id} is missing its entity, domain, or field contract`);
    }
    const propertyNames = Array.isArray(value.properties) ? value.properties : [];
    if (
        propertyNames.length > 0 &&
        (propertyNames.length !== fields.length || propertyNames.some((name, index) => name !== fields[index].name))
    ) {
        throw new TypeError(`Held-out prompt ${id} field order does not match its property inventory`);
    }
    return Object.freeze({
        id,
        domain: value.domain,
        entityName: value.entitySet,
        fields: Object.freeze(fields)
    });
}

/**
 * Nearest-rank percentile, returning null for an empty sample.
 *
 * @param {ReadonlyArray<number>} values Measurements.
 * @param {number} fraction Percentile from zero through one.
 * @returns {number | null}
 */
export function percentile(values, fraction) {
    if (values.length === 0) {
        return null;
    }
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
        throw new RangeError('Percentile fraction must be between zero and one');
    }
    const ordered = [...values].sort((left, right) => left - right);
    const rank = Math.max(1, Math.ceil(fraction * ordered.length));
    return ordered[rank - 1];
}

function divide(numerator, denominator) {
    return denominator === 0 ? null : numerator / denominator;
}

/**
 * Score exact and routed classifier behavior.
 *
 * @param {ReadonlyArray<{expected: string, predicted: string, confidence: number, routeThreshold?: number}>} predictions
 * @returns {Record<string, number | null>}
 */
export function scoreClassifierPredictions(predictions) {
    const labels = [...new Set(predictions.flatMap(({ expected, predicted }) => [expected, predicted]))].sort();
    const correct = predictions.filter(({ expected, predicted }) => expected === predicted).length;
    const f1 = labels.map((label) => {
        const truePositive = predictions.filter(
            ({ expected, predicted }) => expected === label && predicted === label
        ).length;
        const falsePositive = predictions.filter(
            ({ expected, predicted }) => expected !== label && predicted === label
        ).length;
        const falseNegative = predictions.filter(
            ({ expected, predicted }) => expected === label && predicted !== label
        ).length;
        return divide(2 * truePositive, 2 * truePositive + falsePositive + falseNegative) ?? 0;
    });
    const routed = predictions.filter(
        ({ confidence, routeThreshold }) => confidence >= (routeThreshold ?? Number.POSITIVE_INFINITY)
    );
    const routedCorrect = routed.filter(({ expected, predicted }) => expected === predicted).length;
    return Object.freeze({
        total: predictions.length,
        accuracy: divide(correct, predictions.length),
        macroF1: divide(
            f1.reduce((sum, value) => sum + value, 0),
            f1.length
        ),
        routedCoverage: divide(routed.length, predictions.length),
        routedPrecision: divide(routedCorrect, routed.length)
    });
}

function filled(value) {
    return value !== null && value !== undefined && (typeof value !== 'string' || value.trim().length > 0);
}

function exactKeys(row, expectedKeys) {
    return JSON.stringify(Object.keys(row)) === JSON.stringify(expectedKeys);
}

/**
 * Score SFT results without retaining generated values in the report.
 *
 * @param {ReadonlyArray<{id: string, expectedKeys: ReadonlyArray<string>, elapsedMs: number, row?: Record<string, any>, error?: string}>} cases
 * @returns {Record<string, any>}
 */
export function scoreSftCases(cases) {
    const parsed = cases.filter(({ row }) => row !== undefined);
    const exact = parsed.filter(({ row, expectedKeys }) => exactKeys(row, expectedKeys));
    const requestedFields = cases.reduce((sum, entry) => sum + entry.expectedKeys.length, 0);
    const filledFields = cases.reduce(
        (sum, entry) => sum + entry.expectedKeys.filter((key) => entry.row && filled(entry.row[key])).length,
        0
    );
    const latencies = cases.map(({ elapsedMs }) => elapsedMs);
    const outputEvidence = cases.map(({ id, expectedKeys, elapsedMs: _elapsedMs, error, row }) => ({
        id,
        expectedKeys,
        ...(error ? { error } : {}),
        ...(row ? { row } : {})
    }));
    return Object.freeze({
        total: cases.length,
        parsedCases: parsed.length,
        exactKeyCases: exact.length,
        failedCases: cases.length - parsed.length,
        requestedFields,
        filledFields,
        parseRate: divide(parsed.length, cases.length),
        exactKeyRate: divide(exact.length, cases.length),
        fillRate: divide(filledFields, requestedFields),
        latencyMs: Object.freeze({ p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) }),
        outputFingerprint: sha256(canonicalJson(outputEvidence))
    });
}

/**
 * Merge the useful component payloads emitted by process-isolated workers.
 *
 * @param {Record<string, any> | undefined} classifierReport Classifier worker report.
 * @param {ReadonlyArray<Record<string, any>>} sftReports SFT worker reports.
 * @returns {{classifier?: Record<string, any>, sft?: ReadonlyArray<Record<string, any>>}}
 */
export function mergeIsolatedReports(classifierReport, sftReports) {
    return Object.freeze({
        ...(classifierReport?.classifier ? { classifier: classifierReport.classifier } : {}),
        ...(sftReports.length > 0 ? { sft: Object.freeze(sftReports.flatMap((report) => report.sft ?? [])) } : {})
    });
}
