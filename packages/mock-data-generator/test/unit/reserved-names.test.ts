import { generateServiceForTesting } from '../../src/index.js';
import { generateService } from '../../src/public.js';
import { parseCsn } from '../../src/schema/csn.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { MockDataServiceRequest, SftGenerator } from '../../src/types.js';

/** Every property a plain JavaScript object inherits, such as `constructor`, `toString` and `__proto__`. */
const INHERITED_NAMES = Object.getOwnPropertyNames(Object.prototype);

const edmx = (types: string, sets: string): string =>
    `<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
<EntityType Name="Order"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="Note" Type="Edm.String" MaxLength="20"/></EntityType>
${types}<EntityContainer Name="Container"><EntitySet Name="Orders" EntityType="Demo.Order"/>${sets}</EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`;

const request = (content: string, targets: ReadonlyArray<string>): MockDataServiceRequest => ({
    metadata: { format: 'edmx', content },
    service: { urlPath: '/demo', odataVersion: '4.0' },
    targets: targets.map((name) => ({ name, kind: 'entity-set' })),
    existingData: {}
});

const csn = (definitions: Record<string, unknown>): string =>
    JSON.stringify({ definitions: { Demo: { kind: 'service' }, ...definitions } });

const INHERITED_REASON = 'name is a property every JavaScript object inherits';

/** An order type with a navigation to the entity set of the given name, and its partner type. */
const LINKED_TYPES =
    '<EntityType Name="Note"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="Order_ID" Type="Edm.Int32"/><NavigationProperty Name="Order" Type="Demo.Order"><ReferentialConstraint Property="Order_ID" ReferencedProperty="ID"/></NavigationProperty></EntityType>';

describe('entity set names that every JavaScript object inherits', () => {
    it.each(INHERITED_NAMES)('skips an EDMX entity set named %s and keeps the others', (name) => {
        // Given EDMX with an entity set of that name next to an ordinary one
        const content = edmx('', `<EntitySet Name="${name}" EntityType="Demo.Order"/>`);

        // When it is parsed
        const graph = parseEdmx(content);

        // Then that entity set is skipped with its reason, and the other one is parsed
        expect(graph.entities.map(({ entitySetName }) => entitySetName)).toEqual(['Orders']);
        expect(graph.skippedEntitySets).toEqual([{ entitySetName: name, reason: INHERITED_REASON }]);
    });

    it.each(INHERITED_NAMES)('skips a CSN entity named %s and keeps the others', (name) => {
        // Given a CAP service with an entity of that name, which another entity references
        const content = csn({
            [`Demo.${name}`]: { kind: 'entity', elements: { ID: { key: true, type: 'cds.Integer' } } },
            'Demo.Orders': {
                kind: 'entity',
                elements: {
                    ID: { key: true, type: 'cds.Integer' },
                    other: { type: 'cds.Association', target: `Demo.${name}`, keys: [{ ref: ['ID'] }] }
                }
            }
        });

        // When it is parsed
        const graph = parseCsn(content);

        // Then that entity is skipped with its reason, and the reference to it leads nowhere
        expect(graph.entities.map(({ entitySetName }) => entitySetName)).toEqual(['Orders']);
        expect(graph.skippedEntitySets).toEqual([{ entitySetName: name, reason: INHERITED_REASON }]);
        expect(graph.relationships).toEqual([]);
    });

    it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
        'generates the other entity sets of a service with an entity set named %s, linked to it or not',
        async (name) => {
            // Given a service whose entity set of that name is targeted and is the target of a navigation binding
            const content = edmx(
                LINKED_TYPES,
                `<EntitySet Name="${name}" EntityType="Demo.Order"/><EntitySet Name="Notes" EntityType="Demo.Note"><NavigationPropertyBinding Path="Order" Target="${name}"/></EntitySet>`
            );

            // When every entity set is generated
            const result = await generateService(request(content, ['Orders', name, 'Notes']), {
                mode: 'deterministic',
                seed: 1,
                rowsPerEntity: 3
            });

            // Then the other entity sets have rows, and the one of that name carries a warning instead of aborting
            expect(Object.keys(result.resources).sort()).toEqual(['Notes', 'Orders']);
            expect(result.resources.Orders).toHaveLength(3);
            expect(result.resources.Notes).toHaveLength(3);
            expect(
                result.diagnostics.filter(({ target }) => target === name).map(({ code, severity }) => [code, severity])
            ).toEqual([['SCHEMA_ENTITY_SET_SKIPPED', 'warning']]);
        }
    );
});

describe('property names that every JavaScript object inherits', () => {
    it('fills a field named constructor with strings when the model value of one row is rejected', async () => {
        // Given an entity whose display field is named constructor, and a model whose second value is not a valid name
        const content = edmx(
            '<EntityType Name="Car"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Guid" Nullable="false"/><Property Name="constructor" Type="Edm.String" MaxLength="40"/><Property Name="Remark" Type="Edm.String" MaxLength="40"/></EntityType>',
            '<EntitySet Name="Cars" EntityType="Demo.Car"/>'
        );
        const sft: SftGenerator = {
            fingerprint: 'reserved-field',
            generate: async () => ({
                rows: [
                    { constructor: 'Scuderia Rossa', Remark: 'Fast lap' },
                    { constructor: 'N/A }', Remark: 'Pit stop' }
                ]
            })
        };

        // When more rows are generated than the model writes, so its accepted values are reused
        const result = await generateServiceForTesting(
            request(content, ['Cars']),
            { seed: 1, rowsPerEntity: 6, sftModelRows: 2 },
            { sft }
        );

        // Then every row carries its own string value for the field
        expect(result.resources.Cars).toHaveLength(6);
        for (const row of result.resources.Cars) {
            expect(Object.hasOwn(row, 'constructor')).toBe(true);
            expect(typeof row.constructor).toBe('string');
        }
    });

    it('does not invent a CSN foreign key for a key reference named __proto__', () => {
        // Given an association whose key reference names no element of the target
        const content = csn({
            'Demo.Authors': { kind: 'entity', elements: { ID: { key: true, type: 'cds.Integer' } } },
            'Demo.Books': {
                kind: 'entity',
                elements: {
                    ID: { key: true, type: 'cds.Integer' },
                    author: { type: 'cds.Association', target: 'Demo.Authors', keys: [{ ref: ['__proto__'] }] }
                }
            }
        });

        // When it is parsed
        const graph = parseCsn(content);

        // Then the source entity gets no column and no relationship for it
        const books = graph.entities.find(({ entitySetName }) => entitySetName === 'Books');
        expect(books?.properties.map(({ name }) => name)).toEqual(['ID']);
        expect(graph.relationships).toEqual([]);
    });
});
