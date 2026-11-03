import { buildBuildingBlockSchema } from '../../../../../src/tools/functionalities/building-block/schema.js';

const schema = buildBuildingBlockSchema();

describe('buildBuildingBlockSchema', () => {
    test('accepts a minimal Table and passes extra properties through (looseObject)', () => {
        const result = schema.parse({
            viewOrFragmentPath: 'webapp/ext/Main.view.xml',
            aggregationPath: '/mvc:View/content',
            buildingBlockData: {
                buildingBlockType: 'table',
                metaPath: '/Products/@com.sap.vocabularies.UI.v1.LineItem',
                // not declared in the schema — must still be preserved for generateBuildingBlock
                filterBar: 'myFilterBar'
            }
        }) as any;
        expect(result.buildingBlockData.metaPath).toBe('/Products/@com.sap.vocabularies.UI.v1.LineItem');
        expect(result.buildingBlockData.filterBar).toBe('myFilterBar');
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
