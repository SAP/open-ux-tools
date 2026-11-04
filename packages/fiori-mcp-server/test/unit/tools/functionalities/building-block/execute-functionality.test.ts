import { jest } from '@jest/globals';

const mockResolveApplication = jest.fn<any>();
const mockGenerateBuildingBlock = jest.fn<any>().mockResolvedValue(undefined);
// Mirrors fe-fpm-writer's createIdGenerator: a function that returns a collision-safe id for a base id.
// Defaults to pass-through; individual tests override it to simulate a collision bump.
const mockGenerateId = jest.fn<any>((baseId: string) => baseId);

const BuildingBlockType = {
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
};

jest.unstable_mockModule('@sap-ux/fe-fpm-writer', () => ({
    BuildingBlockType,
    generateBuildingBlock: mockGenerateBuildingBlock,
    getFragmentAndViewFiles: async () => [],
    createIdGenerator: async () => mockGenerateId,
    getXPathStringsForXmlFile: () => ({ inputChoices: {} }),
    MIN_UI5_VERSION_RICH_TEXT_EDITOR: '1.117.0',
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK: '1.136.0',
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT: '1.145.0'
}));

const actualUtils = await import('../../../../../src/utils/index.js');
jest.unstable_mockModule('../../../../../src/utils/index.js', () => ({
    ...actualUtils,
    resolveApplication: mockResolveApplication
}));

const { executeFunctionality } =
    await import('../../../../../src/tools/functionalities/building-block/execute-functionality.js');

const tableParams = {
    viewOrFragmentPath: 'webapp/ext/Main.view.xml',
    aggregationPath: '/mvc:View/content',
    buildingBlockData: { buildingBlockType: 'table', metaPath: '/Products/@com.sap.vocabularies.UI.v1.LineItem' }
};

describe('building-block executeFunctionality', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the id generator to pass-through (clearAllMocks keeps implementations, so re-establish it).
        mockGenerateId.mockImplementation((baseId: string) => baseId);
        // Default: a project without applicationAccess so the annotation phase is skipped.
        mockResolveApplication.mockResolvedValue({ root: '/project', appId: 'app' });
    });

    test('returns an error when the project cannot be resolved', async () => {
        mockResolveApplication.mockResolvedValue(undefined);
        const result = await executeFunctionality({
            functionalityId: 'add-building-block',
            appPath: '/bad/path',
            parameters: tableParams
        } as any);
        expect(result.status).toBe('error');
        expect(result.message).toContain('not valid');
        expect(mockGenerateBuildingBlock).not.toHaveBeenCalled();
    });

    test('rejects a viewOrFragmentPath that escapes the app root before any write', async () => {
        const result = await executeFunctionality({
            functionalityId: 'add-building-block',
            appPath: '/project/app',
            parameters: { ...tableParams, viewOrFragmentPath: '../../etc/passwd' }
        } as any);
        expect(result.status).toBe('error');
        expect(result.message).toContain('resolves outside the application root');
        expect(mockGenerateBuildingBlock).not.toHaveBeenCalled();
    });

    test('calls generateBuildingBlock with the normalized relative path', async () => {
        await executeFunctionality({
            functionalityId: 'add-building-block',
            appPath: '/project/app',
            parameters: tableParams
        } as any);
        expect(mockGenerateBuildingBlock).toHaveBeenCalledTimes(1);
        const [basePath, config] = mockGenerateBuildingBlock.mock.calls[0];
        expect(basePath).toBe('/project');
        expect(config.viewOrFragmentPath).toBe('webapp/ext/Main.view.xml');
    });

    test('sets replace:true for a Page building block', async () => {
        await executeFunctionality({
            functionalityId: 'add-building-block',
            appPath: '/project/app',
            parameters: {
                viewOrFragmentPath: 'webapp/ext/Custom.view.xml',
                aggregationPath: '/mvc:View/Page',
                buildingBlockData: { buildingBlockType: 'page' }
            }
        } as any);
        const [, config] = mockGenerateBuildingBlock.mock.calls[0];
        expect(config.replace).toBe(true);
    });

    test('routes an omitted id through the id generator so repeated same-type adds stay unique', async () => {
        // Simulate a view that already contains id="table" — the generator bumps the default to "table1".
        mockGenerateId.mockReturnValue('table1');
        await executeFunctionality({
            functionalityId: 'add-building-block',
            appPath: '/project/app',
            parameters: tableParams
        } as any);
        // The bare type string is what gets deduplicated, and the unique result becomes the block id.
        expect(mockGenerateId).toHaveBeenCalledWith('table');
        const [, config] = mockGenerateBuildingBlock.mock.calls[0];
        expect(config.buildingBlockData.id).toBe('table1');
    });

    test('respects an explicitly supplied id without routing it through the id generator', async () => {
        await executeFunctionality({
            functionalityId: 'add-building-block',
            appPath: '/project/app',
            parameters: {
                ...tableParams,
                buildingBlockData: { ...tableParams.buildingBlockData, id: 'myTable' }
            }
        } as any);
        const [, config] = mockGenerateBuildingBlock.mock.calls[0];
        expect(config.buildingBlockData.id).toBe('myTable');
        expect(mockGenerateId).not.toHaveBeenCalledWith('table');
    });
});
