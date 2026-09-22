import { generateService, inspectService, validateGeneratedResult } from '../../src/index.js';
import type { MockDataGeneratorOptions } from '../../src/types.js';
import { applyApplicationDomains, applySyntheticScenario } from '../../src/generation/scenario.js';
import { validateSampleDataset } from '../../src/semantics/sample-dataset.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import { applySemanticCoherence } from '../../src/generation/coherence.js';

const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema Namespace="Test" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityType Name="Account"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="BankCountry" Type="Edm.String" MaxLength="2"/><Property Name="Currency" Type="Edm.String" MaxLength="3"/><Property Name="CompanyCode" Type="Edm.String" MaxLength="4"/><Property Name="FirstName" Type="Edm.String" MaxLength="40"/></EntityType><EntityContainer Name="Container"><EntitySet Name="Accounts" EntityType="Test.Account"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`;
const request = {
    metadata: { format: 'edmx', content },
    service: { urlPath: '/test', odataVersion: '4.0' },
    targets: [{ name: 'Accounts', kind: 'entity-set' }],
    existingData: {}
} as const;

describe('application evidence and explicit synthetic providers', () => {
    it('preserves authored sentinel values instead of imposing a name-inferred email format', async () => {
        const sentinel = {
            ...request,
            metadata: {
                ...request.metadata,
                content: content.replace(
                    '<Property Name="FirstName" Type="Edm.String" MaxLength="40"/>',
                    `<Property Name="Email" Type="Edm.String" MaxLength="40"><Annotation Term="com.sap.vocabularies.Common.v1.ValueList"><Record><PropertyValue Property="CollectionPath" String="Emails"/><PropertyValue Property="Parameters"><Collection><Record><PropertyValue Property="LocalDataProperty" PropertyPath="Email"/><PropertyValue Property="ValueListProperty" String="Value"/></Record></Collection></PropertyValue></Record></Annotation></Property>`
                )
            },
            existingData: {
                Emails: {
                    contributor: { present: false as const },
                    initialRows: { source: 'json' as const, present: true as const, rows: [{ Value: 'N/A' }] }
                }
            }
        };
        const report = await inspectService(
            sentinel,
            { pipeline: 'semantic-v2', rowsPerEntity: 1 },
            {},
            { includeGeneratedValues: true }
        );
        expect(report.generatedValues?.Accounts[0].Email).toBe('N/A');
        expect(report.fieldDecisions.find(({ property }) => property === 'Email')?.acceptedRole).toBeUndefined();
        expect(report.diagnostics.some(({ code }) => code === 'SEMANTIC_ROLE_DOMAIN_CONFLICT')).toBe(true);
    });
    it('does not extend an explicit currency relationship to unrelated amounts', () => {
        const entity = {
            name: 'Record',
            entitySetName: 'Records',
            properties: [
                { name: 'Currency', primitiveType: 'string' as const, nullable: false, isKey: false, annotations: [] },
                {
                    name: 'Amount',
                    primitiveType: 'decimal' as const,
                    nullable: false,
                    isKey: false,
                    annotations: [{ term: 'Org.OData.Measures.V1.ISOCurrency', value: 'Currency' }],
                    links: { currency: 'Currency' }
                },
                {
                    name: 'OtherAmount',
                    primitiveType: 'decimal' as const,
                    nullable: false,
                    isKey: false,
                    annotations: []
                }
            ]
        };
        expect(applySemanticCoherence(entity, [{ Currency: 'JPY', Amount: 1.25, OtherAmount: 2.75 }], 1)).toEqual([
            { Currency: 'JPY', Amount: 1, OtherAmount: 2.75 }
        ]);
    });
    it('revalidates authored value-help domains when loading a cached result', async () => {
        const linked = {
            ...request,
            metadata: {
                ...request.metadata,
                content: content.replace(
                    '<Property Name="CompanyCode" Type="Edm.String" MaxLength="4"/>',
                    `<Property Name="CompanyCode" Type="Edm.String" MaxLength="4"><Annotation Term="com.sap.vocabularies.Common.v1.ValueList"><Record><PropertyValue Property="CollectionPath" String="Codes"/><PropertyValue Property="Parameters"><Collection><Record><PropertyValue Property="LocalDataProperty" PropertyPath="CompanyCode"/><PropertyValue Property="ValueListProperty" String="Code"/></Record></Collection></PropertyValue></Record></Annotation></Property>`
                )
            },
            existingData: {
                Codes: {
                    contributor: { present: false as const },
                    initialRows: { source: 'json' as const, present: true as const, rows: [{ Code: 'AUTH' }] }
                }
            }
        };
        const result = await generateService(linked, { pipeline: 'semantic-v2', rowsPerEntity: 1 });
        expect(result.resources.Accounts[0].CompanyCode).toBe('AUTH');
        expect(() =>
            validateGeneratedResult(
                linked,
                {
                    ...result,
                    resources: {
                        ...result.resources,
                        Accounts: result.resources.Accounts.map((row) => ({ ...row, CompanyCode: 'FAKE' }))
                    }
                },
                { pipeline: 'semantic-v2' }
            )
        ).toThrow();
    });
    it('validates a supplied IBAN domain without applying the mixed-country provider minimum length', async () => {
        const ibanRequest = {
            ...request,
            metadata: {
                ...request.metadata,
                content: content.replace(
                    'Name="CompanyCode" Type="Edm.String" MaxLength="4"',
                    'Name="IBAN" Type="Edm.String" MaxLength="22"'
                )
            }
        };
        const report = await inspectService(ibanRequest, {
            pipeline: 'semantic-v2',
            rowsPerEntity: 1,
            syntheticScenario: {
                id: 'declared-iban',
                version: '1',
                domains: { 'Accounts.IBAN': ['DE89370400440532013000'] }
            }
        });
        expect(report.fieldDecisions.find(({ property }) => property === 'IBAN')?.acceptedRole).toBe('iban');
    });
    it('rejects key and code domains hidden inside descriptive sample replacements', () => {
        expect(() =>
            validateSampleDataset({
                id: 'bad-keys',
                version: '1',
                firstNames: ['A'],
                lastNames: ['B'],
                organizations: ['C'],
                descriptions: ['D'],
                roleSamples: { country: ['US'] }
            })
        ).toThrow(/descriptive/iu);
    });
    it('does not invent business coherence rules from field names by default', () => {
        const entity = {
            name: 'Record',
            entitySetName: 'Records',
            properties: ['Status', 'StatusText'].map((name) => ({
                name,
                primitiveType: 'string' as const,
                nullable: false,
                isKey: false,
                annotations: []
            }))
        };
        const rows = [{ Status: 'O', StatusText: 'Outstanding' }];
        expect(applySemanticCoherence(entity, rows, 1)).toEqual(rows);
    });

    it('preserves every protected field when an explicit scenario applies a status rule', () => {
        const entity = {
            name: 'Record',
            entitySetName: 'Records',
            properties: ['Status', 'StatusText'].map((name) => ({
                name,
                primitiveType: 'string' as const,
                nullable: false,
                isKey: false,
                annotations: []
            }))
        };
        const rows = [{ Status: 'O', StatusText: 'Outstanding' }];
        expect(applySemanticCoherence(entity, rows, 1, new Set(['Status', 'StatusText']), ['status'])).toEqual(rows);
    });
    it('uses the declared key domain capacity instead of the former four-value catalog', async () => {
        const keyed = {
            ...request,
            metadata: {
                ...request.metadata,
                content: content.replace('<PropertyRef Name="ID"/>', '<PropertyRef Name="CompanyCode"/>')
            }
        };
        const result = await generateService(keyed, {
            pipeline: 'semantic-v2',
            rowsPerEntity: 6,
            syntheticScenario: {
                id: 'six-companies',
                version: '1',
                domains: { 'Accounts.CompanyCode': ['A001', 'A002', 'A003', 'A004', 'A005', 'A006'] }
            }
        });
        expect(result.resources.Accounts).toHaveLength(6);
        expect(new Set(result.resources.Accounts.map((row) => row.CompanyCode)).size).toBe(6);
    });
    it('binds an application-specific provider to authored value-help rows', () => {
        const graph = parseEdmx(content);
        const linked = {
            ...graph,
            entities: graph.entities.map((entity) => ({
                ...entity,
                properties: entity.properties.map((property) =>
                    property.name === 'CompanyCode'
                        ? {
                              ...property,
                              links: {
                                  valueListCollection: 'Codes',
                                  valueListMappings: [{ localProperty: 'CompanyCode', valueListProperty: 'Code' }]
                              }
                          }
                        : property
                )
            }))
        };
        const bound = applyApplicationDomains(
            linked,
            {
                Codes: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [{ Code: 'AUTH' }] }
                }
            },
            []
        );
        expect(bound.entities[0].properties.find(({ name }) => name === 'CompanyCode')?.enumValues).toEqual(['AUTH']);
    });
    it('keeps declared enumerations ahead of synthetic domains and reports the conflict', () => {
        const graph = parseEdmx(content);
        const original = {
            ...graph,
            entities: graph.entities.map((entity) => ({
                ...entity,
                properties: entity.properties.map((property) =>
                    property.name === 'CompanyCode' ? { ...property, enumValues: ['AUTH'] } : property
                )
            }))
        };
        const diagnostics: Parameters<typeof applySyntheticScenario>[2] = [];
        const planned = applySyntheticScenario(
            original,
            { id: 'demo', version: '1', domains: { 'Accounts.CompanyCode': ['FAKE'] } },
            diagnostics
        );
        expect(planned.entities[0].properties.find(({ name }) => name === 'CompanyCode')?.enumValues).toEqual(['AUTH']);
        expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'SYNTHETIC_SCENARIO_SHADOWED' }));
    });

    it('rejects invalid or misspelled scenario domains rather than silently ignoring configuration', () => {
        for (const domains of [
            { 'Accounts.Missing': ['x'] },
            { 'Accounts.CompanyCode': [] },
            { 'Accounts.CompanyCode': ['TOO-LONG'] }
        ]) {
            expect(() =>
                applySyntheticScenario(parseEdmx(content), { id: 'demo', version: '1', domains }, [])
            ).toThrow();
        }
        expect(() =>
            validateSampleDataset({
                id: 'empty',
                version: '1',
                firstNames: [],
                lastNames: [],
                organizations: [],
                descriptions: []
            })
        ).toThrow();
    });
    it('does not claim an application-specific company-code domain from a field name', async () => {
        const report = await inspectService(request, { pipeline: 'semantic-v2', rowsPerEntity: 1 });
        // The company-code lexical rule is off since the train/calibration audit (it fired on a
        // postal code), so the field is neither routed nor claimed as a company-code domain.
        expect(report.fieldDecisions.find(({ property }) => property === 'CompanyCode')?.acceptedRole).toBeUndefined();
        expect(
            report.diagnostics.some(
                ({ code, target }) => code === 'SEMANTIC_DOMAIN_UNAVAILABLE' && target === 'Accounts.CompanyCode'
            )
        ).toBe(false);
    });

    it('uses explicit synthetic domains without inferring currency from country', async () => {
        const options = {
            pipeline: 'semantic-v2',
            rowsPerEntity: 2,
            syntheticScenario: {
                id: 'cross-border',
                version: '1',
                domains: {
                    'Accounts.BankCountry': ['DE'],
                    'Accounts.Currency': ['USD'],
                    'Accounts.CompanyCode': ['ZX91']
                }
            }
        } as const satisfies MockDataGeneratorOptions;
        const report = await inspectService(request, options, {}, { includeGeneratedValues: true });
        expect(
            report.generatedValues?.Accounts.every(
                (row) => row.BankCountry === 'DE' && row.Currency === 'USD' && row.CompanyCode === 'ZX91'
            )
        ).toBe(true);
        expect(report.diagnostics.some(({ code }) => code === 'SYNTHETIC_SCENARIO_APPLIED')).toBe(true);
    });

    it('replaces the sample name dataset without changing generation algorithms', async () => {
        const options = {
            pipeline: 'semantic-v2',
            rowsPerEntity: 2,
            sampleDataset: {
                id: 'test-names',
                version: '1',
                firstNames: ['Aster'],
                lastNames: ['Example'],
                organizations: ['Example Organization'],
                descriptions: ['Synthetic description']
            }
        } as const satisfies MockDataGeneratorOptions;
        const result = await generateService(request, options);
        expect(result.resources.Accounts.every((row) => row.FirstName === 'Aster')).toBe(true);
        expect(result.diagnostics.some(({ code }) => code === 'SYNTHETIC_DATASET_USED')).toBe(true);
    });
});
