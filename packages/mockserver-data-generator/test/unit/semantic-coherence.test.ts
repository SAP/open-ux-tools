import { generateService, type MockDataServiceRequest } from '../../src/index.js';

const request: MockDataServiceRequest = {
    metadata: {
        format: 'edmx',
        content: `<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                <edmx:DataServices>
                    <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                        <EntityContainer Name="Container">
                            <EntitySet Name="BusinessPartners" EntityType="Demo.BusinessPartner" />
                        </EntityContainer>
                        <EntityType Name="BusinessPartner">
                            <Key><PropertyRef Name="ID" /></Key>
                            <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                            <Property Name="FirstName" Type="Edm.String" MaxLength="40" />
                            <Property Name="LastName" Type="Edm.String" MaxLength="40" />
                            <Property Name="FullName" Type="Edm.String" MaxLength="90" />
                            <Property Name="EmailAddress" Type="Edm.String" MaxLength="120" />
                            <Property Name="Amount" Type="Edm.Decimal" Precision="12" Scale="2" />
                            <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3" />
                            <Property Name="Quantity" Type="Edm.Decimal" Precision="10" Scale="2" />
                            <Property Name="UnitOfMeasure" Type="Edm.String" MaxLength="3" />
                            <Property Name="StartDate" Type="Edm.Date" />
                            <Property Name="EndDate" Type="Edm.Date" />
                        </EntityType>
                    </Schema>
                </edmx:DataServices>
            </edmx:Edmx>`
    },
    service: { urlPath: '/partners', odataVersion: '4.0' },
    targets: [{ name: 'BusinessPartners', kind: 'entity-set' }],
    existingData: {}
};

describe('deterministic semantic tier', () => {
    it('creates coherent person, money, measure, and date groups without a learned runtime', async () => {
        const result = await generateService(request, { seed: 101, rowsPerEntity: 4 });

        expect(result.resources.BusinessPartners).toHaveLength(4);
        for (const row of result.resources.BusinessPartners) {
            expect(row.FullName).toBe(`${row.FirstName} ${row.LastName}`);
            expect(row.EmailAddress).toBe(
                `${String(row.FirstName).toLowerCase()}.${String(row.LastName).toLowerCase()}@example.com`
            );
            expect(row.Amount).toEqual(expect.any(Number));
            expect(row.CurrencyCode).toMatch(/^(EUR|USD|GBP|JPY|CHF)$/);
            expect(row.Quantity).toEqual(expect.any(Number));
            expect(row.UnitOfMeasure).toMatch(/^(EA|KG|L|H|PC)$/);
            expect(String(row.StartDate) <= String(row.EndDate)).toBe(true);
        }
    });
});
