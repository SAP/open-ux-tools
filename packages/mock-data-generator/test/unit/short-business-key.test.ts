import { generateService } from '../../src/index.js';

describe('short business identifiers used as keys', () => {
    it.each(['currency-code', 'unit-of-measure'])(
        'bounds %s keys by the provider domain without repeating values',
        async (semantics) => {
            const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" xmlns:sap="http://www.sap.com/Protocols/SAPData" Namespace="Test"><EntityType Name="Currency"><Key><PropertyRef Name="Currency"/></Key><Property Name="Currency" Type="Edm.String" Nullable="false" MaxLength="5" sap:semantics="currency-code"/></EntityType><EntityContainer Name="Container"><EntitySet Name="Currency" EntityType="Test.Currency"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`;
            const result = await generateService(
                {
                    metadata: {
                        format: 'edmx',
                        content: content.replace('sap:semantics="currency-code"', `sap:semantics="${semantics}"`)
                    },
                    service: { urlPath: '/currency', odataVersion: '4.0' },
                    targets: [{ name: 'Currency', kind: 'entity-set' }],
                    existingData: {}
                },
                { pipeline: 'semantic-v2', mode: 'deterministic', rowsPerEntity: 10 }
            );
            const values = result.resources.Currency.map((row) => row.Currency);
            expect(values.length).toBeGreaterThan(0);
            expect(new Set(values).size).toBe(values.length);
        }
    );
    it.each([
        ['Agency', 1],
        ['Agency', 3],
        ['Agency', 6],
        ['Customer', 1],
        ['Customer', 3],
        ['Customer', 6]
    ] as const)('keeps ten %s identifiers distinct within MaxLength %i', async (kind, maxLength) => {
        const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Test"><EntityType Name="Agency"><Key><PropertyRef Name="AgencyID"/></Key><Property Name="AgencyID" Type="Edm.String" Nullable="false" MaxLength="${maxLength}"/></EntityType><EntityContainer Name="Container"><EntitySet Name="TravelAgency" EntityType="Test.Agency"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`;
        const labeled = content
            .replace('<Schema ', '<Schema xmlns:sap="http://www.sap.com/Protocols/SAPData" ')
            .replace(
                '<Property Name="AgencyID"',
                '<Property sap:label="Agency ID" sap:quickinfo="Flight Reference Scenario: Agency ID" Name="AgencyID"'
            );
        const result = await generateService(
            {
                metadata: {
                    format: 'edmx',
                    content: labeled.replaceAll('AgencyID', `${kind}ID`).replaceAll('Agency ID', `${kind} ID`)
                },
                service: { urlPath: '/travel', odataVersion: '4.0' },
                targets: [{ name: 'TravelAgency', kind: 'entity-set' }],
                existingData: {}
            },
            { pipeline: 'semantic-v2', mode: 'deterministic', rowsPerEntity: 10 }
        );
        const rows = result.resources.TravelAgency;
        expect(rows).toHaveLength(10);
        const values = rows.map((row) => row[`${kind}ID`]);
        expect(new Set(values).size).toBe(10);
        expect(values.every((value) => typeof value === 'string' && value.length <= maxLength)).toBe(true);
    });
});
