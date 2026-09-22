import { generateService } from '../../src/index.js';
import type { SchemaProperty } from '../../src/schema/graph.js';
import { semanticRowContext, semanticValue } from '../../src/semantics/value-banks.js';

const metadata =
    `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Order"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Description" Type="Edm.String" MaxLength="60"/>
<Property Name="City" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityType Name="CountryCode"><Key><PropertyRef Name="Country"/></Key>
<Property Name="Country" Type="Edm.String" MaxLength="3" Nullable="false"/>
</EntityType>
<EntityType Name="CurrencyCode"><Key><PropertyRef Name="Currency"/></Key>
<Property Name="Currency" Type="Edm.String" MaxLength="5" Nullable="false"/>
</EntityType>
<EntityContainer Name="Container">
<EntitySet Name="Orders" EntityType="Demo.Order"/>
<EntitySet Name="Countries" EntityType="Demo.CountryCode"/>
<EntitySet Name="Currencies" EntityType="Demo.CurrencyCode"/>
</EntityContainer>
</Schema></edmx:Dataservices></edmx:Edmx>`.replace('</edmx:Dataservices>', '</edmx:DataServices>');

async function generate(target: string) {
    return generateService(
        {
            metadata: { format: 'edmx', content: metadata },
            service: { urlPath: '/orders', odataVersion: '4.0' },
            targets: [{ name: target, kind: 'entity-set' }],
            existingData: {}
        },
        { pipeline: 'semantic-v2', mode: 'deterministic', seed: 5, rowsPerEntity: 10 }
    );
}

describe('value bank variety', () => {
    it('varies descriptive text across rows instead of repeating the first sample', () => {
        const property = {
            name: 'Description',
            primitiveType: 'string',
            isKey: false,
            nullable: true,
            maxLength: 60
        } as SchemaProperty;
        const values = new Set(
            Array.from({ length: 10 }, (_unused, row) => {
                const hash = 1_000 + row * 7_919;
                return semanticValue('description', property, semanticRowContext(hash), hash, row);
            })
        );
        expect(values.size).toBeGreaterThanOrEqual(5);
    });

    it('fills ten rows of a country or currency code list without running out of codes', async () => {
        for (const target of ['Countries', 'Currencies']) {
            const result = await generate(target);
            expect(result.resources[target]).toHaveLength(10);
            expect(result.diagnostics.map(({ code }) => code)).not.toContain(
                'ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN'
            );
        }
    });
});
