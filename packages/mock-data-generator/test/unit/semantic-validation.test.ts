import { generateService, inspectService, validateGeneratedResult } from '../../src/index.js';
import { readFile } from 'node:fs/promises';
import { parseEdmx } from '../../src/schema/edmx.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema Namespace="Test" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityType Name="Account"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="IBAN" Type="Edm.String" Nullable="false" MaxLength="34"/><Property Name="Email" Type="Edm.String" Nullable="false" MaxLength="5"/></EntityType><EntityContainer Name="Container"><EntitySet Name="Accounts" EntityType="Test.Account"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`;
const request = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/test', odataVersion: '4.0' },
    targets: [{ name: 'Accounts', kind: 'entity-set' }],
    existingData: {}
} as const;

const ibanScenario = { id: 'synthetic-german-accounts', version: '1', domains: {}, ibanCountry: 'DE' } as const;

describe('executable semantic validation', () => {
    it('validates deterministic semantic values before spending an SFT inference', async () => {
        const invalid = {
            ...request,
            metadata: {
                ...request.metadata,
                content: metadata
                    .replace('MaxLength="5"', 'MaxLength="80"')
                    .replace('</EntityType>', '<Property Name="Notes" Type="Edm.String" MaxLength="40"/></EntityType>')
            }
        };
        const generate = jest.fn(async () => ({ rows: [{ Notes: 'Synthetic narrative' }] }));
        await expect(
            generateService(
                invalid,
                {
                    pipeline: 'semantic-v2',
                    rowsPerEntity: 1,
                    syntheticScenario: ibanScenario,
                    sampleDataset: {
                        id: 'invalid-email-parts',
                        version: '1',
                        firstNames: ['bad@name'],
                        lastNames: ['Sample'],
                        organizations: ['Example'],
                        descriptions: ['Synthetic narrative']
                    }
                },
                {
                    classifier: {
                        fingerprint: 'test',
                        classify: async (input) =>
                            input.propertyName === 'Notes'
                                ? {
                                      role: 'unknown',
                                      confidence: 1,
                                      source: 'unknown',
                                      top: [{ role: 'unknown', confidence: 1 }]
                                  }
                                : { role: 'email', confidence: 1, source: 'classifier' }
                    },
                    sft: { fingerprint: 'test', generate }
                }
            )
        ).rejects.toThrow(/semantic/iu);
        expect(generate).not.toHaveBeenCalled();
    });
    it('does not infer an IBAN jurisdiction from an unrelated address country', async () => {
        const report = await inspectService(request, { pipeline: 'semantic-v2', rowsPerEntity: 1 });
        expect(report.fieldDecisions.find(({ property }) => property === 'IBAN')?.acceptedRole).toBeUndefined();
        expect(
            report.diagnostics.some(
                ({ code, target }) => code === 'SEMANTIC_DOMAIN_UNAVAILABLE' && target === 'Accounts.IBAN'
            )
        ).toBe(true);
    });
    it('keeps finance display names and modeled child counts coherent despite generic labels', async () => {
        const content = await readFile(new URL('./finance-manage.metadata.xml', import.meta.url), 'utf8');
        const graph = parseEdmx(content);
        const result = await generateService(
            {
                ...request,
                metadata: { format: 'edmx', content },
                targets: graph.entities.map(({ entitySetName }) => ({ name: entitySetName, kind: 'entity-set' }))
            },
            { pipeline: 'semantic-v2', rowsPerEntity: 2, seed: 31 }
        );
        for (const row of result.resources.CashBank) {
            expect(row.CreatedByUserFullName).not.toMatch(/Cash Bank Type/u);
            expect(row.RegionName).not.toMatch(/Cash Bank Type/u);
            expect(row.NumberOfBusinessPartnerUsed).toBe(
                result.resources.BusinessPartnerUsed.filter(
                    (child) => child.BankCountry === row.BankCountry && child.BankInternalID === row.BankInternalID
                ).length
            );
            expect(row.NumberOfCompanyUsed).toBe(
                result.resources.CompanyCodeUsed.filter(
                    (child) => child.BankCountry === row.BankCountry && child.BankInternalID === row.BankInternalID
                ).length
            );
            expect(row.NumberOfBankAccounts).toBe(0);
            expect(row.BankHasBankAccounts).toBe(false);
        }
        expect(result.diagnostics.some(({ code }) => code === 'SEMANTIC_DERIVATION_UNAVAILABLE')).toBe(true);
    });
    it('requires complete semantic plan metadata for semantic-v2 cache validation', async () => {
        const result = await generateService(request, {
            pipeline: 'semantic-v2',
            rowsPerEntity: 1,
            syntheticScenario: ibanScenario
        });
        expect(() =>
            validateGeneratedResult(request, { ...result, semanticRoles: undefined }, { pipeline: 'semantic-v2' })
        ).toThrow(/semantic/iu);
        expect(() =>
            validateGeneratedResult(request, { ...result, semanticRoles: {} }, { pipeline: 'semantic-v2' })
        ).toThrow(/semantic/iu);
    });
    it('bounds generation to a finite BIC key domain', async () => {
        const bicRequest = {
            ...request,
            metadata: {
                ...request.metadata,
                content: metadata
                    .replace('<Key><PropertyRef Name="ID"/></Key>', '<Key><PropertyRef Name="BIC"/></Key>')
                    .replace('Name="IBAN"', 'Name="BIC"')
            }
        };
        const report = await inspectService(
            bicRequest,
            { pipeline: 'semantic-v2', rowsPerEntity: 10 },
            {},
            { includeGeneratedValues: true }
        );
        expect(report.generatedValues?.Accounts).toHaveLength(4);
    });
    it('generates IBANs with a valid mod-97 checksum', async () => {
        const report = await inspectService(
            request,
            { pipeline: 'semantic-v2', rowsPerEntity: 4, syntheticScenario: ibanScenario },
            {},
            { includeGeneratedValues: true }
        );
        for (const row of report.generatedValues?.Accounts ?? []) {
            const iban = String(row.IBAN);
            const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/gu, (letter) =>
                String(letter.charCodeAt(0) - 55)
            );
            expect(BigInt(digits) % 97n).toBe(1n);
        }
    });
    it('does not report a facet-truncated email as semantic coverage', async () => {
        const report = await inspectService(request, {
            pipeline: 'semantic-v2',
            rowsPerEntity: 1,
            syntheticScenario: ibanScenario
        });
        expect(report.fieldDecisions.find(({ property }) => property === 'Email')?.acceptedRole).toBeUndefined();
        expect(report.diagnostics.some(({ code }) => code === 'SEMANTIC_PROVIDER_UNAVAILABLE')).toBe(true);
        expect(report.coverage.formatValidatedFields).toBe(1);
        expect(report.executionMode).toBe('deterministic-inspection');
        expect(report.invariants).toContainEqual({ name: 'semantic-formats', passed: true });
    });
});
