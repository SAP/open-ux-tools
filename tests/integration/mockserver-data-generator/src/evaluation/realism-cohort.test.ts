import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
    evaluateCohortTarget,
    resolveCohortSourcePath,
    validateRealismCohortManifest,
    verifyCohortIsolation,
    verifyCohortSourcePath,
    verifyT2Expectations
} from '../../../../../scripts/mockserver-data-generator-evaluation/lib/realism-cohort.mjs';

const sha256 = 'a'.repeat(64);
const revision = 'b'.repeat(40);
const domains = ['finance', 'sales', 'service', 'maintenance', 'master-data', 'non-sap'];
const schemaFormats = ['edmx-v2', 'edmx-v2', 'edmx-v2', 'edmx-v4', 'csn', 'edmx-v4'];
const assertionTypes = ['code-text', 'amount-currency', 'quantity-unit', 'date-range', 'person-address', 'status'];

/** Build the smallest complete service-disjoint cohort contract. */
function cohortManifest(): Record<string, unknown> {
    return {
        version: 4,
        kind: 'mockserver-data-generator-realism-cohort',
        cohortId: 'final-cohort-v1',
        minimumReviewedFields: 300,
        isolation: {
            policy: 'service-and-source-family-disjoint',
            status: 'verified',
            checkedAgainst: [
                'classifier-train',
                'classifier-validation',
                'classifier-public-real',
                'classifier-reviewed-fixtures',
                'sft-train',
                'sft-eval',
                'pilot-model-selection'
            ].map((role) => ({ role, path: `${role}.json`, bytes: 1, sha256 })),
            audit: {
                candidateServiceCount: 6,
                serviceOverlapCount: 0,
                sourceFamilyOverlapCount: 0
            }
        },
        targets: domains.map((domain, index) => ({
            domain,
            serviceId: `unseen-${domain}`,
            path: `schemas/${domain}.${schemaFormats[index] === 'csn' ? 'csn.json' : 'metadata.xml'}`,
            format: schemaFormats[index] === 'csn' ? 'csn' : 'edmx',
            schemaFormat: schemaFormats[index],
            serviceName: `Unseen${index}`,
            provenance: 'Public metadata frozen after candidate selection.',
            fieldBudget: 50,
            expectedEmptyResources: [],
            t2Expectations: { attempts: 2, parsedResponses: 2, eligibleSlots: 4, acceptedSlots: 3 },
            relationships: [
                {
                    id: `coherence-${index}`,
                    criterionType: assertionTypes[index],
                    entity: 'Entity',
                    properties: ['A', 'B'],
                    criterion: 'The values must remain coherent.'
                },
                ...(index === 0
                    ? [
                          {
                              id: 'coherence-draft',
                              criterionType: 'draft',
                              entity: 'Entity',
                              properties: ['A', 'B'],
                              criterion: 'Draft fields must remain coherent.'
                          },
                          {
                              id: 'coherence-value-help',
                              criterionType: 'value-help',
                              entity: 'Entity',
                              properties: ['A', 'B'],
                              criterion: 'Value-help fields must remain coherent.'
                          }
                      ]
                    : [])
            ],
            schemaBytes: 1,
            schemaSha256: sha256,
            source: {
                sourceFamily: `repository:example/${domain}`,
                repository: `https://github.com/example/${domain}`,
                revision,
                repositoryPaths: [{ path: 'metadata/source', blobSha: revision }],
                licenseIdentifier: 'Apache-2.0'
            }
        }))
    };
}

describe('production realism cohort', () => {
    test('accepts only a complete frozen service-disjoint cohort', () => {
        expect(validateRealismCohortManifest(cohortManifest())).toMatchObject({
            cohortId: 'final-cohort-v1',
            minimumReviewedFields: 300,
            targets: expect.arrayContaining(domains.map((domain) => expect.objectContaining({ domain })))
        });
    });

    test('rejects a family or format below 50 fields before inference', () => {
        const manifest = cohortManifest() as {
            targets: Array<{ domain: string; fieldBudget: number }>;
        };
        manifest.targets.find(({ domain }) => domain === 'maintenance')!.fieldBudget = 49;

        expect(() => validateRealismCohortManifest(manifest)).toThrow(
            'realism application family maintenance does not meet the frozen coverage minimum'
        );
    });

    test('requires an explicit selection to contain exactly its frozen field budget', () => {
        const manifest = cohortManifest() as {
            targets: Array<{ fieldBudget: number; selection?: Array<{ entity: string; properties: string[] }> }>;
        };
        manifest.targets[0].selection = [{ entity: 'Entity', properties: ['A'] }];

        expect(() => validateRealismCohortManifest(manifest)).toThrow(
            'cohort target 0 explicit selection does not match its field budget'
        );
    });

    test('rejects claimed isolation with overlaps and duplicate services', () => {
        const manifest = cohortManifest() as {
            isolation: { audit: { serviceOverlapCount: number } };
            targets: Array<{ serviceId: string }>;
        };
        manifest.isolation.audit.serviceOverlapCount = 1;
        expect(() => validateRealismCohortManifest(manifest)).toThrow('cohort isolation audit contains overlaps');

        const duplicate = cohortManifest() as { targets: Array<{ serviceId: string }> };
        duplicate.targets[1].serviceId = duplicate.targets[0].serviceId;
        expect(() => validateRealismCohortManifest(duplicate)).toThrow('duplicate cohort service identity');
    });

    test('requires exact frozen T2 denominators and contribution', () => {
        const manifest = cohortManifest() as {
            targets: Array<{
                serviceId: string;
                t2Expectations: {
                    attempts: number;
                    parsedResponses: number;
                    eligibleSlots: number;
                    acceptedSlots: number;
                };
            }>;
        };
        expect(verifyT2Expectations(manifest.targets[0], manifest.targets[0].t2Expectations)).toEqual(
            manifest.targets[0].t2Expectations
        );
        expect(() =>
            verifyT2Expectations(manifest.targets[0], {
                ...manifest.targets[0].t2Expectations,
                acceptedSlots: 2
            })
        ).toThrow('T2 statistics disagree');
        delete (manifest.targets[1] as { t2Expectations?: unknown }).t2Expectations;
        expect(() => validateRealismCohortManifest(manifest)).toThrow('T2 expectations');
    });

    test('keeps every source inside the frozen cohort directory', () => {
        expect(resolveCohortSourcePath('/tmp/cohort/selection.json', 'schemas/service.csn.json')).toBe(
            '/tmp/cohort/schemas/service.csn.json'
        );
        expect(() => resolveCohortSourcePath('/tmp/cohort/selection.json', '../escape.xml')).toThrow(
            'cohort source path resolves outside the cohort directory'
        );
    });

    test('rejects a schema that escapes through a symbolic-link parent', async () => {
        const root = mkdtempSync(join(tmpdir(), 'mockserver-data-generator-cohort-'));
        const cohort = join(root, 'cohort');
        const outside = join(root, 'outside');
        mkdirSync(cohort);
        mkdirSync(outside);
        writeFileSync(join(cohort, 'selection.json'), '{}');
        writeFileSync(join(outside, 'metadata.xml'), '<Schema />');
        symlinkSync(outside, join(cohort, 'schemas'));
        try {
            await expect(
                verifyCohortSourcePath(join(cohort, 'selection.json'), 'schemas/metadata.xml')
            ).rejects.toThrow('real path resolves outside');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('verifies bound pilot inputs and recomputes cohort isolation', async () => {
        const root = mkdtempSync(join(tmpdir(), 'mockserver-data-generator-isolation-'));
        const manifest = cohortManifest() as {
            isolation: { checkedAgainst: Array<{ role: string; path: string; bytes: number; sha256: string }> };
            targets: Array<{ serviceId: string }>;
        };
        try {
            for (const entry of manifest.isolation.checkedAgainst) {
                const source = `${JSON.stringify({ serviceId: `pilot-${entry.role}`, sourceFamily: `pilot-${entry.role}` })}\n`;
                writeFileSync(join(root, entry.path), source);
                entry.bytes = Buffer.byteLength(source);
                entry.sha256 = createHash('sha256').update(source).digest('hex');
            }
            const verified = await verifyCohortIsolation(validateRealismCohortManifest(manifest), root);
            expect(verified).toMatchObject({
                status: 'verified',
                candidateServiceCount: 6,
                serviceOverlapCount: 0,
                sourceFamilyOverlapCount: 0,
                inputs: expect.arrayContaining([expect.objectContaining({ role: 'classifier-train' })])
            });

            const overlapping = manifest.isolation.checkedAgainst[0];
            const source = `${JSON.stringify({ serviceId: manifest.targets[0].serviceId })}\n`;
            writeFileSync(join(root, overlapping.path), source);
            overlapping.bytes = Buffer.byteLength(source);
            overlapping.sha256 = createHash('sha256').update(source).digest('hex');
            await expect(verifyCohortIsolation(validateRealismCohortManifest(manifest), root)).rejects.toThrow(
                'recomputation found service or source-family overlap'
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('passes only non-empty resources whose frozen assertions are machine coherent', () => {
        const target = {
            serviceId: 'finance',
            expectedEmptyResources: [],
            relationships: [
                {
                    id: 'balance',
                    criterionType: 'amount-currency',
                    entity: 'Statements',
                    properties: [
                        'Currency',
                        'OpeningBalance',
                        'TotalDebitAmount',
                        'TotalCreditAmount',
                        'ClosingBalance'
                    ]
                },
                {
                    id: 'processing',
                    criterionType: 'status',
                    entity: 'Statements',
                    properties: ['BankLedgerIsPosted', 'SubledgerIsPostedSuccessfully', 'BankStatementIsInterpreted']
                }
            ]
        };
        const graph = {
            entities: [{ name: 'Statements', entitySetName: 'Statements' }]
        };
        const resources = {
            Statements: [
                {
                    Currency: 'EUR',
                    OpeningBalance: 100,
                    TotalDebitAmount: 30,
                    TotalCreditAmount: 10,
                    ClosingBalance: 80,
                    BankLedgerIsPosted: true,
                    SubledgerIsPostedSuccessfully: true,
                    BankStatementIsInterpreted: 'X'
                }
            ]
        };

        expect(evaluateCohortTarget(target, graph, [{ name: 'Statements' }], resources)).toMatchObject({
            passed: true,
            nonEmptyResources: true,
            assertions: [
                { id: 'balance', passed: true, rowCount: 1 },
                { id: 'processing', passed: true, rowCount: 1 }
            ]
        });

        resources.Statements[0].ClosingBalance = 79;
        expect(evaluateCohortTarget(target, graph, [{ name: 'Statements' }], resources)).toMatchObject({
            passed: false,
            assertions: expect.arrayContaining([expect.objectContaining({ id: 'balance', passed: false, rowCount: 1 })])
        });
    });

    test('fails closed for empty resources and unsupported status shapes', () => {
        const target = {
            serviceId: 'maintenance',
            expectedEmptyResources: [],
            relationships: [
                {
                    id: 'unknown-status',
                    criterionType: 'status',
                    entity: 'Items',
                    properties: ['State']
                }
            ]
        };
        const graph = { entities: [{ name: 'Items', entitySetName: 'Items' }] };

        expect(evaluateCohortTarget(target, graph, [{ name: 'Items' }], { Items: [] })).toMatchObject({
            passed: false,
            nonEmptyResources: false,
            assertions: [{ id: 'unknown-status', passed: false, rowCount: 0 }]
        });
    });

    test('exempts only explicitly declared empty resources in a mixed service', () => {
        const target = {
            serviceId: 'mixed',
            expectedEmptyResources: ['OptionalItems'],
            relationships: []
        };
        const graph = { entities: [] };

        expect(
            evaluateCohortTarget(target, graph, [{ name: 'RequiredItems' }, { name: 'OptionalItems' }], {
                RequiredItems: [{}],
                OptionalItems: []
            })
        ).toMatchObject({ passed: true, nonEmptyResources: true });
        expect(
            evaluateCohortTarget(target, graph, [{ name: 'RequiredItems' }, { name: 'OptionalItems' }], {
                RequiredItems: [],
                OptionalItems: []
            })
        ).toMatchObject({ passed: false, nonEmptyResources: false });
        expect(() => evaluateCohortTarget(target, graph, [{ name: 'RequiredItems' }], { RequiredItems: [{}] })).toThrow(
            'Expected-empty resource was not requested'
        );
    });

    test('evaluates every frozen coherence criterion without provider judgment', () => {
        const assertion = (id: string, criterionType: string, properties: string[]) => ({
            id,
            criterionType,
            entity: 'Items',
            properties
        });
        const target = {
            serviceId: 'all-criteria',
            expectedEmptyResources: [],
            relationships: [
                assertion('code-text', 'code-text', ['Status', 'Status_Text']),
                assertion('amount', 'amount-currency', ['Amount', 'Currency']),
                assertion('quantity', 'quantity-unit', ['Quantity', 'Unit']),
                assertion('date', 'date-range', ['StartDate', 'EndDate']),
                assertion('person', 'person-address', [
                    'ContactFirstName',
                    'ContactLastName',
                    'ContactEmail',
                    'ContactPhone',
                    'City',
                    'Country'
                ]),
                assertion('lifecycle', 'status', [
                    'ItemIsAvailable',
                    'ItemIsDeleted',
                    'ItemIsInactive',
                    'ItemIsInstalled',
                    'ItemIsInWarehouse',
                    'ItemIsAtCustomer'
                ]),
                assertion('draft', 'draft', ['HasDraftEntity', 'HasActiveEntity', 'IsActiveEntity', 'ActiveUUID']),
                assertion('value-help', 'value-help', ['UnitOfMeasure', 'UnitOfMeasure_Text', 'UnitOfMeasureISOCode'])
            ]
        };
        const graph = { entities: [{ name: 'Items', entitySetName: 'Items' }] };
        const resources = {
            Items: [
                {
                    Status: 'C',
                    Status_Text: 'Completed',
                    Amount: 12.5,
                    Currency: 'EUR',
                    Quantity: 2,
                    Unit: 'EA',
                    StartDate: '2026-01-01',
                    EndDate: '2026-02-01',
                    ContactFirstName: 'Amelia',
                    ContactLastName: 'Fischer',
                    ContactEmail: 'amelia.fischer@example.com',
                    ContactPhone: '+353 1 1234567',
                    City: 'Dublin',
                    Country: 'IE',
                    ItemIsAvailable: true,
                    ItemIsDeleted: false,
                    ItemIsInactive: false,
                    ItemIsInstalled: false,
                    ItemIsInWarehouse: true,
                    ItemIsAtCustomer: false,
                    HasDraftEntity: false,
                    HasActiveEntity: true,
                    IsActiveEntity: false,
                    ActiveUUID: '00000000-0000-4000-a000-000000000001' as string | null,
                    UnitOfMeasure: 'KG',
                    UnitOfMeasure_Text: 'Kilogram',
                    UnitOfMeasureISOCode: 'KG'
                }
            ]
        };
        resources.Items.push({
            ...resources.Items[0],
            ItemIsAvailable: false,
            ItemIsInstalled: true,
            ItemIsInWarehouse: false
        });
        resources.Items.push({
            ...resources.Items[0],
            HasActiveEntity: false,
            IsActiveEntity: true,
            ActiveUUID: null
        });

        expect(evaluateCohortTarget(target, graph, [{ name: 'Items' }], resources)).toMatchObject({
            passed: true,
            assertions: target.relationships.map(({ id }) => expect.objectContaining({ id, passed: true }))
        });

        resources.Items[0].EndDate = '2025-12-31';
        expect(evaluateCohortTarget(target, graph, [{ name: 'Items' }], resources)).toMatchObject({
            passed: false,
            assertions: expect.arrayContaining([expect.objectContaining({ id: 'date', passed: false })])
        });
    });
});
