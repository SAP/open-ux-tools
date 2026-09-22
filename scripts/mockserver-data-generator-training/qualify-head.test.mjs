import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT } from '../../packages/mock-data-generator/dist/semantics/field-context.js';
import { SEMANTIC_ROLE_REGISTRY_FINGERPRINT } from '../../packages/mock-data-generator/dist/semantics/role-registry.js';
import { assertReviewRecord, qualifyHead } from './lib/qualify-head.mjs';

const manifest = JSON.parse(
    await readFile(
        new URL('../../packages/mock-data-generator/resources/models/manifest.json', import.meta.url),
        'utf8'
    )
);
const classifier = manifest.components.find((component) => component.kind === 'classifier');
const encoderSha = classifier.files.find((file) => file.role === 'encoder').sha256;
const vocabularySha = classifier.files.find((file) => file.role === 'vocabulary').sha256;
const hex = (char) => char.repeat(64);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const labels = ['email', 'status', 'unknown'];
const head = {
    model: 'runtime-minilm-l6-v2-development-softmax',
    dim: 2,
    labels,
    coef: [
        [1, 0],
        [0, 1],
        [0.1, 0.1]
    ],
    intercept: [0, 0, 0],
    inputFormat: 'v3',
    maxWordPieceTokens: 64,
    encoderSha256: encoderSha,
    tokenizerSha256: vocabularySha,
    serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    registryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
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

test('qualifies only a gate-passing, fingerprint-consistent head and records machine provenance', () => {
    const qualified = qualifyHead({
        head,
        report,
        recomputedSealedFingerprint: hex('b'),
        manifest,
        reviewRecord,
        qualifiedAt: '2026-09-17T00:00:00.000Z'
    });
    assert.equal(qualified.qualification.status, 'qualified');
    assert.equal(qualified.qualification.labelProvenance.humanVerified, false);
    assert.deepEqual(qualified.qualification.sealedEvaluation, passingEvaluation);
});

test('refuses failing gates, fingerprint drift, stale reports and human-claimed provenance', () => {
    const base = { head, report, recomputedSealedFingerprint: hex('b'), manifest, reviewRecord, qualifiedAt: 'x' };
    assert.throws(
        () =>
            qualifyHead({
                ...base,
                report: { ...report, gate: { pass: false, failures: ['status recall below 90%'] } }
            }),
        /status recall/u
    );
    assert.throws(() => qualifyHead({ ...base, recomputedSealedFingerprint: hex('9') }), /fingerprint drift/u);
    assert.throws(() => qualifyHead({ ...base, report: { ...report, headSha256: hex('0') } }), /different head/u);
    assert.throws(() => assertReviewRecord({ ...reviewRecord, humanVerified: true }), /humanVerified false/u);
    assert.throws(
        () =>
            qualifyHead({
                ...base,
                head: {
                    ...head,
                    qualification: { ...head.qualification, partitionPolicyVersion: 'group-disjoint-v1-development' }
                }
            }),
        /family-disjoint/u
    );
    const weak = {
        ...report,
        sealedEvaluation: { ...passingEvaluation, unannotatedStatusFields: { correct: 20, total: 29 } }
    };
    assert.throws(() => qualifyHead({ ...base, report: weak }), /qualified classifier with passing sealed evidence/u);
});
