import { mkdtemp, readFile, rm, writeFile, mkdir, symlink, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { packagedBanks } from '../../src/semantics/bank-store.js';
import { packagedSemanticRules } from '../../src/semantics/rule-store.js';
import { packagedRoleRegistry } from '../../src/semantics/role-registry.js';
import type { MockDataGeneratorResult } from '../../src/types.js';
import { mockStandaloneModelResources } from './synthetic-standalone-models.js';

const modelResources = await mockStandaloneModelResources();
const { createMockDataGenerator, generateProjectData, generateService, getMockDataGeneratorInfo, inspectService } =
    await import('../../src/public.js');
const {
    actualExecutionMode,
    assertRoleRegistryDeclared,
    assertSemanticRuleStoreDeclared,
    assertValueBankStoreDeclared
} = await import('../../src/standalone.js');
afterAll(modelResources.dispose);

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
    test('generates and inspects the same data through the one-shot public exports', async () => {
        const request = {
            metadata: { format: 'edmx' as const, content: metadata },
            service: { urlPath: '/records', odataVersion: '4.0' as const },
            targets: [{ name: 'Records', kind: 'entity-set' as const }],
            existingData: {}
        };
        const options = { mode: 'deterministic' as const, rowsPerEntity: 2, seed: 1 };
        const generated = await generateService(request, options);
        const inspection = await inspectService(request, options, { includeGeneratedValues: true });
        expect(inspection.generatedValues).toEqual(generated.resources);
        expect(inspection.hashes.request).toBe(generated.fingerprints.request);
        expect(inspection.pipeline).toBe('semantic-v2');
    });

    test('does not call a ready but abstaining classifier a hybrid execution', () => {
        const result: MockDataGeneratorResult = {
            resources: {},
            diagnostics: [],
            capabilities: { mode: 'semantic', classifier: 'ready', sft: 'ready' },
            fingerprints: { request: 'request-fingerprint' },
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
        };
        expect(actualExecutionMode(result, 'auto')).toBe('deterministic');
    });

    test('reports the API version hosts pin and the bundled model identity', () => {
        // Given the installed package
        // When a host reads the package information
        // Then API version 2 hosts find the fields they check, and the model identity
        expect(getMockDataGeneratorInfo()).toMatchObject({
            apiVersion: 2,
            realismReady: true,
            model: {
                bundleId: modelResources.manifest.bundleId,
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
            expect(modelResources.allocateNativeSession).not.toHaveBeenCalled();
        } finally {
            await generator.dispose();
        }
    });

    test('reports unresolved relationships when supplied rows reference rows that do not exist', async () => {
        // Given supplied books whose category is not among the supplied categories
        const catalog = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Catalog">
    <EntityType Name="Category"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
    </EntityType>
    <EntityType Name="Book"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      <Property Name="CategoryID" Type="Edm.Int32" Nullable="false"/>
      <NavigationProperty Name="category" Type="Catalog.Category" Nullable="false">
        <ReferentialConstraint Property="CategoryID" ReferencedProperty="ID"/>
      </NavigationProperty>
    </EntityType>
    <EntityContainer Name="Container">
      <EntitySet Name="Categories" EntityType="Catalog.Category"/>
      <EntitySet Name="Books" EntityType="Catalog.Book">
        <NavigationPropertyBinding Path="category" Target="Categories"/>
      </EntitySet>
    </EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`;
        const generator = await createMockDataGenerator({ executionMode: 'api' });
        try {
            // When the service is generated
            const result = await generator.generateService(
                {
                    metadata: { format: 'edmx', content: catalog },
                    service: { urlPath: '/catalog', odataVersion: '4.0' },
                    targets: [
                        { name: 'Categories', kind: 'entity-set' },
                        { name: 'Books', kind: 'entity-set' }
                    ],
                    existingData: {
                        Categories: {
                            contributor: { present: false },
                            initialRows: { source: 'json', present: true, rows: [{ ID: 101 }] }
                        },
                        Books: {
                            contributor: { present: false },
                            initialRows: { source: 'json', present: true, rows: [{ ID: 1, CategoryID: 999 }] }
                        }
                    }
                },
                { mode: 'deterministic', seed: 1, rowsPerEntity: 1 }
            );

            // Then the supplied rows are published as written and the relationships are reported unresolved
            expect(result.resources.Books).toEqual([{ ID: 1, CategoryID: 999 }]);
            expect(result.diagnostics).toContainEqual(
                expect.objectContaining({ code: 'SUPPLIED_REFERENCE_UNRESOLVED', target: 'Books.category' })
            );
            expect(result.validation.relationships).toBe(false);
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

    test('writes deterministic values with a warning when an evidence-poor linked domain lacks a verifier', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mockgen-project-'));
        const dataDirectory = join(root, 'webapp', 'localService', 'mockdata');
        try {
            await mkdir(dataDirectory, { recursive: true });
            const travelMetadata = await readFile(new URL('./travel-v2.metadata.xml', import.meta.url), 'utf8');
            const written = await generateProjectData({
                projectRoot: root,
                dataDirectory: 'webapp/localService/mockdata',
                request: {
                    metadata: { format: 'edmx', content: travelMetadata },
                    service: { urlPath: '/travel', odataVersion: '2.0' },
                    targets: [{ name: 'BookingStatus', kind: 'entity-set' }],
                    existingData: {}
                },
                options: { mode: 'deterministic', seed: 1, rowsPerEntity: 2 }
            });
            expect(written.generation.diagnostics).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'SFT_CANDIDATE_VERIFIER_UNAVAILABLE', target: 'BookingStatus' })
                ])
            );
            const rows = JSON.parse(await readFile(join(dataDirectory, 'BookingStatus.json'), 'utf8')) as unknown[];
            expect(rows).toHaveLength(2);
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

    test('requires the manifest to vouch for the value-bank store that was loaded', () => {
        const manifest = modelResources.manifest;
        expect(() => assertValueBankStoreDeclared(manifest)).not.toThrow();
        expect(manifest.datasets.find(({ id }) => id === 'mockgen-value-banks')?.sha256).toBe(packagedBanks().sha256);
        expect(() => assertValueBankStoreDeclared(manifest, '0'.repeat(64))).toThrow(
            'The loaded MockGen value-bank store does not match the package manifest'
        );
        expect(() => assertValueBankStoreDeclared({ ...manifest, datasets: [] })).toThrow(
            'The installed MockGen package does not declare its value-bank store'
        );
    });

    test('requires the manifest to vouch for the role registry that was loaded', () => {
        // Given the package manifest
        const manifest = modelResources.manifest;
        // Then it declares the loaded registry, and a different digest or a missing entry is rejected
        expect(() => assertRoleRegistryDeclared(manifest)).not.toThrow();
        expect(manifest.datasets.find(({ id }) => id === 'mockgen-role-registry')?.sha256).toBe(
            packagedRoleRegistry().sha256
        );
        expect(() => assertRoleRegistryDeclared(manifest, '0'.repeat(64))).toThrow(
            'The loaded MockGen role registry does not match the package manifest'
        );
        expect(() => assertRoleRegistryDeclared({ ...manifest, datasets: [] })).toThrow(
            'The installed MockGen package does not declare its role registry'
        );
    });

    test('requires the manifest to vouch for the semantic rule store that was loaded', () => {
        // Given the package manifest
        const manifest = modelResources.manifest;
        // Then it declares the loaded rule store, and a different digest or a missing entry is rejected
        expect(() => assertSemanticRuleStoreDeclared(manifest)).not.toThrow();
        expect(manifest.datasets.find(({ id }) => id === 'mockgen-semantic-rules')?.sha256).toBe(
            packagedSemanticRules().sha256
        );
        expect(() => assertSemanticRuleStoreDeclared(manifest, '0'.repeat(64))).toThrow(
            'The loaded MockGen semantic rule store does not match the package manifest'
        );
        expect(() => assertSemanticRuleStoreDeclared({ ...manifest, datasets: [] })).toThrow(
            'The installed MockGen package does not declare its semantic rule store'
        );
    });
});
