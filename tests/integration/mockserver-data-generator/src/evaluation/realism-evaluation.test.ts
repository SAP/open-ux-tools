import { createHash } from 'node:crypto';
import { describe, expect, test } from '@jest/globals';
import {
    compileRealismReviews,
    sealRealismEvidence
} from '../../../../../scripts/mockserver-data-generator-evaluation/lib/realism.mjs';

const domainCoverage = [
    { domain: 'finance', fields: 60, format: 'edmx-v4' },
    { domain: 'sales', fields: 70, format: 'edmx-v4' },
    { domain: 'service', fields: 32, format: 'csn' },
    { domain: 'maintenance', fields: 18, format: 'csn' },
    { domain: 'master-data', fields: 60, format: 'edmx-v2' },
    { domain: 'non-sap', fields: 60, format: 'edmx-v2' }
];

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function evidencePayload() {
    const fields = domainCoverage.flatMap(({ domain, fields: fieldCount, format }, domainIndex) =>
        Array.from({ length: fieldCount }, (_unused, fieldIndex) => ({
            fieldKey: `${domain}:service-${domainIndex}:Entity:Field${fieldIndex}`,
            domain,
            serviceId: `service-${domainIndex}`,
            format,
            entity: 'Entity',
            property: `Field${fieldIndex}`,
            primitiveType: 'string',
            label: `Field ${fieldIndex}`,
            facets: {},
            plannerSource: 'production-candidate',
            values: [`Value ${fieldIndex}`]
        }))
    );
    return {
        version: 1,
        kind: 'mockserver-data-generator-realism-evidence',
        candidateFingerprint: sha256('candidate'),
        promptFingerprint: sha256('prompt'),
        outputSchemaFingerprint: sha256('schema'),
        selectionManifestFingerprint: sha256('manifest'),
        randomizationSeed: 113,
        targets: domainCoverage.map(({ domain, format }, domainIndex) => ({
            domain,
            serviceId: `service-${domainIndex}`,
            format,
            provenance: 'public test fixture',
            schemaFingerprint: sha256(`schema-${domainIndex}`),
            resultFingerprint: sha256(`result-${domainIndex}`)
        })),
        fields,
        minimumReviewedFields: 300,
        coverageGaps: []
    };
}

function providerArtifact(provider: string, evidenceSource: string, evidenceFingerprint: string, realistic = true) {
    const evidence = JSON.parse(evidenceSource) as ReturnType<typeof sealRealismEvidence>;
    return {
        version: 1,
        provider,
        requestedModel: `${provider}-model`,
        resolvedModels: [`${provider}-model-2026`],
        endpointClass: 'public-metadata-external',
        promptFingerprint: evidence.promptFingerprint,
        outputSchemaFingerprint: evidence.outputSchemaFingerprint,
        inputFingerprints: [sha256(evidenceSource)],
        output: {
            version: 1,
            evidenceFingerprint,
            reviews: evidence.fields.map((field: { fieldKey: string }) => ({
                fieldKey: field.fieldKey,
                realistic,
                severity: realistic ? 'none' : 'major',
                reason: realistic ? 'The value is usable.' : 'The value is not usable.'
            }))
        }
    };
}

describe('production realism evidence', () => {
    test('freezes deterministic blinded ordering and enforces six-domain V2/V4/CSN coverage', () => {
        const first = sealRealismEvidence(evidencePayload());
        const second = sealRealismEvidence(evidencePayload());

        expect(first).toEqual(second);
        expect(first.fields).toHaveLength(300);
        expect(first.fields.map((field: { presentationIndex: number }) => field.presentationIndex)).toEqual(
            Array.from({ length: 300 }, (_unused, index) => index)
        );
        expect(first.fields.map((field: { fieldKey: string }) => field.fieldKey)).not.toEqual(
            [...first.fields].map((field: { fieldKey: string }) => field.fieldKey).sort()
        );
        expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    });

    test('compiles exactly two lineage-bound providers and applies every realism stratum gate', () => {
        const evidence = sealRealismEvidence(evidencePayload());
        const evidenceSource = `${JSON.stringify(evidence, null, 2)}\n`;
        const report = compileRealismReviews(evidenceSource, 'prompt', 'schema', [
            JSON.stringify(providerArtifact('provider-a', evidenceSource, evidence.fingerprint)),
            JSON.stringify(providerArtifact('provider-b', evidenceSource, evidence.fingerprint))
        ]);

        expect(report).toMatchObject({
            reviewedFields: 300,
            realisticFields: 300,
            realisticRate: 1,
            criticalIssues: 0,
            disagreements: 0,
            passed: true
        });
        expect(report.domainMetrics).toMatchObject({
            finance: { reviewedFields: 60, realisticRate: 1 },
            sales: { reviewedFields: 70, realisticRate: 1 },
            service: { reviewedFields: 32, realisticRate: 1 },
            maintenance: { reviewedFields: 18, realisticRate: 1 }
        });
        expect(report.formatMetrics).toMatchObject({
            'edmx-v2': { reviewedFields: 120, realisticRate: 1 },
            'edmx-v4': { reviewedFields: 130, realisticRate: 1 },
            csn: { reviewedFields: 50, realisticRate: 1 }
        });
        expect(report).not.toHaveProperty('fields.0.values');
    });
});
