import { jest } from '@jest/globals';
import { AddBuildingBlockInputSchema } from '../../../src/types/input.js';
import type { AddBuildingBlockInput } from '../../../src/types/index.js';

const mockCommit = jest.fn<any>().mockResolvedValue(undefined);
const mockDump = jest.fn<any>().mockReturnValue({});
const mockGenerateBuildingBlock = jest.fn<any>().mockResolvedValue({ commit: mockCommit, dump: mockDump });
const mockCreateIdGenerator = jest.fn<any>().mockResolvedValue(() => 'generated-id');

jest.unstable_mockModule('@sap-ux/fe-fpm-writer', () => ({
    generateBuildingBlock: mockGenerateBuildingBlock,
    createIdGenerator: mockCreateIdGenerator,
    BuildingBlockType: {
        FilterBar: 'filter-bar',
        Chart: 'chart',
        CustomFilterField: 'custom-filter-field',
        CustomFormField: 'custom-form-field',
        Field: 'field',
        Form: 'form',
        Page: 'page',
        Table: 'table',
        CustomColumn: 'custom-column',
        RichTextEditor: 'rich-text-editor',
        RichTextEditorButtonGroups: 'rich-text-editor-button-groups',
        Action: 'action'
    }
}));

const { addBuildingBlock } = await import('../../../src/tools/add-building-block.js');

const baseParams: AddBuildingBlockInput = {
    appPath: '/app',
    viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
    aggregationPath: '/mvc:View/content',
    buildingBlockData: {
        buildingBlockType: 'table',
        id: 'myTable',
        metaPath: '@com.sap.vocabularies.UI.v1.LineItem',
        contextPath: '/SalesOrder'
    }
};

describe('addBuildingBlock', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateBuildingBlock.mockResolvedValue({ commit: mockCommit, dump: mockDump });
        mockCreateIdGenerator.mockResolvedValue(() => 'generated-id');
        mockDump.mockReturnValue({});
        mockCommit.mockResolvedValue(undefined);
    });

    test('returns success with modified files on happy path', async () => {
        mockDump.mockReturnValue({ '/app/webapp/ext/main/Main.view.xml': 'content' });

        const result = await addBuildingBlock(baseParams);

        expect(result.status).toBe('success');
        expect(result.modifiedFiles).toEqual(['webapp/ext/main/Main.view.xml']);
        expect(result.message).toContain('table');
        expect(result.message).toContain('myTable');
    });

    test('calls generateBuildingBlock with correct config', async () => {
        await addBuildingBlock(baseParams);

        expect(mockGenerateBuildingBlock).toHaveBeenCalledWith(
            '/app',
            expect.objectContaining({
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: expect.objectContaining({
                    buildingBlockType: 'table',
                    id: 'myTable',
                    metaPath: '@com.sap.vocabularies.UI.v1.LineItem',
                    contextPath: '/SalesOrder'
                })
            }),
            expect.anything()
        );
    });

    test('returns relative modified file paths', async () => {
        mockDump.mockReturnValue({
            '/app/webapp/ext/main/Main.view.xml': 'content',
            '/app/webapp/manifest.json': 'manifest'
        });

        const result = await addBuildingBlock(baseParams);

        expect(result.modifiedFiles).toEqual([
            'webapp/ext/main/Main.view.xml',
            'webapp/manifest.json'
        ]);
    });

    test('returns empty modifiedFiles when dump returns nothing', async () => {
        mockDump.mockReturnValue({});

        const result = await addBuildingBlock(baseParams);

        expect(result.status).toBe('success');
        expect(result.modifiedFiles).toEqual([]);
    });

    test('returns error status when generateBuildingBlock throws', async () => {
        mockGenerateBuildingBlock.mockRejectedValue(new Error('Invalid aggregation path'));

        const result = await addBuildingBlock(baseParams);

        expect(result.status).toBe('error');
        expect(result.message).toBe('Invalid aggregation path');
        expect(result.modifiedFiles).toEqual([]);
    });

    test('returns error status when commit throws', async () => {
        mockCommit.mockRejectedValue(new Error('Disk write failed'));

        const result = await addBuildingBlock(baseParams);

        expect(result.status).toBe('error');
        expect(result.message).toBe('Disk write failed');
        expect(result.modifiedFiles).toEqual([]);
    });

    test('handles non-Error throws gracefully', async () => {
        mockGenerateBuildingBlock.mockRejectedValue('string error');

        const result = await addBuildingBlock(baseParams);

        expect(result.status).toBe('error');
        expect(result.message).toBe('string error');
    });

    test('works with filter-bar building block type', async () => {
        const params: AddBuildingBlockInput = {
            ...baseParams,
            buildingBlockData: {
                buildingBlockType: 'filter-bar',
                id: 'myFilterBar',
                metaPath: '@com.sap.vocabularies.UI.v1.SelectionFields'
            }
        };

        const result = await addBuildingBlock(params);

        expect(result.status).toBe('success');
        expect(result.message).toContain('filter-bar');
        expect(result.message).toContain('myFilterBar');
    });

    test('RTE with targetProperty passes it as metaPath to generateBuildingBlock', async () => {
        const params: AddBuildingBlockInput = {
            ...baseParams,
            buildingBlockData: {
                buildingBlockType: 'rich-text-editor',
                id: 'myRte',
                targetProperty: '/Products/description'
            }
        };

        await addBuildingBlock(params);

        expect(mockGenerateBuildingBlock).toHaveBeenCalledWith(
            '/app',
            expect.objectContaining({
                buildingBlockData: expect.objectContaining({
                    buildingBlockType: 'rich-text-editor',
                    id: 'myRte',
                    metaPath: '/Products/description'
                })
            }),
            expect.anything()
        );
    });

    test('RTE without targetProperty does not set metaPath', async () => {
        const params: AddBuildingBlockInput = {
            ...baseParams,
            buildingBlockData: {
                buildingBlockType: 'rich-text-editor',
                id: 'myRte'
            }
        };

        await addBuildingBlock(params);

        expect(mockGenerateBuildingBlock).toHaveBeenCalledWith(
            '/app',
            expect.objectContaining({
                buildingBlockData: expect.not.objectContaining({
                    metaPath: expect.any(String)
                })
            }),
            expect.anything()
        );
    });
});

describe('AddBuildingBlockInputSchema', () => {
    describe('required fields', () => {
        test('rejects empty appPath', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: { buildingBlockType: 'table', id: 'myTable' }
            });

            expect(result.success).toBe(false);
        });

        test('rejects empty viewOrFragmentPath', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: '',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: { buildingBlockType: 'table', id: 'myTable' }
            });

            expect(result.success).toBe(false);
        });

        test('rejects empty aggregationPath', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '',
                buildingBlockData: { buildingBlockType: 'table', id: 'myTable' }
            });

            expect(result.success).toBe(false);
        });

        test('rejects missing id on building block', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: { buildingBlockType: 'table' }
            });

            expect(result.success).toBe(false);
        });

        test('rejects empty id on building block', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: { buildingBlockType: 'table', id: '' }
            });

            expect(result.success).toBe(false);
        });
    });

    describe('buildingBlockType discriminant', () => {
        test('rejects unknown buildingBlockType', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: { buildingBlockType: 'unknown-type', id: 'myBB' }
            });

            expect(result.success).toBe(false);
        });

        test('rejects missing buildingBlockType', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: { id: 'myBB' }
            });

            expect(result.success).toBe(false);
        });

        test('accepts types that only require id', () => {
            // custom-* types have additional required fields and are tested separately below
            // form is also tested separately (requires title)
            const typesRequiringOnlyId = [
                'table',
                'chart',
                'filter-bar',
                'field',
                'page',
                'rich-text-editor',
                'rich-text-editor-button-groups'
            ] as const;

            for (const buildingBlockType of typesRequiringOnlyId) {
                const result = AddBuildingBlockInputSchema.safeParse({
                    appPath: '/app',
                    viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                    aggregationPath: '/mvc:View/content',
                    buildingBlockData: { buildingBlockType, id: 'myBB' }
                });

                expect(result.success).toBe(true);
            }
        });

        test('accepts custom-form-field with required label and embededFragment', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'custom-form-field',
                    id: 'myFormField',
                    label: 'My Field',
                    embededFragment: { name: 'MyFormField' }
                }
            });

            expect(result.success).toBe(true);
        });

        test('rejects custom-form-field missing required embededFragment', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'custom-form-field',
                    id: 'myFormField',
                    label: 'My Field'
                }
            });

            expect(result.success).toBe(false);
        });

        test('rejects custom-form-field missing required label', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'custom-form-field',
                    id: 'myFormField'
                }
            });

            expect(result.success).toBe(false);
        });

        test('accepts custom-filter-field with required fields', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'custom-filter-field',
                    id: 'myFilter',
                    anchor: 'someOtherFilter',
                    label: 'My Filter',
                    property: 'Status',
                    required: false,
                    embededFragment: { name: 'MyFilter' }
                }
            });

            expect(result.success).toBe(true);
        });

        test('rejects custom-filter-field missing required anchor', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'custom-filter-field',
                    id: 'myFilter',
                    label: 'My Filter',
                    property: 'Status',
                    required: false
                }
            });

            expect(result.success).toBe(false);
        });

        test('accepts custom-column with required title and embededFragment', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'custom-column',
                    id: 'myColumn',
                    title: 'Status',
                    embededFragment: { name: 'MyColumn' }
                }
            });

            expect(result.success).toBe(true);
        });

        test('rejects custom-column missing required title', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'custom-column',
                    id: 'myColumn'
                }
            });

            expect(result.success).toBe(false);
        });

        test('accepts action with required actionKey and text', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'action',
                    id: 'myAction',
                    actionKey: 'myActionKey',
                    text: 'Click me'
                }
            });

            expect(result.success).toBe(true);
        });

        test('rejects action missing required actionKey', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'action',
                    id: 'myAction',
                    text: 'Click me'
                }
            });

            expect(result.success).toBe(false);
        });

        test('accepts form with required title', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'form',
                    id: 'myForm',
                    title: 'My Form'
                }
            });

            expect(result.success).toBe(true);
        });

        test('rejects form missing required title', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'form',
                    id: 'myForm'
                }
            });

            expect(result.success).toBe(false);
        });
    });

    describe('type-specific field validation', () => {
        test('rejects invalid selectionMode on table', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'table',
                    id: 'myTable',
                    selectionMode: 'InvalidMode'
                }
            });

            expect(result.success).toBe(false);
        });

        test('rejects invalid table type', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'table',
                    id: 'myTable',
                    type: 'TreeTable'
                }
            });

            expect(result.success).toBe(false);
        });

        test('rejects invalid displayMode in field formatOptions', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'field',
                    id: 'myField',
                    formatOptions: { displayMode: 'InvalidMode' }
                }
            });

            expect(result.success).toBe(false);
        });

        test('rejects invalid action placement', () => {
            const result = AddBuildingBlockInputSchema.safeParse({
                appPath: '/app',
                viewOrFragmentPath: 'webapp/ext/main/Main.view.xml',
                aggregationPath: '/mvc:View/content',
                buildingBlockData: {
                    buildingBlockType: 'action',
                    id: 'myAction',
                    actionKey: 'key',
                    text: 'Do it',
                    placement: 'Middle'
                }
            });

            expect(result.success).toBe(false);
        });
    });
});
