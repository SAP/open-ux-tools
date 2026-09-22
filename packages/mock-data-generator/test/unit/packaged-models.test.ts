import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, realpath, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    assertPackagedClassifierHead,
    assertReleaseClassifier,
    assertReleaseRelevanceHead,
    verifyPackagedModels
} from '../../src/model/packaged-models.js';

describe('packaged model verification', () => {
    test('rejects an unqualified or contract-mismatched v3 head before native allocation', () => {
        expect(() => assertPackagedClassifierHead({ inputFormat: 'v3' }, 'v3')).toThrow(/qualified/);
        expect(() =>
            assertPackagedClassifierHead({ inputFormat: 'v3', qualification: { status: 'unqualified' } }, 'v3')
        ).toThrow(/qualified/);
        expect(() => assertPackagedClassifierHead({ inputFormat: 'v2' }, 'v3')).toThrow(/contract/);
        expect(() =>
            assertPackagedClassifierHead({ inputFormat: 'v3', qualification: { status: 'qualified' } }, 'v3')
        ).toThrow(/calibration support/);
        expect(() =>
            assertPackagedClassifierHead(
                {
                    inputFormat: 'v3',
                    qualification: { status: 'qualified' },
                    calibrationSupport: {
                        minimumCorrectPerRole: 5,
                        minimumCorrectPerFamily: 10,
                        roles: { email: 5 },
                        families: { contact: 10 }
                    }
                },
                'v3'
            )
        ).not.toThrow();
        expect(() =>
            assertPackagedClassifierHead(
                {
                    inputFormat: 'v3',
                    qualification: { status: 'qualified' },
                    calibrationSupport: {
                        minimumCorrectPerRole: 1,
                        minimumCorrectPerFamily: 1,
                        roles: { email: 1 },
                        families: { contact: 1 }
                    }
                },
                'v3'
            )
        ).toThrow(/calibration support/);
        expect(() => assertPackagedClassifierHead({ inputFormat: 'v2' }, 'v2')).not.toThrow();
    });

    test('requires one qualified v3 classifier with passing sealed evidence', () => {
        const component = {
            id: 'classifier',
            kind: 'classifier',
            contract: { inputFormat: 'v3' },
            files: [
                { role: 'encoder', sha256: 'a'.repeat(64) },
                { role: 'vocabulary', sha256: 'b'.repeat(64) }
            ]
        };
        const head = {
            inputFormat: 'v3',
            labels: ['unknown', 'email'],
            abstentionLabels: ['unknown'],
            encoderSha256: 'a'.repeat(64),
            tokenizerSha256: 'b'.repeat(64),
            calibrationSupport: {
                minimumCorrectPerRole: 5,
                minimumCorrectPerFamily: 10,
                roles: { email: 5 },
                families: { contact: 10 }
            },
            qualification: {
                status: 'qualified',
                partitionPolicyVersion: 'family-disjoint-v2',
                artifactFingerprint: 'c'.repeat(64),
                sealedDatasetFingerprint: 'd'.repeat(64),
                sealedEvaluation: {
                    services: 4,
                    domains: 2,
                    acceptedRoles: { correct: 95, total: 100 },
                    supportedFieldsWithoutMetadata: { correct: 70, total: 100 },
                    unannotatedStatusFields: { correct: 27, total: 30 },
                    unannotatedStatusServices: 4,
                    unannotatedStatusDomains: 2,
                    criticalFalsePositives: 0
                }
            }
        };
        expect(() => assertReleaseClassifier({ components: [component] }, head)).not.toThrow();
        expect(() =>
            assertReleaseClassifier(
                { components: [{ ...component, contract: { inputFormat: 'v2' } }] },
                { ...head, inputFormat: 'v2' }
            )
        ).toThrow(/one qualified classifier/u);
        expect(() =>
            assertReleaseClassifier(
                { components: [component] },
                { ...head, qualification: { ...head.qualification, partitionPolicyVersion: 'group-disjoint-v1' } }
            )
        ).toThrow(/one qualified classifier/u);
        expect(() =>
            assertReleaseClassifier({ components: [{ ...component, contract: { inputFormat: 'v2' } }] }, head)
        ).toThrow(/one qualified classifier/u);
        expect(() =>
            assertReleaseClassifier(
                { components: [{ ...component, contract: { inputFormat: 'v3' } }] },
                { ...head, inputFormat: 'v3', qualification: { ...head.qualification, status: 'unqualified' } }
            )
        ).toThrow(/one qualified classifier/u);
        expect(() =>
            assertReleaseClassifier(
                { components: [component] },
                {
                    ...head,
                    qualification: {
                        ...head.qualification,
                        sealedEvaluation: {
                            ...head.qualification.sealedEvaluation,
                            unannotatedStatusFields: { correct: 27, total: 29 }
                        }
                    }
                }
            )
        ).toThrow(/one qualified classifier/u);
        expect(() =>
            assertReleaseClassifier(
                { components: [component] },
                {
                    ...head,
                    qualification: {
                        ...head.qualification,
                        sealedEvaluation: { ...head.qualification.sealedEvaluation, unannotatedStatusServices: 3 }
                    }
                }
            )
        ).toThrow(/one qualified classifier/u);
        expect(() =>
            assertReleaseClassifier({ components: [component] }, { ...head, labels: ['unknown', 'REVIEW_ME'] })
        ).toThrow(/one qualified classifier/u);
        expect(() =>
            assertReleaseClassifier(
                { components: [component] },
                {
                    ...head,
                    qualification: {
                        ...head.qualification,
                        sealedEvaluation: {
                            ...head.qualification.sealedEvaluation,
                            unannotatedStatusFields: { correct: 0, total: 0 }
                        }
                    }
                }
            )
        ).toThrow(/one qualified classifier/u);
        expect(() => assertReleaseClassifier({ components: [component, component] }, head)).toThrow(
            /one qualified classifier/u
        );
    });

    test('requires a safe, non-degenerate relevance verifier on sealed candidates', () => {
        const qualification = {
            status: 'qualified',
            partitionPolicyVersion: 'service-disjoint-v1',
            trainingDataFingerprint: 'a'.repeat(64),
            calibrationDataFingerprint: 'b'.repeat(64),
            sealedDatasetFingerprint: 'c'.repeat(64),
            sealedEvaluation: {
                positives: 100,
                positiveAccepted: 80,
                hardNegatives: 100,
                hardNegativeAccepted: 1
            }
        };
        expect(() => assertReleaseRelevanceHead({ qualification })).not.toThrow();
        // A conservative verifier is allowed; one that accepts nothing at all is not.
        expect(() =>
            assertReleaseRelevanceHead({
                qualification: {
                    ...qualification,
                    sealedEvaluation: { ...qualification.sealedEvaluation, positiveAccepted: 5 }
                }
            })
        ).not.toThrow();
        expect(() =>
            assertReleaseRelevanceHead({
                qualification: {
                    ...qualification,
                    sealedEvaluation: { ...qualification.sealedEvaluation, positiveAccepted: 0 }
                }
            })
        ).toThrow(/relevance/u);
        expect(() =>
            assertReleaseRelevanceHead({
                qualification: {
                    ...qualification,
                    sealedEvaluation: { ...qualification.sealedEvaluation, hardNegativeAccepted: 2 }
                }
            })
        ).toThrow(/relevance/u);
        expect(() =>
            assertReleaseRelevanceHead({ qualification: { ...qualification, sealedEvaluation: undefined } })
        ).toThrow(/relevance/u);
    });

    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'mockgen-package-models-'));
        await mkdir(join(root, 'classifier'));
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    const manifest = (sha256: string) => ({
        formatVersion: 1,
        bundleId: 'test',
        revision: 'a'.repeat(64),
        runtime: { package: 'onnxruntime-node', version: '1.24.3' },
        components: [
            {
                id: 'classifier',
                kind: 'classifier',
                version: 'test',
                fingerprint: 'b'.repeat(64),
                license: 'Apache-2.0',
                modelCard: 'https://example.com/model',
                contract: { inputFormat: 'v2', inputs: ['input_ids'], outputs: ['last_hidden_state'] },
                files: [{ role: 'encoder', path: 'classifier/encoder.onnx', bytes: 3, sha256 }]
            }
        ]
    });

    test('returns verified paths for immutable regular files', async () => {
        const content = Buffer.from('abc');
        await writeFile(join(root, 'classifier', 'encoder.onnx'), content);
        const checksum = createHash('sha256').update(content).digest('hex');

        const result = await verifyPackagedModels(root, manifest(checksum));

        expect(result.ready).toBe(true);
        expect(result.files.get('classifier')?.get('encoder')).toBe(
            join(await realpath(root), 'classifier', 'encoder.onnx')
        );
    });

    test('rejects corrupt bytes before native allocation', async () => {
        await writeFile(join(root, 'classifier', 'encoder.onnx'), 'bad');

        const result = await verifyPackagedModels(root, manifest('c'.repeat(64)));

        expect(result.ready).toBe(false);
        expect(result.failures).toEqual([{ componentId: 'classifier', role: 'encoder', reason: 'checksum' }]);
    });

    test('rejects symlinked artifacts even when their contents match', async () => {
        const external = join(root, 'external.onnx');
        await writeFile(external, 'abc');
        await symlink(external, join(root, 'classifier', 'encoder.onnx'));
        const checksum = createHash('sha256').update('abc').digest('hex');

        const result = await verifyPackagedModels(root, manifest(checksum));

        expect(result.ready).toBe(false);
        expect(result.failures).toEqual([{ componentId: 'classifier', role: 'encoder', reason: 'not-file' }]);
    });
});
