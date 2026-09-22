import { mkdtemp, readFile, rm, writeFile, mkdir, symlink, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMockDataGenerator, generateProjectData, getMockDataGeneratorInfo } from '../../src/index.js';
import { actualExecutionMode, packagedRuntimeManifest } from '../../src/standalone.js';
import { parsePackagedModelManifest } from '../../src/model/packaged-models.js';
import type { MockDataGeneratorResult } from '../../src/types.js';

const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
    <EntityType Name="Record"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      <Property Name="Label" Type="Edm.String" Nullable="false" MaxLength="40"/>
    </EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`;

describe('standalone MockGen API', () => {
    test('projects the sole packaged v3 classifier through its matching runtime contract', async () => {
        const source = JSON.parse(await readFile('resources/models/manifest.json', 'utf8')) as Record<string, unknown>;
        const components = source.components as Array<Record<string, unknown>>;
        const classifier = components.find((component) => component.kind === 'classifier');
        if (!classifier) {
            throw new Error('Fixture classifier is missing');
        }
        classifier.contract = { ...(classifier.contract as Record<string, unknown>), inputFormat: 'v3' };
        const manifest = packagedRuntimeManifest(parsePackagedModelManifest(source));
        expect(manifest.components.find((component) => component.kind === 'classifier')?.runtime.outputFormat).toBe(
            'embedding-classifier-v3'
        );
    });

    test('does not silently map an unsupported packaged classifier contract to v2', async () => {
        const source = JSON.parse(await readFile('resources/models/manifest.json', 'utf8')) as Record<string, unknown>;
        const components = source.components as Array<Record<string, unknown>>;
        const classifier = components.find((component) => component.kind === 'classifier');
        if (!classifier) {
            throw new Error('Fixture classifier is missing');
        }
        classifier.contract = { ...(classifier.contract as Record<string, unknown>), inputFormat: 'v4' };
        expect(() => packagedRuntimeManifest(parsePackagedModelManifest(source))).toThrow(
            'Unsupported packaged classifier input format'
        );
    });

    test('does not call a ready but abstaining classifier a hybrid execution', () => {
        const result = {
            capabilities: { mode: 'semantic', classifier: 'ready', sft: 'ready' },
            statistics: {
                sft: {
                    attempts: 0,
                    parsedResponses: 0,
                    eligibleSlots: 0,
                    acceptedSlots: 0,
                    rejectedSlots: 0,
                    fallbackSlots: 0,
                    assignments: []
                }
            },
            routing: {
                totalFields: 1,
                metadataAccepted: 0,
                classifierAccepted: 0,
                lexicalAccepted: 0,
                conceptAccepted: 0,
                abstained: 1,
                providerBound: 0,
                detectedButUnbound: 0
            }
        } as MockDataGeneratorResult;
        expect(actualExecutionMode(result, 'auto')).toBe('deterministic');
    });

    test('reports the bundled model identity and requested readiness flag', () => {
        expect(getMockDataGeneratorInfo()).toMatchObject({
            apiVersion: 2,
            realismReady: true,
            model: {
                bundleId: 'mockgen-pilot-int8',
                classifier: expect.stringMatching(/^[a-f0-9]{64}$/u),
                sft: expect.stringMatching(/^[a-f0-9]{64}$/u)
            }
        });
    });

    test('generates and validates deterministic service data without native model allocation', async () => {
        const generator = await createMockDataGenerator({ executionMode: 'api' });
        try {
            const result = await generator.generateService(
                {
                    metadata: { format: 'edmx', content: metadata },
                    service: { urlPath: '/records', odataVersion: '4.0' },
                    targets: [{ name: 'Records', kind: 'entity-set' }],
                    existingData: {}
                },
                { mode: 'deterministic', seed: 1, rowsPerEntity: 2 }
            );

            expect(result.resources.Records).toHaveLength(2);
            expect(result.executionMode).toBe('deterministic');
            expect(result.realismReady).toBe(true);
            expect(result.validation).toMatchObject({ passed: true, formats: true, relationships: true });
            expect(result.validation.domainMeaning).not.toBe('evidence-verified');
            expect(result.routing).toMatchObject({
                totalFields: 2,
                metadataAccepted: expect.any(Number),
                classifierAccepted: 0,
                lexicalAccepted: expect.any(Number),
                conceptAccepted: 0,
                abstained: expect.any(Number),
                providerBound: expect.any(Number),
                detectedButUnbound: expect.any(Number)
            });
            expect(result.semanticCoverage).toEqual({
                eligibleFields: 2,
                routedFields: expect.any(Number),
                formatValidatedFields: expect.any(Number),
                structuralOnlyFields: expect.any(Number),
                unsupportedFields: expect.any(Number),
                evidenceVerifiedFields: 0,
                syntheticUnverifiedFields: expect.any(Number)
            });
            expect(result.semanticCoverage.routedFields + result.semanticCoverage.unsupportedFields).toBe(2);
            expect(result.semanticCoverage.formatValidatedFields).toBeLessThanOrEqual(
                result.semanticCoverage.routedFields
            );
        } finally {
            await generator.dispose();
        }
    });

    test('reports authored field values as evidence-backed without claiming other fields are domain-verified', async () => {
        const generator = await createMockDataGenerator({ executionMode: 'api' });
        try {
            const result = await generator.generateService(
                {
                    metadata: { format: 'edmx', content: metadata },
                    service: { urlPath: '/records', odataVersion: '4.0' },
                    targets: [{ name: 'Records', kind: 'entity-set' }],
                    existingData: {
                        Records: {
                            contributor: { present: false },
                            initialRows: { source: 'json', present: true, rows: [{ ID: 1, Label: 'Authored label' }] }
                        }
                    }
                },
                { mode: 'deterministic', seed: 1, rowsPerEntity: 1 }
            );
            expect(result.resources.Records[0]?.Label).toBe('Authored label');
            expect(result.semanticCoverage.evidenceVerifiedFields).toBeGreaterThanOrEqual(1);
            expect(result.validation.domainMeaning).not.toBe('evidence-verified');
        } finally {
            await generator.dispose();
        }
    });

    test('does not report synthetic deterministic text as verified business-domain meaning', async () => {
        const generator = await createMockDataGenerator({ executionMode: 'api' });
        try {
            const report = await generator.inspectService(
                {
                    metadata: { format: 'edmx', content: metadata },
                    service: { urlPath: '/records', odataVersion: '4.0' },
                    targets: [{ name: 'Records', kind: 'entity-set' }],
                    existingData: {}
                },
                { mode: 'deterministic', seed: 1, rowsPerEntity: 1 }
            );
            expect(report.invariants.find(({ name }) => name === 'semantic-domains')).toMatchObject({
                passed: false,
                status: 'unverified'
            });
        } finally {
            await generator.dispose();
        }
    });

    test('replaces project JSON while preserving unrelated authored files', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mockgen-project-'));
        const dataDirectory = join(root, 'webapp', 'localService', 'mockdata');
        try {
            await mkdir(dataDirectory, { recursive: true });
            await writeFile(join(dataDirectory, 'Records.json'), '[{"ID":999}]');
            await writeFile(join(dataDirectory, 'Unrelated.json'), '[{"Keep":true}]');
            const result = await generateProjectData({
                projectRoot: root,
                dataDirectory: 'webapp/localService/mockdata',
                request: {
                    metadata: { format: 'edmx', content: metadata },
                    service: { urlPath: '/records', odataVersion: '4.0' },
                    targets: [{ name: 'Records', kind: 'entity-set' }],
                    existingData: {}
                },
                options: { mode: 'deterministic', seed: 1, rowsPerEntity: 2 }
            });
            expect(result.files).toEqual(['webapp/localService/mockdata/Records.json']);
            expect(JSON.parse(await readFile(join(dataDirectory, 'Records.json'), 'utf8'))).toHaveLength(2);
            expect(await readFile(join(dataDirectory, 'Unrelated.json'), 'utf8')).toBe('[{"Keep":true}]');
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    test('leaves project JSON unchanged when an evidence-poor linked domain lacks a verifier', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mockgen-project-'));
        const dataDirectory = join(root, 'webapp', 'localService', 'mockdata');
        const original = '[{"Code":"original","Description":"authored"}]';
        try {
            await mkdir(dataDirectory, { recursive: true });
            await writeFile(join(dataDirectory, 'BookingStatus.json'), original);
            const travelMetadata = await readFile(new URL('./travel-v2.metadata.xml', import.meta.url), 'utf8');
            await expect(
                generateProjectData({
                    projectRoot: root,
                    dataDirectory: 'webapp/localService/mockdata',
                    request: {
                        metadata: { format: 'edmx', content: travelMetadata },
                        service: { urlPath: '/travel', odataVersion: '2.0' },
                        targets: [{ name: 'BookingStatus', kind: 'entity-set' }],
                        existingData: {}
                    },
                    options: { mode: 'deterministic', seed: 1, rowsPerEntity: 2 }
                })
            ).rejects.toThrow('SFT_CANDIDATE_VERIFIER_UNAVAILABLE');
            expect(await readFile(join(dataDirectory, 'BookingStatus.json'), 'utf8')).toBe(original);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    test('refuses unsafe output paths without changing original data', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mockgen-project-'));
        try {
            await writeFile(join(root, 'Records.json'), 'original');
            await expect(
                generateProjectData({
                    projectRoot: root,
                    dataDirectory: '..',
                    request: {
                        metadata: { format: 'edmx', content: metadata },
                        service: { urlPath: '/records', odataVersion: '4.0' },
                        targets: [{ name: 'Records', kind: 'entity-set' }],
                        existingData: {}
                    },
                    options: { mode: 'deterministic' }
                })
            ).rejects.toThrow(/directory/i);
            expect(await readFile(join(root, 'Records.json'), 'utf8')).toBe('original');
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    test('does not create files through a symlinked project parent', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mockgen-project-'));
        const outside = await mkdtemp(join(tmpdir(), 'mockgen-outside-'));
        try {
            await symlink(outside, join(root, 'webapp'));
            await expect(
                generateProjectData({
                    projectRoot: root,
                    dataDirectory: 'webapp/localService/mockdata',
                    request: {
                        metadata: { format: 'edmx', content: metadata },
                        service: { urlPath: '/records', odataVersion: '4.0' },
                        targets: [{ name: 'Records', kind: 'entity-set' }],
                        existingData: {}
                    },
                    options: { mode: 'deterministic' }
                })
            ).rejects.toThrow(/directory|link/i);
            expect(await readdir(outside)).toEqual([]);
        } finally {
            await rm(root, { recursive: true, force: true });
            await rm(outside, { recursive: true, force: true });
        }
    });
});
