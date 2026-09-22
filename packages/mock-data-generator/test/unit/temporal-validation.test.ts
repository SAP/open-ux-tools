import { generateService, inspectService, validateGeneratedResult } from '../../src/index.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Test">
<EntityType Name="Transaction"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="RequestedOn" Type="Edm.Date"/><Property Name="ExecutedOn" Type="Edm.Date"/></EntityType>
<EntityContainer Name="Service"><EntitySet Name="Transactions" EntityType="Test.Transaction"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
const request = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/transactions', odataVersion: '4.0' },
    targets: [{ name: 'Transactions', kind: 'entity-set' }],
    existingData: {}
} as const;
const options = {
    pipeline: 'semantic-v2',
    seed: 42,
    rowsPerEntity: 3,
    syntheticScenario: {
        id: 'test-lifecycle',
        version: '1',
        domains: {},
        temporalConstraints: [{ resource: 'Transactions', before: 'RequestedOn', after: 'ExecutedOn' }]
    }
} as const;

describe('public temporal plan validation', () => {
    it('lets explicit scenario ordering override inferred name-based ordering', async () => {
        const overriddenRequest = {
            ...request,
            metadata: {
                ...request.metadata,
                content: metadata.replaceAll('RequestedOn', 'EndDate').replaceAll('ExecutedOn', 'StartDate')
            }
        };
        const report = await inspectService(
            overriddenRequest,
            {
                ...options,
                syntheticScenario: {
                    ...options.syntheticScenario,
                    temporalConstraints: [{ resource: 'Transactions', before: 'EndDate', after: 'StartDate' }]
                }
            },
            {},
            { includeGeneratedValues: true }
        );
        expect(report.generatedValues?.Transactions.every((row) => String(row.EndDate) <= String(row.StartDate))).toBe(
            true
        );
    });
    it('executes explicit lifecycle constraints through generation and inspection', async () => {
        const report = await inspectService(request, options, {}, { includeGeneratedValues: true });
        for (const row of report.generatedValues?.Transactions ?? []) {
            expect(String(row.RequestedOn) <= String(row.ExecutedOn)).toBe(true);
        }
        expect(report.invariants.find(({ name }) => name === 'temporal-ordering')).toMatchObject({ passed: true });
    });

    it('rejects a cached result with a newly reversed lifecycle', async () => {
        const result = await generateService(request, options);
        const invalid = {
            ...result,
            resources: {
                Transactions: result.resources.Transactions.map((row) => ({
                    ...row,
                    RequestedOn: '2025-01-02',
                    ExecutedOn: '2025-01-01'
                }))
            }
        };
        expect(() => validateGeneratedResult(request, invalid, options)).toThrow(/temporal/i);
    });

    it('reports protected conflicting domains without overwriting their assignments', async () => {
        const report = await inspectService(
            request,
            {
                ...options,
                syntheticScenario: {
                    ...options.syntheticScenario,
                    domains: {
                        'Transactions.RequestedOn': ['2025-01-02'],
                        'Transactions.ExecutedOn': ['2025-01-01']
                    }
                }
            },
            {},
            { includeGeneratedValues: true }
        );
        expect(report.generatedValues?.Transactions[0]).toMatchObject({
            RequestedOn: '2025-01-02',
            ExecutedOn: '2025-01-01'
        });
        expect(report.invariants.find(({ name }) => name === 'temporal-ordering')).toMatchObject({
            passed: false,
            status: 'failed'
        });
    });
});
