import type {
    AbapServiceProvider,
    ExternalService,
    ExternalServiceReference,
    ValueListReference,
    CodeListReference,
    ValueListService
} from '@sap-ux/axios-extension';
import { PromptState } from '../../src/data-download/prompt-state';
import { getValueHelpSelectionPrompt } from '../../src/data-download/prompts/value-help-prompts';

// Mock dependencies
jest.mock('@sap-ux/annotation-converter', () => ({
    convert: jest.fn()
}));

jest.mock('@sap-ux/edmx-parser', () => ({
    parse: jest.fn()
}));

jest.mock('@sap-ux/odata-service-writer', () => ({
    getExternalServiceReferences: jest.fn()
}));

jest.mock('../../src/utils/i18n', () => ({
    t: jest.fn((key: string) => key)
}));

import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import { getExternalServiceReferences } from '@sap-ux/odata-service-writer';
import { t } from '../../src/utils/i18n';

const mockConvert = convert as jest.MockedFunction<typeof convert>;
const mockParse = parse as jest.MockedFunction<typeof parse>;
const mockGetExternalServiceReferences = getExternalServiceReferences as jest.MockedFunction<
    typeof getExternalServiceReferences
>;
const mockT = t as jest.MockedFunction<typeof t>;

// Helper function to create mock ValueListReference
function createValueListRef(target: string, servicePath: string = '/sap/opu/odata/sap/VH_SERVICE'): ValueListReference {
    return {
        type: 'value-list',
        serviceRootPath: servicePath,
        target,
        value: `${servicePath};v=0001/$metadata`
    };
}

// Helper function to create mock CodeListReference
function createCodeListRef(
    collectionPath: string,
    servicePath: string = '/sap/opu/odata/sap/CODELIST_SERVICE'
): CodeListReference {
    return {
        type: 'code-list',
        serviceRootPath: servicePath,
        value: `${servicePath}/$metadata`,
        collectionPath
    };
}

// Helper function to create mock ExternalService (ValueListService)
function createValueListService(
    path: string,
    metadata: string = '<edmx:Edmx>VH metadata</edmx:Edmx>',
    target: string = 'TestTarget'
): ValueListService {
    return {
        type: 'value-list',
        target,
        metadata,
        path
    };
}

// Helper function to extract choices from a question
function getChoices(question: any): any[] {
    const choicesFn = question.choices;
    return typeof choicesFn === 'function' ? choicesFn({}) : choicesFn;
}

describe('value-help-prompts', () => {
    const mockServicePath = '/sap/opu/odata/sap/TEST_SERVICE';
    const mockMetadata = '<edmx:Edmx>mock metadata</edmx:Edmx>';

    let mockAbapServiceProvider: jest.Mocked<AbapServiceProvider>;

    beforeEach(() => {
        jest.clearAllMocks();
        PromptState.resetServiceCaches();

        mockAbapServiceProvider = {
            get: jest.fn(),
            fetchExternalServices: jest.fn()
        } as unknown as jest.Mocked<AbapServiceProvider>;

        mockT.mockImplementation((key: string) => key);
    });

    afterAll(() => {
        PromptState.resetServiceCaches();
    });

    describe('getValueHelpSelectionPrompt', () => {
        it('should return a checkbox question with correct properties', () => {
            mockGetExternalServiceReferences.mockReturnValue([]);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);

            expect(result.questions).toHaveLength(1);
            expect(result.questions[0].name).toBe('valueHelpSelection');
            expect(result.questions[0].type).toBe('checkbox');
            expect(result.questions[0].message).toBe('prompts.valueHelpSelection.message');
            expect(result.valueHelpData).toEqual([]);
        });

        it('should reset PromptState when called', () => {
            PromptState.externalServiceRequestCache = { '/some/path': ['Entity1'] };
            mockGetExternalServiceReferences.mockReturnValue([]);

            getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);

            expect(PromptState.externalServiceRequestCache).toEqual({});
        });

        it('should return empty choices when no external service references exist', () => {
            mockGetExternalServiceReferences.mockReturnValue([]);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            expect(choices).toEqual([]);
        });

        it('should create choices from value-list references', () => {
            // Use different service paths to ensure separate choices
            const mockValueListRefs: ExternalServiceReference[] = [
                createValueListRef('Travel/AgencyID', '/sap/opu/odata/sap/VH_SERVICE1'),
                createValueListRef('Travel/CustomerID', '/sap/opu/odata/sap/VH_SERVICE2')
            ];
            mockGetExternalServiceReferences.mockReturnValue(mockValueListRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            expect(choices).toHaveLength(2);
            const choiceNames = (choices as any[]).map((c: any) => c.name);
            expect(choiceNames.some((name: string) => name.includes('AgencyID'))).toBe(true);
            expect(choiceNames.some((name: string) => name.includes('CustomerID'))).toBe(true);
        });

        it('should group value-list references by service path and target entity', () => {
            const mockValueListRefs: ExternalServiceReference[] = [
                createValueListRef('Travel/AgencyID'),
                createValueListRef('Booking/AgencyID')
            ];
            mockGetExternalServiceReferences.mockReturnValue(mockValueListRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            // Both should be grouped under AgencyID since they have the same target entity name
            expect(choices).toHaveLength(1);
            expect((choices as any[])[0].name).toContain('AgencyID');
            expect((choices as any[])[0].value).toHaveLength(2);
        });

        it('should create choices from code-list references', () => {
            const mockCodeListRefs: ExternalServiceReference[] = [
                createCodeListRef('Currencies'),
                createCodeListRef('UnitsOfMeasure')
            ];
            mockGetExternalServiceReferences.mockReturnValue(mockCodeListRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            // Code lists from the same service should be grouped together
            expect(choices).toHaveLength(1);
            expect((choices as any[])[0].name).toContain('Code list');
        });

        it('should exclude I_DraftAdministrativeData from value-list choices', () => {
            const mockValueListRefs: ExternalServiceReference[] = [
                createValueListRef('I_DraftAdministrativeData'),
                createValueListRef('Travel/AgencyID')
            ];
            mockGetExternalServiceReferences.mockReturnValue(mockValueListRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            expect(choices).toHaveLength(1);
            expect((choices as any[])[0].name).toContain('AgencyID');
            expect((choices as any[])[0].name).not.toContain('DraftAdministrativeData');
        });

        it('should sort choices alphabetically by name', () => {
            // Use different service paths to ensure separate choices
            const mockValueListRefs: ExternalServiceReference[] = [
                createValueListRef('Travel/CustomerID', '/sap/opu/odata/sap/VH_SERVICE1'),
                createValueListRef('Travel/AgencyID', '/sap/opu/odata/sap/VH_SERVICE2'),
                createValueListRef('Travel/BookingID', '/sap/opu/odata/sap/VH_SERVICE3')
            ];
            mockGetExternalServiceReferences.mockReturnValue(mockValueListRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            expect((choices as any[])[0].name).toContain('AgencyID');
            expect((choices as any[])[1].name).toContain('BookingID');
            expect((choices as any[])[2].name).toContain('CustomerID');
        });

        describe('validate function', () => {
            it('should return true and reset PromptState when no value helps are selected', async () => {
                mockGetExternalServiceReferences.mockReturnValue([]);

                const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
                const validateFn = result.questions[0].validate;

                const validationResult = await validateFn?.([], {});

                expect(validationResult).toBe(true);
                expect(PromptState.externalServiceRequestCache).toEqual({});
            });

            it('should return true when empty array is selected', async () => {
                mockGetExternalServiceReferences.mockReturnValue([]);

                const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
                const validateFn = result.questions[0].validate;

                const validationResult = await validateFn?.([], {});

                expect(validationResult).toBe(true);
            });

            it('should fetch external service metadata when value helps are selected', async () => {
                const mockValueListRef = createValueListRef('Travel/AgencyID');
                mockGetExternalServiceReferences.mockReturnValue([mockValueListRef]);

                const mockExternalServiceData: ExternalService[] = [
                    createValueListService('/sap/opu/odata/sap/VH_SERVICE;v=0001')
                ];
                mockAbapServiceProvider.fetchExternalServices.mockResolvedValue(mockExternalServiceData);

                mockParse.mockReturnValue({} as any);
                mockConvert.mockReturnValue({
                    entitySets: [{ name: 'AgencyVH' }]
                } as any);

                mockAbapServiceProvider.get.mockResolvedValue({
                    data: { value: [{ ID: '1', Name: 'Agency 1' }] }
                } as any);

                const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
                const validateFn = result.questions[0].validate;

                const selectedValueHelps = [[mockValueListRef]];
                const validationResult = await validateFn?.(selectedValueHelps, {});

                expect(validationResult).toBe(true);
                expect(mockAbapServiceProvider.fetchExternalServices).toHaveBeenCalledWith([mockValueListRef]);
            });

            it('should fetch entity data for each entity set in the external service', async () => {
                const mockValueListRef = createValueListRef('Travel/AgencyID');
                mockGetExternalServiceReferences.mockReturnValue([mockValueListRef]);

                const mockExternalServiceData: ExternalService[] = [
                    createValueListService('/sap/opu/odata/sap/VH_SERVICE;v=0001')
                ];
                mockAbapServiceProvider.fetchExternalServices.mockResolvedValue(mockExternalServiceData);

                mockParse.mockReturnValue({} as any);
                mockConvert.mockReturnValue({
                    entitySets: [{ name: 'AgencyVH' }, { name: 'CustomerVH' }]
                } as any);

                mockAbapServiceProvider.get.mockResolvedValue({
                    data: { value: [{ ID: '1', Name: 'Test' }] }
                } as any);

                const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
                const validateFn = result.questions[0].validate;

                const selectedValueHelps = [[mockValueListRef]];
                await validateFn?.(selectedValueHelps, {});

                expect(mockAbapServiceProvider.get).toHaveBeenCalledTimes(2);
                expect(mockAbapServiceProvider.get).toHaveBeenCalledWith(
                    expect.stringContaining('AgencyVH'),
                    expect.any(Object)
                );
                expect(mockAbapServiceProvider.get).toHaveBeenCalledWith(
                    expect.stringContaining('CustomerVH'),
                    expect.any(Object)
                );
            });

            it('should cache entity requests to avoid duplicate fetches', async () => {
                const mockValueListRef = createValueListRef('Travel/AgencyID');
                mockGetExternalServiceReferences.mockReturnValue([mockValueListRef]);

                const mockExternalServiceData: ExternalService[] = [
                    createValueListService('/sap/opu/odata/sap/VH_SERVICE;v=0001')
                ];
                mockAbapServiceProvider.fetchExternalServices.mockResolvedValue(mockExternalServiceData);

                mockParse.mockReturnValue({} as any);
                mockConvert.mockReturnValue({
                    entitySets: [{ name: 'AgencyVH' }]
                } as any);

                mockAbapServiceProvider.get.mockResolvedValue({
                    data: { value: [{ ID: '1', Name: 'Test' }] }
                } as any);

                // Pre-populate the cache
                PromptState.externalServiceRequestCache['/sap/opu/odata/sap/VH_SERVICE'] = ['AgencyVH'];

                const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
                // Reset is called in getValueHelpSelectionPrompt, so we need to set cache after
                PromptState.externalServiceRequestCache['/sap/opu/odata/sap/VH_SERVICE'] = ['AgencyVH'];

                const validateFn = result.questions[0].validate;
                const selectedValueHelps = [[mockValueListRef]];
                await validateFn?.(selectedValueHelps, {});

                // Should not fetch again since it's cached
                expect(mockAbapServiceProvider.get).not.toHaveBeenCalled();
            });

            it('should handle multiple selected value helps', async () => {
                const mockValueListRef1 = createValueListRef('Travel/AgencyID', '/sap/opu/odata/sap/VH_SERVICE1');
                const mockValueListRef2 = createValueListRef('Travel/CustomerID', '/sap/opu/odata/sap/VH_SERVICE2');
                mockGetExternalServiceReferences.mockReturnValue([mockValueListRef1, mockValueListRef2]);

                const mockExternalServiceData: ExternalService[] = [
                    createValueListService('/sap/opu/odata/sap/VH_SERVICE1;v=0001'),
                    createValueListService('/sap/opu/odata/sap/VH_SERVICE2;v=0001')
                ];
                mockAbapServiceProvider.fetchExternalServices.mockResolvedValue(mockExternalServiceData);

                mockParse.mockReturnValue({} as any);
                mockConvert.mockReturnValue({
                    entitySets: [{ name: 'TestVH' }]
                } as any);

                mockAbapServiceProvider.get.mockResolvedValue({
                    data: { value: [{ ID: '1', Name: 'Test' }] }
                } as any);

                const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
                const validateFn = result.questions[0].validate;

                const selectedValueHelps = [[mockValueListRef1], [mockValueListRef2]];
                const validationResult = await validateFn?.(selectedValueHelps, {});

                expect(validationResult).toBe(true);
                expect(mockAbapServiceProvider.fetchExternalServices).toHaveBeenCalledWith([
                    mockValueListRef1,
                    mockValueListRef2
                ]);
            });

            it('should populate valueHelpData with fetched entity data', async () => {
                const mockValueListRef = createValueListRef('Travel/AgencyID');
                mockGetExternalServiceReferences.mockReturnValue([mockValueListRef]);

                const mockExternalServiceData: ExternalService[] = [
                    createValueListService('/sap/opu/odata/sap/VH_SERVICE;v=0001')
                ];
                mockAbapServiceProvider.fetchExternalServices.mockResolvedValue(mockExternalServiceData);

                mockParse.mockReturnValue({} as any);
                mockConvert.mockReturnValue({
                    entitySets: [{ name: 'AgencyVH' }]
                } as any);

                const mockEntityData = [{ ID: '1', Name: 'Agency 1' }];
                mockAbapServiceProvider.get.mockResolvedValue({
                    data: { value: mockEntityData }
                } as any);

                const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
                const validateFn = result.questions[0].validate;

                const selectedValueHelps = [[mockValueListRef]];
                await validateFn?.(selectedValueHelps, {});

                expect(result.valueHelpData).toBeDefined();
                expect(result.valueHelpData?.length).toBeGreaterThan(0);
            });

            it('should handle errors gracefully when fetching entity data fails', async () => {
                const mockValueListRef = createValueListRef('Travel/AgencyID');
                mockGetExternalServiceReferences.mockReturnValue([mockValueListRef]);

                const mockExternalServiceData: ExternalService[] = [
                    createValueListService('/sap/opu/odata/sap/VH_SERVICE;v=0001')
                ];
                mockAbapServiceProvider.fetchExternalServices.mockResolvedValue(mockExternalServiceData);

                mockParse.mockReturnValue({} as any);
                mockConvert.mockReturnValue({
                    entitySets: [{ name: 'AgencyVH' }]
                } as any);

                mockAbapServiceProvider.get.mockRejectedValue(new Error('Network error'));

                const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
                const validateFn = result.questions[0].validate;

                const selectedValueHelps = [[mockValueListRef]];
                // Should not throw, uses Promise.allSettled
                const validationResult = await validateFn?.(selectedValueHelps, {});

                expect(validationResult).toBe(true);
            });
        });
    });

    describe('getValueHelpChoices (internal function tested via getValueHelpSelectionPrompt)', () => {
        it('should handle mixed value-list and code-list references', () => {
            const mockRefs: ExternalServiceReference[] = [
                createValueListRef('Travel/AgencyID'),
                createCodeListRef('Currencies')
            ];
            mockGetExternalServiceReferences.mockReturnValue(mockRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            expect(choices).toHaveLength(2);
            const choiceNames = (choices as any[]).map((c) => c.name);
            expect(choiceNames.some((name: string) => name.includes('AgencyID'))).toBe(true);
            expect(choiceNames.some((name: string) => name.includes('Code list'))).toBe(true);
        });

        it('should handle value-list references with complex target paths', () => {
            const mockRefs: ExternalServiceReference[] = [createValueListRef('com.sap.namespace/Travel/AgencyID')];
            mockGetExternalServiceReferences.mockReturnValue(mockRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            expect(choices).toHaveLength(1);
            expect((choices as any[])[0].name).toContain('AgencyID');
        });

        it('should strip version parameters from service paths when grouping', () => {
            // When refs have the same service path (after stripping version params) and same target entity,
            // they should be grouped together
            const mockRefs: ExternalServiceReference[] = [
                {
                    type: 'value-list',
                    serviceRootPath: '/sap/opu/odata/sap/VH_SERVICE',
                    target: 'Travel/AgencyID',
                    value: '/sap/opu/odata/sap/VH_SERVICE;v=0001;other=param/$metadata'
                },
                {
                    type: 'value-list',
                    serviceRootPath: '/sap/opu/odata/sap/VH_SERVICE',
                    target: 'Booking/AgencyID',
                    value: '/sap/opu/odata/sap/VH_SERVICE;v=0001;other=param/$metadata'
                }
            ];
            mockGetExternalServiceReferences.mockReturnValue(mockRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            // Both refs have the same target entity name (AgencyID), so they should be grouped together
            expect(choices).toHaveLength(1);
            expect((choices as any[])[0].name).toContain('AgencyID');
            expect((choices as any[])[0].value).toHaveLength(2);
        });

        it('should include parent path in choice name for value-list references', () => {
            const mockRefs: ExternalServiceReference[] = [createValueListRef('Travel/AgencyID')];
            mockGetExternalServiceReferences.mockReturnValue(mockRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            expect((choices as any[])[0].name).toContain('Travel');
        });

        it('should include collection path in choice name for code-list references', () => {
            const mockRefs: ExternalServiceReference[] = [createCodeListRef('Currencies')];
            mockGetExternalServiceReferences.mockReturnValue(mockRefs);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const choices = getChoices(result.questions[0]);

            expect((choices as any[])[0].name).toContain('Currencies');
        });
    });

    describe('PromptState integration', () => {
        it('should update externalServiceRequestCache during entity data fetch', async () => {
            const mockValueListRef = createValueListRef('Travel/AgencyID');
            mockGetExternalServiceReferences.mockReturnValue([mockValueListRef]);

            const mockExternalServiceData: ExternalService[] = [
                createValueListService('/sap/opu/odata/sap/VH_SERVICE;v=0001')
            ];
            mockAbapServiceProvider.fetchExternalServices.mockResolvedValue(mockExternalServiceData);

            mockParse.mockReturnValue({} as any);
            mockConvert.mockReturnValue({
                entitySets: [{ name: 'AgencyVH' }]
            } as any);

            mockAbapServiceProvider.get.mockResolvedValue({
                data: { value: [{ ID: '1', Name: 'Test' }] }
            } as any);

            const result = getValueHelpSelectionPrompt(mockServicePath, mockMetadata, mockAbapServiceProvider);
            const validateFn = result.questions[0].validate;

            const selectedValueHelps = [[mockValueListRef]];
            await validateFn?.(selectedValueHelps, {});

            expect(PromptState.externalServiceRequestCache['/sap/opu/odata/sap/VH_SERVICE']).toContain('AgencyVH');
        });
    });
});
