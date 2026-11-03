import { jest } from '@jest/globals';

const mockResolveApplication = jest.fn<any>();
const mockGenerateBuildingBlock = jest.fn<any>().mockResolvedValue(undefined);

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
});
