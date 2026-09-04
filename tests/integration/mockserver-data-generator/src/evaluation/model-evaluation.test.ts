import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import {
    loadSftCandidateManifest,
    parseArguments,
    resolveSftCandidates
} from '../../../../../scripts/mockserver-data-generator-evaluation/evaluate-pilot-models.mjs';

const temporaryDirectories: string[] = [];
const evaluationScript = fileURLToPath(
    new URL('../../../../../scripts/mockserver-data-generator-evaluation/evaluate-pilot-models.mjs', import.meta.url)
);

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

describe('evaluation CLI contract', () => {
    test.each([
        ['--max-sft-cases', '1junk'],
        ['--seed', '7junk']
    ])('rejects partial integer value %s %s', (argument, value) => {
        const result = spawnSync(
            process.execPath,
            [
                evaluationScript,
                '--pilot-root',
                '/tmp/mockgen-nonexistent-pilot',
                '--output',
                '/tmp/mockgen-nonexistent-report.json',
                argument,
                value
            ],
            { encoding: 'utf8' }
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`${argument} must be a decimal integer`);
    });

    test('uses custom manifests without silently running the fixed candidates', () => {
        const options = parseArguments([
            '--pilot-root',
            '/pilot',
            '--output',
            '/report.json',
            '--sft-candidate-manifest',
            '/candidate-a.json',
            '--sft-candidate-manifest',
            '/candidate-b.json'
        ]);

        expect(options.candidates).toEqual([]);
        expect(options.candidateManifests).toEqual(['/candidate-a.json', '/candidate-b.json']);
    });

    test('loads a path-portable candidate manifest and binds all external evidence', () => {
        const root = temporaryDirectory();
        const artifacts = join(root, 'artifacts');
        mkdirSync(artifacts);
        writeFileSync(join(artifacts, 'model.onnx'), 'model');
        writeFileSync(join(artifacts, 'tokenizer.json'), '{}');
        writeFileSync(join(artifacts, 'config.json'), '{}');
        writeFileSync(join(artifacts, 'quantization.json'), '{"algorithm":"gptq"}\n');
        const manifestPath = join(root, 'candidate.json');
        writeFileSync(
            manifestPath,
            `${JSON.stringify({
                schemaVersion: 1,
                candidate: 'gptq-int4-b32',
                artifacts: {
                    model: 'artifacts/model.onnx',
                    tokenizer: 'artifacts/tokenizer.json',
                    configuration: 'artifacts/config.json',
                    quantizationEvidence: 'artifacts/quantization.json'
                },
                calibration: 'representative',
                promotionEligible: true
            })}\n`
        );

        const candidate = loadSftCandidateManifest(manifestPath);

        expect(candidate).toMatchObject({
            id: 'gptq-int4-b32',
            source: 'external-manifest',
            calibration: 'representative',
            promotionEligible: true,
            paths: {
                model: join(artifacts, 'model.onnx'),
                tokenizer: join(artifacts, 'tokenizer.json'),
                configuration: join(artifacts, 'config.json')
            }
        });
        expect(candidate.binding.manifest).toMatchObject({ filename: 'candidate.json', bytes: expect.any(Number) });
        expect(candidate.binding.quantizationEvidence).toMatchObject({
            filename: 'quantization.json',
            bytes: 21
        });
    });

    test('rejects promotion eligibility for an uncalibrated low-precision candidate', () => {
        const root = temporaryDirectory();
        for (const filename of ['model.onnx', 'tokenizer.json', 'config.json']) {
            writeFileSync(join(root, filename), filename);
        }
        const manifestPath = join(root, 'candidate.json');
        writeFileSync(
            manifestPath,
            `${JSON.stringify({
                schemaVersion: 1,
                candidate: 'rtn-int4',
                artifacts: {
                    model: 'model.onnx',
                    tokenizer: 'tokenizer.json',
                    configuration: 'config.json'
                },
                calibration: 'none',
                promotionEligible: true
            })}\n`
        );

        expect(() => loadSftCandidateManifest(manifestPath)).toThrow(
            'Partially calibrated or uncalibrated SFT candidates cannot be promotion eligible'
        );
    });

    test('rejects promotion eligibility when only part of a candidate was calibrated', () => {
        const root = temporaryDirectory();
        for (const filename of ['model.onnx', 'tokenizer.json', 'config.json', 'quantization.json']) {
            writeFileSync(join(root, filename), filename);
        }
        const manifestPath = join(root, 'candidate.json');
        writeFileSync(
            manifestPath,
            `${JSON.stringify({
                schemaVersion: 1,
                candidate: 'hybrid-gptq-rtn-int4',
                artifacts: {
                    model: 'model.onnx',
                    tokenizer: 'tokenizer.json',
                    configuration: 'config.json',
                    quantizationEvidence: 'quantization.json'
                },
                calibration: 'partial',
                promotionEligible: true
            })}\n`
        );

        expect(() => loadSftCandidateManifest(manifestPath)).toThrow(
            'Partially calibrated or uncalibrated SFT candidates cannot be promotion eligible'
        );
    });

    test('requires external candidates to bind their creation evidence', () => {
        const root = temporaryDirectory();
        for (const filename of ['model.onnx', 'tokenizer.json', 'config.json']) {
            writeFileSync(join(root, filename), filename);
        }
        const manifestPath = join(root, 'candidate.json');
        writeFileSync(
            manifestPath,
            `${JSON.stringify({
                schemaVersion: 1,
                candidate: 'candidate-without-evidence',
                artifacts: {
                    model: 'model.onnx',
                    tokenizer: 'tokenizer.json',
                    configuration: 'config.json'
                },
                calibration: 'not-required',
                promotionEligible: false,
                ineligibilityReason: 'Size-screened candidate.'
            })}\n`
        );

        expect(() => loadSftCandidateManifest(manifestPath)).toThrow(
            'SFT candidate quantization evidence must be a non-empty string'
        );
    });

    test('rejects duplicate candidate identifiers before executing workers', () => {
        const root = temporaryDirectory();
        for (const candidateDirectory of ['a', 'b']) {
            const directory = join(root, candidateDirectory);
            mkdirSync(directory);
            for (const filename of ['model.onnx', 'tokenizer.json', 'config.json', 'quantization.json']) {
                writeFileSync(join(directory, filename), `${candidateDirectory}-${filename}`);
            }
            writeFileSync(
                join(directory, 'candidate.json'),
                `${JSON.stringify({
                    schemaVersion: 1,
                    candidate: 'same-candidate',
                    artifacts: {
                        model: 'model.onnx',
                        tokenizer: 'tokenizer.json',
                        configuration: 'config.json',
                        quantizationEvidence: 'quantization.json'
                    },
                    calibration: 'representative',
                    promotionEligible: true
                })}\n`
            );
        }

        expect(() =>
            resolveSftCandidates({
                pilotRoot: '/pilot',
                candidates: [],
                candidateManifests: [join(root, 'a/candidate.json'), join(root, 'b/candidate.json')]
            })
        ).toThrow('SFT candidate ids must be unique: same-candidate');
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
