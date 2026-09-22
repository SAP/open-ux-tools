import { generateService } from '../../src/index.js';
import type { ExistingMockData, MockDataRow } from '../../src/types.js';

// Applications often ship mock data written by earlier tools: placeholder values made from the column
// name and a row number, columns the current metadata no longer declares, and values outside the
// declared facets. Those rows are published as written and must never stop generation.
const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Contact"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Email" Type="Edm.String" MaxLength="60"><Annotation Term="Communication.IsEmailAddress"/></Property>
<Property Name="Code" Type="Edm.String" MaxLength="2"/>
<Property Name="NumberOfNotes" Type="Edm.Int32"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Contacts" EntityType="Demo.Contact"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

function supplied(rows: MockDataRow[]): Record<string, ExistingMockData> {
    return { Contacts: { contributor: { present: false }, initialRows: { source: 'json', present: true, rows } } };
}

async function generate(rows: MockDataRow[]) {
    return generateService(
        {
            metadata: { format: 'edmx', content: metadata },
            service: { urlPath: '/contacts', odataVersion: '4.0' },
            targets: [{ name: 'Contacts', kind: 'entity-set' }],
            existingData: supplied(rows)
        },
        { pipeline: 'semantic-v2', seed: 11, rowsPerEntity: 4 }
    );
}

describe('supplied rows', () => {
    it('publishes placeholder rows as written and stops claiming the format they contradict', async () => {
        // Given a placeholder row, an undeclared column and a value longer than its column allows
        const row = { ID: 1, Email: 'Ema1', Code: 'Cod1', NumberOfNotes: 5, LegacyColumn: 'Leg1' };

        // When the service is generated
        const result = await generate([row]);

        // Then the row is published unchanged, derived counts included, and the rest is generated
        expect(result.resources.Contacts).toHaveLength(4);
        expect(result.resources.Contacts[0]).toEqual(row);
        // And the email format is not claimed for a column that holds a non-address
        expect(result.semanticRoles?.['Contacts.Email']).toBeUndefined();
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'SEMANTIC_DOMAIN_UNAVAILABLE', target: 'Contacts.Email' })
        );
    });

    it('keeps the format when the supplied rows follow it', async () => {
        // Given a supplied row with a real address
        const result = await generate([{ ID: 1, Email: 'ana.silva@example.com', Code: 'AB', NumberOfNotes: 0 }]);

        // Then the column keeps its role and every generated address is valid
        expect(result.semanticRoles?.['Contacts.Email']).toBe('email');
        expect(result.resources.Contacts.every(({ Email }) => /^[^@\s]+@[^@\s]+$/u.test(String(Email)))).toBe(true);
    });
});

// A bank and its address share one key; the bank points at its address.
const banks = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Bank"><Key><PropertyRef Name="Country"/><PropertyRef Name="BankID"/></Key>
<Property Name="Country" Type="Edm.String" Nullable="false" MaxLength="3"/>
<Property Name="BankID" Type="Edm.String" Nullable="false" MaxLength="15"/>
<Property Name="BankName" Type="Edm.String" MaxLength="60"/>
<NavigationProperty Name="_Address" Type="Demo.BankAddress"><ReferentialConstraint Property="Country" ReferencedProperty="Country"/><ReferentialConstraint Property="BankID" ReferencedProperty="BankID"/></NavigationProperty>
</EntityType>
<EntityType Name="BankAddress"><Key><PropertyRef Name="Country"/><PropertyRef Name="BankID"/></Key>
<Property Name="Country" Type="Edm.String" Nullable="false" MaxLength="3"/>
<Property Name="BankID" Type="Edm.String" Nullable="false" MaxLength="15"/>
<Property Name="CityName" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Banks" EntityType="Demo.Bank"><NavigationPropertyBinding Path="_Address" Target="BankAddresses"/></EntitySet><EntitySet Name="BankAddresses" EntityType="Demo.BankAddress"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

describe('supplied rows in related sets', () => {
    it('keeps generating related rows beyond the supplied ones', async () => {
        // Given two supplied banks with their two supplied addresses
        const keys = [
            { Country: 'DE', BankID: '10020030' },
            { Country: 'DE', BankID: '20230421' }
        ];
        const existingData: Record<string, ExistingMockData> = {
            Banks: {
                contributor: { present: false },
                initialRows: { source: 'json', present: true, rows: keys.map((key) => ({ ...key, BankName: 'Ban1' })) }
            },
            BankAddresses: {
                contributor: { present: false },
                initialRows: { source: 'json', present: true, rows: keys.map((key) => ({ ...key, CityName: 'Cit1' })) }
            }
        };

        // When both sets are generated
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: banks },
                service: { urlPath: '/banks', odataVersion: '4.0' },
                targets: [
                    { name: 'Banks', kind: 'entity-set' },
                    { name: 'BankAddresses', kind: 'entity-set' }
                ],
                existingData
            },
            { pipeline: 'semantic-v2', seed: 5, rowsPerEntity: 6 }
        );

        // Then each set keeps its supplied rows and is filled to the requested size, every bank still
        // resolves to an address, and no row count is reported as reduced
        expect(result.resources.Banks).toHaveLength(6);
        expect(result.resources.BankAddresses).toHaveLength(6);
        expect(result.resources.BankAddresses.slice(0, 2)).toEqual(keys.map((key) => ({ ...key, CityName: 'Cit1' })));
        const addresses = new Set(result.resources.BankAddresses.map(({ Country, BankID }) => `${Country}/${BankID}`));
        expect(result.resources.Banks.every(({ Country, BankID }) => addresses.has(`${Country}/${BankID}`))).toBe(true);
        expect(result.diagnostics.some(({ code }) => code.startsWith('ROW_COUNT_REDUCED'))).toBe(false);
    });
});
