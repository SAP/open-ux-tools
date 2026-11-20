import { parseCsn } from '../../src/schema/csn.js';
import { parseEdmx } from '../../src/schema/edmx.js';

// Collation order depends on the host locale ('a' sorts before 'B'); code-point order does not ('B' before 'a').
const CODE_POINT_ORDER = ['Banana', 'apple'];

const edmx = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Test">
<EntityType Name="Fruit"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/></EntityType>
<EntityContainer Name="Container"><EntitySet Name="apple" EntityType="Test.Fruit"/><EntitySet Name="Banana" EntityType="Test.Fruit"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const csn = JSON.stringify({
    definitions: {
        'demo.apple': { kind: 'entity', elements: { ID: { key: true, type: 'cds.Integer' } } },
        'demo.Banana': {
            kind: 'entity',
            elements: {
                ID: { key: true, type: 'cds.Integer' },
                zeta: { type: 'cds.String' },
                Alpha: { type: 'cds.String' }
            }
        }
    }
});

describe('locale-independent schema order', () => {
    it('orders EDMX entity sets by code point', () => {
        // Given entity sets whose names differ in letter case
        // When the metadata is parsed
        const graph = parseEdmx(edmx);
        // Then they are ordered by code point, whatever the host locale
        expect(graph.entities.map(({ entitySetName }) => entitySetName)).toEqual(CODE_POINT_ORDER);
    });

    it('orders CSN entity sets and properties by code point', () => {
        // Given CSN entities and elements whose names differ in letter case
        // When the model is parsed
        const graph = parseCsn(csn);
        // Then entity sets and properties are ordered by code point
        expect(graph.entities.map(({ entitySetName }) => entitySetName)).toEqual(CODE_POINT_ORDER);
        const banana = graph.entities.find(({ entitySetName }) => entitySetName === 'Banana');
        expect(banana?.properties.map(({ name }) => name)).toEqual(['Alpha', 'ID', 'zeta']);
    });
});
