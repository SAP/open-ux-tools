import {
    buildBuildingBlockSchema,
    buildBuildingBlockMembers
} from '../../../../../src/tools/functionalities/building-block/schema.js';

const schema = buildBuildingBlockSchema();

describe('lean schema: no member advertises metaPath/contextPath (issue #39379 / review C3)', () => {
    const members = buildBuildingBlockMembers();

    test('no building block member declares metaPath or contextPath', () => {
        for (const [type, member] of Object.entries(members)) {
            const keys = Object.keys((member as any).shape);
            expect(`${type}:metaPath=${keys.includes('metaPath')}`).toBe(`${type}:metaPath=false`);
            expect(`${type}:contextPath=${keys.includes('contextPath')}`).toBe(`${type}:contextPath=false`);
        }
    });

    test('members declare only the discriminant, id, and their required fields', () => {
        expect(Object.keys((members['page'] as any).shape).sort()).toEqual(['buildingBlockType', 'id']);
        expect(Object.keys((members['rich-text-editor-button-groups'] as any).shape).sort()).toEqual([
            'buildingBlockType',
            'id'
        ]);
        expect(Object.keys((members['custom-column'] as any).shape).sort()).toEqual([
            'buildingBlockType',
            'header',
            'id'
        ]);
    });
});

describe('buildBuildingBlockSchema', () => {
    test('accepts a minimal Table and passes extra properties through (looseObject)', () => {
        const result = schema.parse({
            viewOrFragmentPath: 'webapp/ext/Main.view.xml',
            aggregationPath: '/mvc:View/content',
            buildingBlockData: {
                buildingBlockType: 'table',
                // not declared in the schema — must still be preserved for generateBuildingBlock
                metaPath: '/Products/@com.sap.vocabularies.UI.v1.LineItem',
                filterBar: 'myFilterBar'
            }
        }) as any;
        expect(result.buildingBlockData.metaPath).toBe('/Products/@com.sap.vocabularies.UI.v1.LineItem');
        expect(result.buildingBlockData.filterBar).toBe('myFilterBar');
    });

    test('accepts a minimal Page (title not required at the schema level — semantics via search_docs)', () => {
        const result = schema.parse({
            viewOrFragmentPath: 'v.xml',
            aggregationPath: '/mvc:View/Page',
            buildingBlockData: { buildingBlockType: 'page', title: 'My Page' }
        }) as any;
        expect(result.buildingBlockData.title).toBe('My Page');
    });

    test('requires header for a CustomColumn', () => {
        expect(() =>
            schema.parse({
                viewOrFragmentPath: 'v.xml',
                aggregationPath: '/x',
                buildingBlockData: { buildingBlockType: 'custom-column' }
            })
        ).toThrow();
    });

    test('requires key and text for an Action', () => {
        expect(() =>
            schema.parse({
                viewOrFragmentPath: 'v.xml',
                aggregationPath: '/x',
                buildingBlockData: { buildingBlockType: 'action', key: 'k' }
            })
        ).toThrow();
        expect(
            schema.parse({
                viewOrFragmentPath: 'v.xml',
                aggregationPath: '/x',
                buildingBlockData: { buildingBlockType: 'action', key: 'k', text: 'Do it' }
            })
        ).toBeDefined();
    });

    test('rejects an unknown buildingBlockType', () => {
        expect(() =>
            schema.parse({
                viewOrFragmentPath: 'v.xml',
                aggregationPath: '/x',
                buildingBlockData: { buildingBlockType: 'not-a-real-type' }
            })
        ).toThrow();
    });

    test('requires the two routing fields', () => {
        expect(() => schema.parse({ buildingBlockData: { buildingBlockType: 'table' } })).toThrow();
    });
});
