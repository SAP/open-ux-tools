import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
    artifactRecord,
    mergeIsolatedReports,
    parseHeldOutPrompt,
    percentile,
    scoreClassifierPredictions,
    scoreSftCases,
    selectGovernedClassifierRows
} from '../../../../../scripts/mockserver-data-generator-evaluation/lib/evaluation.mjs';

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), 'mockgen-evaluation-test-'));
    temporaryDirectories.push(directory);
    return directory;
}

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe('model artifact evidence', () => {
    test('records exact bytes and checksum without disclosing a local path', () => {
        const file = join(temporaryDirectory(), 'model.onnx');
        writeFileSync(file, 'candidate');

        expect(artifactRecord('generator-int8', file)).toEqual({
            id: 'generator-int8',
            filename: 'model.onnx',
            bytes: 9,
            sha256: createHash('sha256').update('candidate').digest('hex')
        });
    });
});

describe('fixed pilot cohorts', () => {
    test('quarantines falsely labelled automated adjudication and keeps direct agreements', () => {
        const rows = [
            {
                hint: 'currency',
                adjudication: 'llm_agreement',
                propertyContext: { entity: 'Amount', property: 'currency', label: 'Currency', type: 'string' }
            },
            {
                hint: 'description',
                adjudication: 'human_adjudicated',
                adjudicationDetail: { humanRationale: 'Automated adjudication by explicit user instruction.' },
                propertyContext: { entity: 'Request', property: 'action', label: 'Action', type: 'enum' }
            },
            {
                hint: 'city',
                adjudication: 'human_adjudicated',
                adjudicationDetail: { humanRationale: 'Reviewed by a domain expert.' },
                propertyContext: { entity: 'Address', property: 'city', label: 'City', type: 'string' }
            }
        ];

        const selected = selectGovernedClassifierRows(rows);

        expect(selected.eligible).toEqual([rows[0], rows[2]]);
        expect(selected.quarantined).toEqual([rows[1]]);
    });

    test('turns a held-out pilot prompt into the production SFT request contract', () => {
        const parsed = parseHeldOutPrompt('northwind:Customer', {
            entitySet: 'Customer',
            domain: 'northwind',
            properties: ['CustomerID', 'CompanyName', 'CreditLimit', 'Blocked'],
            userPrompt:
                'Entity: Customer\nFields:\n' +
                '- CustomerID: string, [PRIMARY KEY], [required], maxLength=5\n' +
                '- CompanyName: string, [required], maxLength=40\n' +
                '- CreditLimit: decimal\n' +
                '- Blocked: bool\n'
        });

        expect(parsed).toEqual({
            id: 'northwind:Customer',
            domain: 'northwind',
            entityName: 'Customer',
            fields: [
                { name: 'CustomerID', primitiveType: 'string', nullable: false, maxLength: 5 },
                { name: 'CompanyName', primitiveType: 'string', nullable: false, maxLength: 40 },
                { name: 'CreditLimit', primitiveType: 'decimal', nullable: true },
                { name: 'Blocked', primitiveType: 'bool', nullable: true }
            ]
        });
    });
});

describe('candidate metrics', () => {
    test('merges process-isolated component reports without carrying worker metadata', () => {
        const merged = mergeIsolatedReports({ classifier: { metrics: { processMaxRssBytes: 10 } } }, [
            { sft: [{ candidate: 'int8', metrics: { processMaxRssBytes: 20 } }] },
            { sft: [{ candidate: 'int4', metrics: { processMaxRssBytes: 15 } }] }
        ]);

        expect(merged).toEqual({
            classifier: { metrics: { processMaxRssBytes: 10 } },
            sft: [
                { candidate: 'int8', metrics: { processMaxRssBytes: 20 } },
                { candidate: 'int4', metrics: { processMaxRssBytes: 15 } }
            ]
        });
    });

    test('uses the nearest-rank percentile method with stable edge handling', () => {
        expect(percentile([], 0.95)).toBeNull();
        expect(percentile([40, 10, 30, 20], 0.5)).toBe(20);
        expect(percentile([40, 10, 30, 20], 0.95)).toBe(40);
    });

    test('reports classifier accuracy, macro F1, routed precision, and coverage', () => {
        const metrics = scoreClassifierPredictions([
            { expected: 'currency', predicted: 'currency', confidence: 0.9, routeThreshold: 0.4 },
            { expected: 'city', predicted: 'description', confidence: 0.8, routeThreshold: 0.4 },
            { expected: 'city', predicted: 'city', confidence: 0.2, routeThreshold: 0.4 }
        ]);

        expect(metrics.total).toBe(3);
        expect(metrics.accuracy).toBeCloseTo(2 / 3);
        expect(metrics.macroF1).toBeCloseTo((1 + 2 / 3 + 0) / 3);
        expect(metrics.routedCoverage).toBeCloseTo(2 / 3);
        expect(metrics.routedPrecision).toBeCloseTo(1 / 2);
    });

    test('scores exact-key parsing, filled fields, failures, latency, and output fingerprint', () => {
        const metrics = scoreSftCases([
            {
                id: 'a',
                expectedKeys: ['ID', 'Name'],
                elapsedMs: 10,
                row: { ID: 'A-1', Name: 'Northwind' }
            },
            {
                id: 'b',
                expectedKeys: ['ID', 'Name'],
                elapsedMs: 30,
                row: { ID: 'B-1', Name: '' }
            },
            { id: 'c', expectedKeys: ['ID'], elapsedMs: 20, error: 'generation failed' }
        ]);

        expect(metrics).toMatchObject({
            total: 3,
            parsedCases: 2,
            exactKeyCases: 2,
            failedCases: 1,
            requestedFields: 5,
            filledFields: 3,
            parseRate: 2 / 3,
            exactKeyRate: 2 / 3,
            fillRate: 3 / 5,
            latencyMs: { p50: 20, p95: 30 }
        });
        expect(metrics.outputFingerprint).toMatch(/^[a-f\d]{64}$/);
    });
});
