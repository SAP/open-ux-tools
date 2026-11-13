import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { assertReviewRecord, publicHead } from '../../training/common/public-artifact.mjs';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT, roleRegistryContract } from '../../training/common/runtime.mjs';
import { qualifyHead } from '../../training/role-head/qualify.mjs';

const manifest = JSON.parse(await readFile(new URL('../../resources/models/manifest.json', import.meta.url), 'utf8'));
const classifierFiles = manifest.components.find((component) => component.kind === 'classifier').files;
const hex = (character) => character.repeat(64);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const head = {
    model: 'runtime-minilm-l6-v2-development-softmax',
    dim: 2,
    labels: ['email', 'status', 'unknown'],
    coef: [
        [1, 0],
        [0, 1],
        [0.1, 0.1]
    ],
    intercept: [0, 0, 0],
    inputFormat: 'v3',
    maxWordPieceTokens: 64,
    encoderSha256: classifierFiles.find((file) => file.role === 'encoder').sha256,
    tokenizerSha256: classifierFiles.find((file) => file.role === 'vocabulary').sha256,
    serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    registryFingerprint: roleRegistryContract().fingerprint,
    abstentionLabels: ['unknown'],
    roleCalibration: { email: 0.5, status: 0.5 },
    familyCalibration: { contact: 0.5, status: 0.5 },
    calibrationSupport: {
        minimumCorrectPerRole: 5,
        minimumCorrectPerFamily: 10,
        roles: { email: 12, status: 30 },
        families: { contact: 12, status: 30 }
    },
    calibration: {
        temperature: 1,
        routeConfidenceThreshold: 0.5,
        annotationOverrideThreshold: 0.5,
        conformalQuantile: 0.5,
        coverage: 0.9,
        ece: { before: 0.1, after: 0.05 },
        source: 'test'
    },
    qualification: {
        status: 'unqualified',
        partitionPolicyVersion: 'family-disjoint-v2',
        artifactFingerprint: hex('a'),
        trainIds: ['t1'],
        calibrationIds: ['c1'],
        trainGroups: ['g1'],
        calibrationGroups: ['g2'],
        trainFamilies: ['f1'],
        calibrationFamilies: ['f2'],
        insufficientCalibrationRoles: [],
        insufficientCalibrationFamilies: []
    }
};
const passingEvaluation = {
    services: 19,
    domains: 8,
    acceptedRoles: { correct: 97, total: 100 },
    supportedFieldsWithoutMetadata: { correct: 80, total: 100 },
    unannotatedStatusFields: { correct: 41, total: 45 },
    unannotatedStatusServices: 19,
    unannotatedStatusDomains: 8,
    criticalFalsePositives: 0
};
const report = {
    headSha256: sha(JSON.stringify(head)),
    sealedDatasetFingerprint: hex('b'),
    sealedEvaluation: passingEvaluation,
    gate: { pass: true, failures: [] }
};
const reviewRecord = {
    format: 'mockgen-label-review-record',
    version: 1,
    method: 'model-panel-consensus',
    humanVerified: false,
    judges: [
        { model: 'm1', promptSha256: hex('c') },
        { model: 'm2', promptSha256: hex('c') }
    ],
    guidelineSha256: hex('d'),
    adjudicationSha256: hex('e'),
    consistencySha256: hex('f')
};
const base = {
    head,
    report,
    recomputedSealedFingerprint: hex('b'),
    manifest,
    reviewRecord,
    qualifiedAt: '2026-09-17T00:00:00.000Z'
};

describe('qualifyHead', () => {
    test('qualifies a gate-passing, fingerprint-consistent head with machine provenance', () => {
        // Given a passing report for exactly this head
        // When qualified
        const qualified = qualifyHead(base);
        // Then it is qualified, records the sealed counts and is not human-verified
        expect(qualified.qualification.status).toBe('qualified');
        expect(qualified.qualification.labelProvenance.humanVerified).toBe(false);
        expect(qualified.qualification.sealedEvaluation).toEqual(passingEvaluation);
    });

    test('refuses failing gates, drift, stale reports, human claims and weak status evidence', () => {
        // Given each broken input, then qualification refuses with a specific reason
        expect(() =>
            qualifyHead({
                ...base,
                report: { ...report, gate: { pass: false, failures: ['status recall below 90%'] } }
            })
        ).toThrow(/status recall/u);
        expect(() => qualifyHead({ ...base, recomputedSealedFingerprint: hex('9') })).toThrow(/fingerprint drift/u);
        expect(() => qualifyHead({ ...base, report: { ...report, headSha256: hex('0') } })).toThrow(/different head/u);
        expect(() => assertReviewRecord({ ...reviewRecord, humanVerified: true })).toThrow(/humanVerified false/u);
        const groupOnly = {
            ...head,
            qualification: { ...head.qualification, partitionPolicyVersion: 'group-disjoint-v1-development' }
        };
        expect(() => qualifyHead({ ...base, head: groupOnly })).toThrow(/family-disjoint/u);
        const weak = {
            ...report,
            sealedEvaluation: { ...passingEvaluation, unannotatedStatusFields: { correct: 20, total: 29 } }
        };
        expect(() => qualifyHead({ ...base, report: weak })).toThrow(
            /qualified classifier with passing sealed evidence/u
        );
    });
});

describe('publicHead', () => {
    test('strips every record identifier and keeps the rest of the qualification', () => {
        // Given a qualified head that still carries train, calibration and sealed identifiers
        const qualified = {
            ...qualifyHead(base),
            qualification: { ...qualifyHead(base).qualification, sealedIds: ['s1'] }
        };
        // When made public
        const stripped = publicHead(qualified);
        // Then no identifier list survives and the qualification evidence does
        for (const key of [
            'trainIds',
            'calibrationIds',
            'sealedIds',
            'trainGroups',
            'calibrationGroups',
            'trainFamilies',
            'calibrationFamilies'
        ]) {
            expect(stripped.qualification).not.toHaveProperty(key);
        }
        expect(stripped.qualification.sealedEvaluation).toEqual(passingEvaluation);
        expect(stripped.coef).toEqual(head.coef);
    });

    test('refuses a head that names a developer path', () => {
        // Given a head whose metadata contains a home directory, then publishing refuses
        expect(() => publicHead({ ...head, training: { source: '/home/someone/data.jsonl' } })).toThrow(
            /developer path/u
        );
    });
});
