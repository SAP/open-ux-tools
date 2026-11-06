import { jest } from '@jest/globals';

import { generateDeterministicResources } from '../../src/generation/deterministic.js';
import { descriptiveKeyNames } from '../../src/generation/key-identity.js';
import { generateServiceForTesting } from '../../src/index.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import type { MockDataServiceRequest, SftGenerator } from '../../src/types.js';

const property = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: false,
    isKey: true,
    annotations: [],
    ...options
});

/**
 * A view whose key is every column: a running number, a name, a price and a flag.
 *
 * @param numberOptions facets of the number column
 * @returns the entity
 */
function view(numberOptions: Partial<SchemaProperty> = {}): SchemaEntity {
    return {
        name: 'ShelfListing',
        entitySetName: 'ShelfListings',
        properties: [
            property('ShelfNumber', { primitiveType: 'int', ...numberOptions }),
            property('ShelfName', { maxLength: 40 }),
            property('ShelfPrice', { primitiveType: 'decimal', precision: 19, scale: 4 }),
            property('Retired', { primitiveType: 'bool' }),
            property('Remark', { isKey: false, nullable: true, maxLength: 40 })
        ]
    };
}

const graphOf = (entity: SchemaEntity, relationships: SchemaGraph['relationships'] = []): SchemaGraph => ({
    namespace: 'Views',
    entities: [entity],
    relationships
});

describe('descriptive key columns', () => {
    it('names the key columns a running number already tells apart', () => {
        // Given a view keyed by a number, a name, a price and a flag
        const graph = graphOf(view());

        // When its descriptive key columns are determined
        const names = descriptiveKeyNames(graph, view());

        // Then the name, price and flag describe the row and the number identifies it
        expect([...names].sort()).toEqual(['Retired', 'ShelfName', 'ShelfPrice']);
    });

    it('keeps every key column allocated when no free integer or UUID key identifies the rows', () => {
        // Given the same view whose number is the end of a relationship, and a key without any number
        const entity = view();
        const related = graphOf(entity, [
            {
                name: 'toShelf',
                fromEntitySet: 'ShelfListings',
                toEntitySet: 'ShelfListings',
                mappings: [{ sourceProperty: 'ShelfNumber', targetProperty: 'ShelfNumber' }]
            } as SchemaGraph['relationships'][number]
        ]);
        const unnumbered: SchemaEntity = { ...entity, properties: entity.properties.slice(1) };

        // When their descriptive key columns are determined
        // Then none is descriptive
        expect(descriptiveKeyNames(related, entity).size).toBe(0);
        expect(descriptiveKeyNames(graphOf(unnumbered), unnumbered).size).toBe(0);
    });

    it('keeps a draft key and a single key allocated', () => {
        // Given a draft entity keyed by a UUID and the draft flag, and an entity with a single key
        const draft: SchemaEntity = {
            name: 'Shelf',
            entitySetName: 'Shelves',
            properties: [
                property('ID', { primitiveType: 'guid' }),
                property('IsActiveEntity', { primitiveType: 'bool' })
            ]
        };
        const single: SchemaEntity = { ...draft, properties: draft.properties.slice(0, 1) };

        // When their descriptive key columns are determined
        // Then none is descriptive
        expect(descriptiveKeyNames(graphOf(draft), draft).size).toBe(0);
        expect(descriptiveKeyNames(graphOf(single), single).size).toBe(0);
    });

    it('generates descriptive key columns like other fields and keeps every key tuple unique', () => {
        // Given the view
        const entity = view();

        // When ten rows are generated
        const rows = generateDeterministicResources(graphOf(entity), [{ name: 'ShelfListings', kind: 'entity-set' }], {
            seed: 7,
            rowsPerEntity: 10
        }).resources.ShelfListings;

        // Then every row is kept, the number identifies each row, the price is not counted up, and the
        // name keeps a non-empty allocated value
        expect(rows).toHaveLength(10);
        expect(new Set(rows.map((row) => row.ShelfNumber)).size).toBe(10);
        const steps = new Set(
            rows.slice(1).map((row, index) => (Number(row.ShelfPrice) - Number(rows[index].ShelfPrice)).toFixed(4))
        );
        expect(steps.size).toBeGreaterThan(1);
        expect(rows.every((row) => typeof row.ShelfName === 'string' && row.ShelfName !== '')).toBe(true);
    });

    it('lets the model replace the allocated values of a descriptive name key', async () => {
        // Given a view keyed by a running number and a shelf name, and a model that names shelves
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Views">
<EntityType Name="ShelfListingType"><Key><PropertyRef Name="ShelfNumber"/><PropertyRef Name="ShelfName"/></Key>
<Property Name="ShelfNumber" Type="Edm.Int32" Nullable="false"/>
<Property Name="ShelfName" Type="Edm.String" MaxLength="40" Nullable="false"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="ShelfListings" EntityType="Views.ShelfListingType"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`
            },
            service: { urlPath: '/shelves', odataVersion: '4.0' },
            targets: [{ name: 'ShelfListings', kind: 'entity-set' }],
            existingData: {}
        };
        const generate = jest.fn<SftGenerator['generate']>(async (input) => ({
            rows: Array.from({ length: input.rowCount ?? 3 }, (_, index) =>
                Object.fromEntries(
                    input.fields.map(({ name }) => [name, `Oak shelf ${['north', 'south', 'east'][index % 3]}`])
                )
            )
        }));

        // When the service is generated with the model
        const result = await generateServiceForTesting(
            request,
            { mode: 'auto', seed: 5, rowsPerEntity: 3 },
            {
                sft: { fingerprint: 'shelf-model', generate },
                candidateVerifier: {
                    fingerprint: 'accepts-everything',
                    verifyBatch: async (pairs) => pairs.map(() => true)
                }
            }
        );

        // Then the model was asked for the name, not as a key, and its names replace the allocated values
        const asked = generate.mock.calls.flatMap(([input]) => input.fields);
        expect(asked).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'ShelfName', isKey: false })]));
        expect(result.resources.ShelfListings.map((row) => row.ShelfName)).toEqual([
            'Oak shelf north',
            'Oak shelf south',
            'Oak shelf east'
        ]);
    });
});
