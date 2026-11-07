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

    test('requires a title for a Page and does not declare metaPath/contextPath', () => {
        expect(() =>
            schema.parse({
                viewOrFragmentPath: 'v.xml',
                aggregationPath: '/mvc:View/Page',
                buildingBlockData: { buildingBlockType: 'page' }
            })
        ).toThrow();
        const result = schema.parse({
            viewOrFragmentPath: 'v.xml',
            aggregationPath: '/mvc:View/Page',
            buildingBlockData: { buildingBlockType: 'page', title: 'My Page', templateType: 'basic' }
        }) as any;
        expect(result.buildingBlockData.title).toBe('My Page');
        expect(result.buildingBlockData.templateType).toBe('basic');
    });

    test('requires buttonGroups for RichTextEditorButtonGroups', () => {
        expect(() =>
            schema.parse({
                viewOrFragmentPath: 'v.xml',
                aggregationPath: '/x',
                buildingBlockData: { buildingBlockType: 'rich-text-editor-button-groups' }
            })
        ).toThrow();
        const result = schema.parse({
            viewOrFragmentPath: 'v.xml',
            aggregationPath: '/x',
            buildingBlockData: {
                buildingBlockType: 'rich-text-editor-button-groups',
                buttonGroups: [{ name: 'font-style', buttons: 'bold,italic,underline' }]
            }
        }) as any;
        expect(result.buildingBlockData.buttonGroups[0].name).toBe('font-style');
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
