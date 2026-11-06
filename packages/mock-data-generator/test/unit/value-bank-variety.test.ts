import { packagedBanks } from '../../src/semantics/bank-store.js';
import { generateServiceForTesting } from '../../src/index.js';
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
    return generateServiceForTesting(
        {
            metadata: { format: 'edmx', content: metadata },
            service: { urlPath: '/orders', odataVersion: '4.0' },
            targets: [{ name: target, kind: 'entity-set' }],
            existingData: {}
        },
        { mode: 'deterministic', seed: 5, rowsPerEntity: 10 }
    );
}

describe('value bank variety', () => {
    it('varies the descriptions a host supplies across rows instead of repeating the first one', () => {
        // Given a host sample set with its own descriptions
        const property = {
            name: 'Description',
            primitiveType: 'string',
            isKey: false,
            nullable: true,
            maxLength: 60
        } as SchemaProperty;
        const hostDataset = {
            ...packagedBanks().defaultSampleDataset,
            id: 'host-samples',
            descriptions: Array.from(
                { length: 12 },
                (_unused, index) => `Host description ${String.fromCodePoint(65 + index)}`
            )
        };

        // When ten rows draw a description
        const values = new Set(
            Array.from({ length: 10 }, (_unused, row) => {
                const hash = 1_000 + row * 7_919;
                return semanticValue('description', property, semanticRowContext(hash, hostDataset), hash, row);
            })
        );

        // Then they vary
        expect(values.size).toBeGreaterThanOrEqual(5);
    });

    it('writes no free text from the packaged sample set, whose texts fit no particular service', () => {
        // Given a description field and the packaged sample set
        const property = {
            name: 'Description',
            primitiveType: 'string',
            isKey: false,
            nullable: true,
            annotations: []
        } as SchemaProperty;

        // Then no narrative role takes a packaged text
        for (const role of ['description', 'long_text', 'notes', 'comment', 'remark']) {
            expect(semanticValue(role, property, semanticRowContext(1), 1, 0)).toBeUndefined();
        }
    });

    it('names products, equipment, sources and accounts only from the role samples a host supplies', () => {
        // Given a name field, the packaged sample set and a host sample set with product names
        const property = {
            name: 'Name',
            primitiveType: 'string',
            isKey: false,
            nullable: true,
            annotations: []
        } as SchemaProperty;
        const hostDataset = {
            ...packagedBanks().defaultSampleDataset,
            id: 'host-samples',
            roleSamples: { product_name: ['Host product'] }
        };

        // Then the packaged set names none of them: which ones a service has depends on its domain
        for (const role of ['product_name', 'equipment_name', 'source_name', 'account_description']) {
            expect(semanticValue(role, property, semanticRowContext(1), 1, 0)).toBeUndefined();
        }
        // And the host's samples are written
        expect(semanticValue('product_name', property, semanticRowContext(1, hostDataset), 1, 0)).toBe('Host product');
    });

    it('writes no value cut to the length of a field, since a cut value is another value', () => {
        // Given a one-character language field and a three-character organization field
        const field = (name: string, maxLength: number) =>
            ({
                name,
                primitiveType: 'string',
                isKey: false,
                nullable: true,
                maxLength,
                annotations: []
            }) as SchemaProperty;

        // Then no row writes a language code or an organization name cut to fit
        for (let row = 0; row < 20; row++) {
            const hash = 1_000 + row * 7_919;
            const context = semanticRowContext(hash);
            expect(semanticValue('language', field('Language', 1), context, hash, row)).toBeUndefined();
            expect(semanticValue('org_name', field('Company', 3), context, hash, row)).toBeUndefined();
        }
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
