import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, test } from '@jest/globals';
import {
    assembleRealismProviderArtifact,
    prepareRealismReviewBatches
} from '../../../../../scripts/mockserver-data-generator-evaluation/lib/realism-review-batches.mjs';
import {
    compileRealismReviews,
    sealRealismEvidence
} from '../../../../../scripts/mockserver-data-generator-evaluation/lib/realism.mjs';
import { parseRealismReviewBatchArguments } from '../../../../../scripts/mockserver-data-generator-evaluation/realism-review-batches.mjs';

const SCRIPT = fileURLToPath(
    new URL('../../../../../scripts/mockserver-data-generator-evaluation/realism-review-batches.mjs', import.meta.url)
);

const domains = ['finance', 'sales', 'service', 'maintenance', 'master-data', 'non-sap'];

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function formatForDomainIndex(domainIndex: number): 'edmx-v2' | 'edmx-v4' | 'csn' {
    if (domainIndex < 2) {
        return 'edmx-v4';
    }
    return domainIndex < 4 ? 'csn' : 'edmx-v2';
}

function evidenceSource(): string {
    const fields = domains.flatMap((domain, domainIndex) =>
        Array.from({ length: 50 }, (_unused, fieldIndex) => ({
            fieldKey: `${domain}:service-${domainIndex}:Entity:Field${fieldIndex}`,
            domain,
            serviceId: `service-${domainIndex}`,
            format: formatForDomainIndex(domainIndex),
            entity: 'Entity',
            property: `Field${fieldIndex}`,
            primitiveType: 'string',
            label: `Field ${fieldIndex}`,
            facets: {},
            plannerSource: 'production-candidate',
            values: [`Value ${fieldIndex}`]
        }))
    );
    const evidence = sealRealismEvidence({
        version: 1,
        kind: 'mockserver-data-generator-realism-evidence',
        candidateFingerprint: sha256('candidate'),
        promptFingerprint: sha256('prompt'),
        outputSchemaFingerprint: sha256('schema'),
        selectionManifestFingerprint: sha256('manifest'),
        randomizationSeed: 113,
        targets: domains.map((domain, domainIndex) => ({
            domain,
            serviceId: `service-${domainIndex}`,
            format: formatForDomainIndex(domainIndex),
            provenance: 'public test fixture',
            schemaFingerprint: sha256(`schema-${domainIndex}`),
            resultFingerprint: sha256(`result-${domainIndex}`)
        })),
        fields,
        minimumReviewedFields: 300,
        coverageGaps: []
    });
    return `${JSON.stringify(evidence, null, 2)}\n`;
}

function providerArtifact(
    provider: string,
    requestedModel: string,
    inputSource: string,
    evidenceFingerprint: string,
    fieldKeys: string[],
    promptSource = 'prompt',
    schemaSource = 'schema'
): string {
    const base = {
        version: 1,
        provider,
        requestedModel,
        resolvedModels: [`${requestedModel}-resolved`],
        endpointClass: 'public-metadata-external',
        dataHandlingClass: 'public-metadata',
        runManifestFingerprint: sha256('run-manifest'),
        providerPolicyFingerprint: sha256('provider-policy'),
        promotionEligible: false,
        derivativeTrainingEligible: true,
        createdAt: '2026-09-04T12:00:00.000Z',
        costUsd: 0.1,
        promptFingerprint: sha256(promptSource),
        outputSchemaFingerprint: sha256(schemaSource),
        inputFingerprints: [sha256(inputSource)],
        rawResponseFingerprint: sha256(`${provider}:${inputSource}`),
        output: {
            version: 1,
            evidenceFingerprint,
            reviews: fieldKeys.map((fieldKey) => ({
                fieldKey,
                realistic: true,
                severity: 'none',
                reason: 'The generated value is realistic and usable.'
            }))
        }
    };
    return `${JSON.stringify({ ...base, fingerprint: sha256(JSON.stringify(base)) }, null, 2)}\n`;
}

describe('realism provider review batches', () => {
    test('has an import-safe CLI with strict prepare and assemble modes', () => {
        const result = spawnSync(
            process.execPath,
            ['--input-type=module', '--eval', `await import(${JSON.stringify(pathToFileURL(SCRIPT).href)})`],
            { encoding: 'utf8' }
        );
        const root = join(tmpdir(), 'mockserver-data-generator-review-batches');

        expect(result).toMatchObject({ status: 0, stderr: '' });
        expect(
            parseRealismReviewBatchArguments([
                '--prepare',
                '--evidence',
                join(root, 'evidence.json'),
                '--out-dir',
                join(root, 'batches'),
                '--maximum-fields-per-batch',
                '50'
            ])
        ).toEqual({
            mode: 'prepare',
            evidence: join(root, 'evidence.json'),
            outputDirectory: join(root, 'batches'),
            maximumFieldsPerBatch: 50
        });
        expect(
            parseRealismReviewBatchArguments([
                '--assemble',
                '--pilot-root',
                join(root, 'pilot'),
                '--evidence',
                join(root, 'evidence.json'),
                '--batch-manifest',
                join(root, 'batches', 'manifest.json'),
                '--provider-artifact',
                join(root, 'provider-001.json'),
                '--provider-artifact',
                join(root, 'provider-002.json'),
                '--out',
                join(root, 'provider.json')
            ])
        ).toEqual({
            mode: 'assemble',
            pilotRoot: join(root, 'pilot'),
            evidence: join(root, 'evidence.json'),
            batchManifest: join(root, 'batches', 'manifest.json'),
            providerArtifacts: [join(root, 'provider-001.json'), join(root, 'provider-002.json')],
            output: join(root, 'provider.json')
        });
        expect(() =>
            parseRealismReviewBatchArguments([
                '--prepare',
                '--evidence',
                'relative.json',
                '--out-dir',
                join(root, 'batches')
            ])
        ).toThrow('--evidence must be an absolute path');
        expect(() =>
            parseRealismReviewBatchArguments([
                '--prepare',
                '--evidence',
                join(root, 'evidence.json'),
                '--out-dir',
                join(root, 'batches'),
                '--unknown',
                'value'
            ])
        ).toThrow('Unknown argument: --unknown');
    });

    test('partitions every blinded field exactly once with deterministic lineage', () => {
        const source = evidenceSource();
        const first = prepareRealismReviewBatches(source, 50);
        const second = prepareRealismReviewBatches(source, 50);

        expect(first).toEqual(second);
        expect(first.batches).toHaveLength(6);
        expect(first.manifest).toMatchObject({
            kind: 'mockserver-data-generator-realism-review-batches',
            reviewedFields: 300,
            maximumFieldsPerBatch: 50,
            batchCount: 6,
            evidenceSourceFingerprint: sha256(source)
        });
        expect(
            first.batches.flatMap(({ value }) => value.fields.map(({ fieldKey }: { fieldKey: string }) => fieldKey))
        ).toEqual(JSON.parse(source).fields.map(({ fieldKey }: { fieldKey: string }) => fieldKey));
        expect(
            first.manifest.batches.map(({ inputFingerprint }: { inputFingerprint: string }) => inputFingerprint)
        ).toEqual(first.batches.map(({ source: batchSource }) => sha256(batchSource)));
    });

    test('rejects a tampered sealed evidence source', () => {
        const source = evidenceSource().replace('Value 1', 'Tampered value');

        expect(() => prepareRealismReviewBatches(source, 50)).toThrow('fingerprint');
    });

    test('assembles one complete lineage-bound provider artifact from validated batch artifacts', () => {
        const source = evidenceSource();
        const prepared = prepareRealismReviewBatches(source, 50);
        const evidence = JSON.parse(source) as { fingerprint: string };
        const artifacts = prepared.batches.map(({ source: batchSource, value }) =>
            providerArtifact(
                'google',
                'google/gemini-2.5-flash',
                batchSource,
                evidence.fingerprint,
                value.fields.map(({ fieldKey }: { fieldKey: string }) => fieldKey)
            )
        );
        const assembled = assembleRealismProviderArtifact(
            source,
            `${JSON.stringify(prepared.manifest, null, 2)}\n`,
            'prompt',
            'schema',
            artifacts
        );

        expect(assembled).toMatchObject({
            provider: 'google',
            requestedModel: 'google/gemini-2.5-flash',
            inputFingerprints: [sha256(source)],
            costUsd: 0.6,
            aggregation: {
                kind: 'mockserver-data-generator-provider-review-aggregation',
                batchManifestFingerprint: prepared.manifest.fingerprint,
                batchArtifactFingerprints: artifacts.map(sha256)
            },
            output: {
                evidenceFingerprint: evidence.fingerprint,
                reviews: expect.any(Array)
            }
        });
        expect(assembled.output.reviews).toHaveLength(300);

        const direct = providerArtifact(
            'openai',
            'gpt-5.5',
            source,
            evidence.fingerprint,
            JSON.parse(source).fields.map(({ fieldKey }: { fieldKey: string }) => fieldKey)
        );
        const report = compileRealismReviews(source, 'prompt', 'schema', [direct, JSON.stringify(assembled)]);
        expect(report).toMatchObject({ reviewedFields: 300, realisticRate: 1, passed: true });
    });

    test('rejects missing batches and mixed provider identities', () => {
        const source = evidenceSource();
        const prepared = prepareRealismReviewBatches(source, 50);
        const evidence = JSON.parse(source) as { fingerprint: string };
        const artifacts = prepared.batches.map(({ source: batchSource, value }, index) =>
            providerArtifact(
                index === 5 ? 'anthropic' : 'google',
                index === 5 ? 'claude-haiku' : 'google/gemini-2.5-flash',
                batchSource,
                evidence.fingerprint,
                value.fields.map(({ fieldKey }: { fieldKey: string }) => fieldKey)
            )
        );
        const manifestSource = `${JSON.stringify(prepared.manifest, null, 2)}\n`;

        expect(() =>
            assembleRealismProviderArtifact(source, manifestSource, 'prompt', 'schema', artifacts.slice(1))
        ).toThrow('exactly one artifact per review batch');
        expect(() => assembleRealismProviderArtifact(source, manifestSource, 'prompt', 'schema', artifacts)).toThrow(
            'same provider and requested model'
        );
    });

    test('rejects an unsealed provider artifact instead of resealing changed decisions', () => {
        const source = evidenceSource();
        const prepared = prepareRealismReviewBatches(source, 50);
        const evidence = JSON.parse(source) as { fingerprint: string };
        const artifacts = prepared.batches.map(({ source: batchSource, value }) =>
            providerArtifact(
                'google',
                'google/gemini-2.5-flash',
                batchSource,
                evidence.fingerprint,
                value.fields.map(({ fieldKey }: { fieldKey: string }) => fieldKey)
            )
        );
        const unsealed = JSON.parse(artifacts[0]) as Record<string, unknown>;
        delete unsealed.fingerprint;
        artifacts[0] = `${JSON.stringify(unsealed, null, 2)}\n`;

        expect(() =>
            assembleRealismProviderArtifact(
                source,
                `${JSON.stringify(prepared.manifest, null, 2)}\n`,
                'prompt',
                'schema',
                artifacts
            )
        ).toThrow('fingerprint is required');
    });

    test('rejects prompt and schema files that differ from the frozen evidence contract', () => {
        const source = evidenceSource();
        const prepared = prepareRealismReviewBatches(source, 50);
        const evidence = JSON.parse(source) as { fingerprint: string };
        const artifacts = prepared.batches.map(({ source: batchSource, value }) =>
            providerArtifact(
                'google',
                'google/gemini-2.5-flash',
                batchSource,
                evidence.fingerprint,
                value.fields.map(({ fieldKey }: { fieldKey: string }) => fieldKey),
                'different-prompt',
                'different-schema'
            )
        );
        const manifestSource = `${JSON.stringify(prepared.manifest, null, 2)}\n`;

        expect(() =>
            assembleRealismProviderArtifact(source, manifestSource, 'different-prompt', 'schema', artifacts)
        ).toThrow('prompt or output schema does not match');
        expect(() =>
            assembleRealismProviderArtifact(source, manifestSource, 'prompt', 'different-schema', artifacts)
        ).toThrow('prompt or output schema does not match');
    });
});
