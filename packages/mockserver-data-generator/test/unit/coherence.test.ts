import { generateService, type MockDataServiceRequest, type SftGenerator } from '../../src/index.js';

const request: MockDataServiceRequest = {
    metadata: {
        format: 'edmx',
        content: `<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                <edmx:DataServices>
                    <Schema Namespace="Coherence" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                        <EntityContainer Name="Container">
                            <EntitySet Name="Documents" EntityType="Coherence.Document" />
                            <EntitySet Name="Units" EntityType="Coherence.Unit" />
                        </EntityContainer>
                        <EntityType Name="Document">
                            <Key><PropertyRef Name="ID" /></Key>
                            <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                            <Property Name="AgreementStartDate" Type="Edm.DateTimeOffset" />
                            <Property Name="AgreementEndDate" Type="Edm.DateTimeOffset" />
                            <Property Name="StatementStatus" Type="Edm.String" MaxLength="1" />
                            <Property Name="StatementStatus_Text" Type="Edm.String" MaxLength="20" />
                            <Property Name="OpeningBalanceAmount_fc" Type="Edm.Int32" />
                            <Property Name="OpeningBalanceAmount" Type="Edm.Decimal" Precision="12" Scale="2" />
                            <Property Name="TotalDebitAmount" Type="Edm.Decimal" Precision="12" Scale="2" />
                            <Property Name="TotalCreditAmount" Type="Edm.Decimal" Precision="12" Scale="2" />
                            <Property Name="ClosingBalanceAmount_fc" Type="Edm.Int32" />
                            <Property Name="ClosingBalanceAmount" Type="Edm.Decimal" Precision="12" Scale="2" />
                            <Property Name="BankLedgerIsPosted" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="SubledgerIsPostedSuccessfully" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="BankStatementIsInterpreted" Type="Edm.String" MaxLength="1" />
                            <Property Name="MaterialIsAvailable" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="MaterialIsDeleted" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="MaterialIsInactive" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="MaterialIsInstalled" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="MaterialIsInWarehouse" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="MaterialIsAtCustomer" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="HasDraftEntity" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="HasActiveEntity" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="IsActiveEntity" Type="Edm.Boolean" Nullable="false" />
                            <Property Name="ActiveUUID" Type="Edm.Guid" />
                        </EntityType>
                        <EntityType Name="Unit">
                            <Key><PropertyRef Name="UnitOfMeasure" /></Key>
                            <Property Name="UnitOfMeasure" Type="Edm.String" MaxLength="3" Nullable="false" />
                            <Property Name="UnitOfMeasure_Text" Type="Edm.String" MaxLength="20" />
                            <Property Name="UnitOfMeasureISOCode" Type="Edm.String" MaxLength="3" />
                        </EntityType>
                    </Schema>
                </edmx:DataServices>
            </edmx:Edmx>`
    },
    service: { urlPath: '/coherence', odataVersion: '4.0' },
    targets: [
        { name: 'Documents', kind: 'entity-set' },
        { name: 'Units', kind: 'entity-set' }
    ],
    existingData: {}
};

function expectCoherentDocument(row: Readonly<Record<string, unknown>>): void {
    expect(String(row.AgreementStartDate) <= String(row.AgreementEndDate)).toBe(true);
    expect({ O: 'Open', I: 'In Progress', A: 'Approved', C: 'Completed' }[String(row.StatementStatus)]).toBe(
        row.StatementStatus_Text
    );
    expect(Number(row.ClosingBalanceAmount)).toBe(
        Number(
            (Number(row.OpeningBalanceAmount) + Number(row.TotalCreditAmount) - Number(row.TotalDebitAmount)).toFixed(2)
        )
    );
    expect(Number(row.TotalDebitAmount)).toBeGreaterThanOrEqual(0);
    expect(Number(row.ClosingBalanceAmount)).toBeGreaterThanOrEqual(0);

    expect([null, 'X']).toContain(row.BankStatementIsInterpreted);
    if (row.SubledgerIsPostedSuccessfully) {
        expect(row.BankLedgerIsPosted).toBe(true);
    }
    expect(row.BankLedgerIsPosted || row.SubledgerIsPostedSuccessfully).toBe(row.BankStatementIsInterpreted === 'X');

    expect(row.MaterialIsInstalled && row.MaterialIsInWarehouse).toBe(false);
    expect(row.MaterialIsAtCustomer && !row.MaterialIsInstalled).toBe(false);
    if (row.MaterialIsDeleted || row.MaterialIsInactive) {
        expect(row.MaterialIsInstalled || row.MaterialIsInWarehouse || row.MaterialIsAtCustomer).toBe(false);
    }
    expect(row.MaterialIsAvailable).toBe(!(row.MaterialIsDeleted || row.MaterialIsInactive));

    expect(row.HasActiveEntity).toBe(!row.IsActiveEntity);
    expect(row.HasDraftEntity).toBe(row.IsActiveEntity);
    expect(row.IsActiveEntity ? null : row.ActiveUUID).toBe(row.ActiveUUID);
}

function expectCoherentUnit(row: Readonly<Record<string, unknown>>): void {
    const units: Readonly<Record<string, string>> = {
        EA: 'Each',
        KG: 'Kilogram',
        L: 'Litre',
        H: 'Hour',
        PC: 'Piece',
        M: 'Metre',
        S: 'Second',
        MIN: 'Minute',
        D: 'Day',
        WK: 'Week'
    };
    expect(units[String(row.UnitOfMeasure)]).toBe(row.UnitOfMeasure_Text);
    expect(row.UnitOfMeasureISOCode).toBe(row.UnitOfMeasure);
}

describe('cross-field semantic coherence', () => {
    it('reconciles dates, balances, statuses, lifecycle flags, drafts, and value-help rows', async () => {
        const result = await generateService(request, { seed: 113, rowsPerEntity: 4 });

        result.resources.Documents.forEach(expectCoherentDocument);
        result.resources.Units.forEach(expectCoherentUnit);
        expect(new Set(result.resources.Units.map((row) => row.UnitOfMeasure)).size).toBe(4);
    });

    it('does not offer coherence-owned fields to the SFT tier', async () => {
        const calls: string[][] = [];
        const sft: SftGenerator = {
            fingerprint: 'sft-test',
            generate: async (input) => {
                calls.push(input.fields.map(({ name }) => name));
                return {
                    rows: Array.from({ length: input.rowCount }, () =>
                        Object.fromEntries(input.fields.map(({ name }) => [name, null]))
                    )
                };
            }
        };

        const result = await generateService(request, { seed: 113, rowsPerEntity: 2 }, { sft });

        result.resources.Documents.forEach(expectCoherentDocument);
        result.resources.Units.forEach(expectCoherentUnit);
        expect(calls.flat()).not.toEqual(
            expect.arrayContaining([
                'AgreementStartDate',
                'AgreementEndDate',
                'StatementStatus',
                'StatementStatus_Text',
                'OpeningBalanceAmount',
                'ClosingBalanceAmount',
                'BankLedgerIsPosted',
                'BankStatementIsInterpreted',
                'MaterialIsDeleted',
                'HasDraftEntity',
                'UnitOfMeasure_Text'
            ])
        );
    });

    it('keeps custom enum statuses coherent instead of reserving unchanged generic values', async () => {
        const enumRequest: MockDataServiceRequest = {
            metadata: {
                format: 'csn',
                content: JSON.stringify({
                    definitions: {
                        'Coherence.Statuses': {
                            kind: 'entity',
                            elements: {
                                ID: { key: true, type: 'cds.Integer', notNull: true },
                                ProcessingStatus: {
                                    type: 'cds.String',
                                    length: 4,
                                    enum: { NEW: { val: 'NEW' }, DONE: { val: 'DONE' } }
                                },
                                ProcessingStatus_Text: { type: 'cds.String', length: 20 }
                            }
                        }
                    }
                })
            },
            service: { urlPath: '/coherence', odataVersion: '4.0' },
            targets: [{ name: 'Statuses', kind: 'entity-set' }],
            existingData: {}
        };

        const result = await generateService(enumRequest, { seed: 113, rowsPerEntity: 4 });

        expect(result.resources.Statuses).toHaveLength(4);
        result.resources.Statuses.forEach((row) => {
            expect(['NEW', 'DONE']).toContain(row.ProcessingStatus);
            expect(row.ProcessingStatus_Text).toBe(row.ProcessingStatus === 'NEW' ? 'New' : 'Done');
        });
    });

    it('reconciles key-backed status and unit value helps beyond the built-in vocabulary size', async () => {
        const result = await generateService(request, { seed: 113, rowsPerEntity: { Documents: 1, Units: 12 } });

        expect(result.resources.Units).toHaveLength(12);
        expect(new Set(result.resources.Units.map((row) => row.UnitOfMeasure)).size).toBe(12);
        result.resources.Units.forEach((row) => {
            expect(row.UnitOfMeasureISOCode).toBe(row.UnitOfMeasure);
            expect(String(row.UnitOfMeasure_Text).length).toBeGreaterThan(0);
        });
    });

    it('updates a status companion after relationship planning without changing the foreign key', async () => {
        const relationshipRequest: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<?xml version="1.0" encoding="utf-8"?>
                    <edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
                        <edmx:DataServices>
                            <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Coherence">
                                <EntityType Name="Status">
                                    <Key><PropertyRef Name="Code" /></Key>
                                    <Property Name="Code" Type="Edm.String" MaxLength="1" Nullable="false" />
                                    <Property Name="Text" Type="Edm.String" MaxLength="20" />
                                </EntityType>
                                <EntityType Name="Order">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="OrderStatus" Type="Edm.String" MaxLength="1" Nullable="false" />
                                    <Property Name="OrderStatus_Text" Type="Edm.String" MaxLength="20" />
                                    <NavigationProperty Name="status" Type="Coherence.Status" Nullable="false">
                                        <ReferentialConstraint Property="OrderStatus" ReferencedProperty="Code" />
                                    </NavigationProperty>
                                </EntityType>
                                <EntityContainer Name="Container">
                                    <EntitySet Name="Statuses" EntityType="Coherence.Status" />
                                    <EntitySet Name="Orders" EntityType="Coherence.Order">
                                        <NavigationPropertyBinding Path="status" Target="Statuses" />
                                    </EntitySet>
                                </EntityContainer>
                            </Schema>
                        </edmx:DataServices>
                    </edmx:Edmx>`
            },
            service: { urlPath: '/coherence', odataVersion: '4.0' },
            targets: [{ name: 'Orders', kind: 'entity-set' }],
            existingData: {
                Statuses: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [{ Code: '0', Text: 'Created' }] }
                }
            }
        };

        const result = await generateService(relationshipRequest, { seed: 113, rowsPerEntity: 2 });

        expect(result.resources.Orders).toHaveLength(2);
        result.resources.Orders.forEach((row) => {
            expect(row.OrderStatus).toBe('0');
            expect(row.OrderStatus_Text).toBe('Status 0');
        });
    });

    it('assigns balances atomically when the initially derived tuple exceeds a narrow precision', async () => {
        const narrowBalanceRequest: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<?xml version="1.0" encoding="utf-8"?>
                    <edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
                        <edmx:DataServices>
                            <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Coherence">
                                <EntityType Name="Balance">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="OpeningBalance" Type="Edm.Decimal" Precision="1" Scale="0" />
                                    <Property Name="TotalDebitAmount" Type="Edm.Decimal" Precision="1" Scale="0" />
                                    <Property Name="TotalCreditAmount" Type="Edm.Decimal" Precision="1" Scale="0" />
                                    <Property Name="ClosingBalance" Type="Edm.Decimal" Precision="1" Scale="0" />
                                </EntityType>
                                <EntityContainer Name="Container">
                                    <EntitySet Name="Balances" EntityType="Coherence.Balance" />
                                </EntityContainer>
                            </Schema>
                        </edmx:DataServices>
                    </edmx:Edmx>`
            },
            service: { urlPath: '/coherence', odataVersion: '4.0' },
            targets: [{ name: 'Balances', kind: 'entity-set' }],
            existingData: {}
        };

        const result = await generateService(narrowBalanceRequest, { seed: 113, rowsPerEntity: 4 });

        result.resources.Balances.forEach((row) => {
            const opening = Number(row.OpeningBalance);
            const debit = Number(row.TotalDebitAmount);
            const credit = Number(row.TotalCreditAmount);
            const closing = Number(row.ClosingBalance);
            expect(Math.abs(opening)).toBeLessThan(10);
            expect(Math.abs(debit)).toBeLessThan(10);
            expect(Math.abs(credit)).toBeLessThan(10);
            expect(Math.abs(closing)).toBeLessThan(10);
            expect(opening + credit - debit).toBe(closing);
        });
    });
});
