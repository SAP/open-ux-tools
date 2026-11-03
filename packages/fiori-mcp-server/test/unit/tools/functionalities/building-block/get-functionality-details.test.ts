import { jest } from '@jest/globals';

const mockResolveApplication = jest.fn<any>();

const actualUtils = await import('../../../../../src/utils/index.js');
jest.unstable_mockModule('../../../../../src/utils/index.js', () => ({
    ...actualUtils,
    resolveApplication: mockResolveApplication
}));

const { getFunctionalityDetails, ADD_BUILDING_BLOCK_FUNCTIONALITY } = await import(
    '../../../../../src/tools/functionalities/building-block/get-functionality-details.js'
);

describe('ADD_BUILDING_BLOCK_FUNCTIONALITY descriptor', () => {
    test('is keyed by the add-building-block id and points the LLM at search_docs', () => {
        expect(ADD_BUILDING_BLOCK_FUNCTIONALITY.functionalityId).toBe('add-building-block');
        expect(ADD_BUILDING_BLOCK_FUNCTIONALITY.description).toContain('search_docs');
    });

    test('surfaces the real UI5 version constraints in its description', () => {
        expect(ADD_BUILDING_BLOCK_FUNCTIONALITY.description).toContain('UI5 >= 1.117.0');
        expect(ADD_BUILDING_BLOCK_FUNCTIONALITY.description).toContain('UI5 >= 1.136.0');
        expect(ADD_BUILDING_BLOCK_FUNCTIONALITY.description).toContain('OData V4');
    });
});

describe('building-block getFunctionalityDetails', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns an invalid-path descriptor when the project cannot be resolved', async () => {
        mockResolveApplication.mockResolvedValue(undefined);
        const result = await getFunctionalityDetails({ appPath: '/bad', functionalityId: 'add-building-block' } as any);
        expect(result.name).toBe('Invalid Project Root or Application Path');
        expect(result.description).toContain('not valid');
    });

    test('appends an insertion-points note when there are no view/fragment files', async () => {
        mockResolveApplication.mockResolvedValue({ root: '/project', appId: 'app' });
        const result = await getFunctionalityDetails({
            appPath: '/project/app',
            functionalityId: 'add-building-block'
        } as any);
        expect(result.functionalityId).toBe('add-building-block');
        expect(result.description).toContain('No view/fragment files found');
    });
});
