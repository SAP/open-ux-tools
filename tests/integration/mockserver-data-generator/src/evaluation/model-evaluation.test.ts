import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
    runtimeModuleDescriptor,
    resolveSftCandidates
} from '../../../../../scripts/mockserver-data-generator-evaluation/evaluate-pilot-models.mjs';
import {
    buildVocabularyCandidate,
    parseVocabularyArguments
} from '../../../../../scripts/mockserver-data-generator-evaluation/build-vocabulary-candidate.mjs';

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

    test('accepts a runtime candidate archive but reserves installed-runtime arguments for workers', () => {
        expect(
            parseArguments([
                '--pilot-root',
                '/pilot',
                '--output',
                '/report.json',
                '--runtime-tarball',
                '/runtime/onnxruntime-node.tgz'
            ])
        ).toMatchObject({ runtimeTarball: '/runtime/onnxruntime-node.tgz' });
        expect(() =>
            parseArguments([
                '--pilot-root',
                '/pilot',
                '--output',
                '/report.json',
                '--runtime-entry',
                '/runtime/dist/index.js',
                '--runtime-archive-sha256',
                'a'.repeat(64)
            ])
        ).toThrow('installed-runtime arguments are internal');
    });

    test('describes only an exact onnxruntime-node package with a contained regular entrypoint', () => {
        const root = temporaryDirectory();
        const dist = join(root, 'dist');
        mkdirSync(dist);
        writeFileSync(
            join(root, 'package.json'),
            '{"name":"onnxruntime-node","version":"1.24.3","main":"dist/index.js"}'
        );
        writeFileSync(join(dist, 'index.js'), 'module.exports = {};');

        expect(runtimeModuleDescriptor(root, 'b'.repeat(64))).toEqual({
            entry: realpathSync(join(dist, 'index.js')),
            binding: {
                package: 'onnxruntime-node',
                version: '1.24.3',
                archiveSha256: 'b'.repeat(64)
            }
        });

        const outside = join(temporaryDirectory(), 'outside.js');
        writeFileSync(outside, 'module.exports = {};');
        rmSync(join(dist, 'index.js'));
        symlinkSync(outside, join(dist, 'index.js'));
        expect(() => runtimeModuleDescriptor(root, 'b'.repeat(64))).toThrow(
            'runtime entrypoint must be a contained non-symbolic-link regular file'
        );
    });

    test('loads a path-portable candidate manifest and binds all external evidence', () => {
        const root = temporaryDirectory();
        const artifacts = join(root, 'artifacts');
        mkdirSync(artifacts);
        writeFileSync(join(artifacts, 'model.onnx'), 'model');
        writeFileSync(join(artifacts, 'tokenizer.json'), '{}');
        writeFileSync(join(artifacts, 'config.json'), '{}');
        writeFileSync(join(artifacts, 'generation-config.json'), '{"samplingOptions":{"maxNewTokens":400}}\n');
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
                    generationConfiguration: 'artifacts/generation-config.json',
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
                configuration: join(artifacts, 'config.json'),
                generationConfiguration: join(artifacts, 'generation-config.json')
            }
        });
        expect(candidate.binding.manifest).toMatchObject({ filename: 'candidate.json', bytes: expect.any(Number) });
        expect(candidate.binding.quantizationEvidence).toMatchObject({
            filename: 'quantization.json',
            bytes: 21
        });
        expect(candidate.binding.generationConfiguration).toMatchObject({
            filename: 'generation-config.json',
            bytes: 41
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

describe('vocabulary candidate builder', () => {
    /**
     * Return a minimal byte-level BPE fixture with one removable merge.
     *
     * @returns tokenizer fixture
     */
    function tokenizerFixture(): Record<string, unknown> {
        return {
            version: '1.0',
            ['added_tokens']: [{ id: 0, content: '<s>', special: true }],
            model: {
                type: 'BPE',
                vocab: { '<s>': 0, a: 1, b: 2, c: 3, ab: 4, abc: 5, bc: 6 },
                merges: [
                    ['a', 'b'],
                    ['ab', 'c'],
                    ['b', 'c']
                ]
            }
        };
    }

    test('builds a contiguous dependency closure that exactly preserves training tokenization', async () => {
        const root = temporaryDirectory();
        const tokenizer = join(root, 'tokenizer.json');
        const training = join(root, 'train.jsonl');
        const output = join(root, 'candidate');
        writeFileSync(tokenizer, `${JSON.stringify(tokenizerFixture())}\n`);
        writeFileSync(training, '{"text":"abc"}\n');

        const report = await buildVocabularyCandidate({
            tokenizer,
            trainingJsonl: training,
            output,
            policy: 'training-closure'
        });
        const candidate = JSON.parse(readFileSync(join(output, 'tokenizer.json'), 'utf8')) as {
            model: { vocab: Record<string, number>; merges: string[][] };
        };
        const mapping = JSON.parse(readFileSync(join(output, 'old-to-new-token-ids.json'), 'utf8')) as Record<
            string,
            number
        >;
        const repeat = await buildVocabularyCandidate({
            tokenizer,
            trainingJsonl: training,
            output: join(root, 'repeat'),
            policy: 'training-closure'
        });

        expect(candidate.model.vocab).toEqual({ '<s>': 0, a: 1, b: 2, c: 3, ab: 4, abc: 5 });
        expect(candidate.model.merges).toEqual([
            ['a', 'b'],
            ['ab', 'c']
        ]);
        expect(mapping).toEqual({ '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 });
        expect(report).toMatchObject({
            selection: { policy: 'training-closure', sourceVocabSize: 7, candidateVocabSize: 6 },
            verification: { exactRemapping: true, decodedTextExact: true, changedSequences: 0 }
        });
        expect(repeat.reportFingerprint).toBe(report.reportFingerprint);
        expect(repeat.artifacts).toEqual(report.artifacts);
        expect(JSON.stringify(report)).not.toContain(root);
        expect(JSON.stringify(report)).not.toContain('"text"');
    });

    test('uses pretrained rank without observing training token ids and proves byte-safe decomposition', async () => {
        const root = temporaryDirectory();
        const tokenizer = join(root, 'tokenizer.json');
        const training = join(root, 'train.jsonl');
        const output = join(root, 'candidate');
        writeFileSync(tokenizer, `${JSON.stringify(tokenizerFixture())}\n`);
        writeFileSync(training, '{"text":"abc"}\n');

        const report = await buildVocabularyCandidate({
            tokenizer,
            trainingJsonl: training,
            output,
            policy: 'pretrained-rank',
            targetVocabSize: 5
        });

        expect(report).toMatchObject({
            selection: {
                policy: 'pretrained-rank',
                observedTrainingTokenIds: 0,
                candidateVocabSize: 5
            },
            verification: { exactRemapping: false, decodedTextExact: true, changedSequences: 1 }
        });
    });

    test('supports an output below a symlinked temporary-directory parent', async () => {
        const root = temporaryDirectory();
        const actualParent = join(root, 'actual');
        const linkedParent = join(root, 'linked');
        mkdirSync(actualParent);
        symlinkSync(actualParent, linkedParent, 'dir');
        const tokenizer = join(root, 'tokenizer.json');
        const training = join(root, 'train.jsonl');
        writeFileSync(tokenizer, `${JSON.stringify(tokenizerFixture())}\n`);
        writeFileSync(training, '{"text":"abc"}\n');

        await expect(
            buildVocabularyCandidate({
                tokenizer,
                trainingJsonl: training,
                output: join(linkedParent, 'candidate'),
                policy: 'training-closure'
            })
        ).resolves.toMatchObject({ verification: { exactRemapping: true } });
        expect(readFileSync(join(actualParent, 'candidate', 'tokenizer.json'), 'utf8')).toContain('"vocab"');
    });

    test('rejects invalid programmatic policy and size-projection contracts', async () => {
        const root = temporaryDirectory();
        const tokenizer = join(root, 'tokenizer.json');
        const training = join(root, 'train.jsonl');
        writeFileSync(tokenizer, `${JSON.stringify(tokenizerFixture())}\n`);
        writeFileSync(training, '{"text":"abc"}\n');

        await expect(
            buildVocabularyCandidate({
                tokenizer,
                trainingJsonl: training,
                output: join(root, 'invalid-policy'),
                policy: 'future-policy'
            })
        ).rejects.toThrow('policy must be training-closure or pretrained-rank');
        await expect(
            buildVocabularyCandidate({
                tokenizer,
                trainingJsonl: training,
                output: join(root, 'invalid-size'),
                policy: 'training-closure',
                sizeProjection: { fixedModelBytes: 1 }
            })
        ).rejects.toThrow('sizeProjection must contain three positive safe integers');
    });

    test('rejects a target smaller than the mandatory dependency closure', async () => {
        const root = temporaryDirectory();
        const tokenizer = join(root, 'tokenizer.json');
        const training = join(root, 'train.jsonl');
        writeFileSync(tokenizer, `${JSON.stringify(tokenizerFixture())}\n`);
        writeFileSync(training, '{"text":"abc"}\n');

        await expect(
            buildVocabularyCandidate({
                tokenizer,
                trainingJsonl: training,
                output: join(root, 'candidate'),
                policy: 'training-closure',
                targetVocabSize: 5
            })
        ).rejects.toThrow('targetVocabSize 5 is smaller than mandatory closure 6');
    });

    test('parses a fully bound size projection without partial numeric values', () => {
        expect(
            parseVocabularyArguments([
                '--',
                '--tokenizer',
                '/model/tokenizer.json',
                '--training-jsonl',
                '/data/train.jsonl',
                '--output',
                '/candidate',
                '--policy',
                'training-closure',
                '--target-vocab-size',
                '10000',
                '--fixed-model-bytes',
                '68944179',
                '--bytes-per-vocabulary-row',
                '738',
                '--target-model-bytes',
                '82462493'
            ])
        ).toMatchObject({
            targetVocabSize: 10000,
            sizeProjection: { fixedModelBytes: 68944179, bytesPerVocabularyRow: 738, targetModelBytes: 82462493 }
        });
        expect(() =>
            parseVocabularyArguments([
                '--tokenizer',
                '/model/tokenizer.json',
                '--training-jsonl',
                '/data/train.jsonl',
                '--output',
                '/candidate',
                '--policy',
                'training-closure',
                '--target-vocab-size',
                '10junk'
            ])
        ).toThrow('--target-vocab-size must be a positive decimal integer');
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
