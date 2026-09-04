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
});
