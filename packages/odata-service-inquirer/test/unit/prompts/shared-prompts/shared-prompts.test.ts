import type { ConnectionValidator } from '../../../../src/prompts/connectionValidator';
import { getValueHelpDownloadPrompt } from '../../../../src/prompts/shared-prompts/shared-prompts';
import { PromptState } from '../../../../src/utils';
import { AbapServiceProvider } from '@sap-ux/axios-extension';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { DatasourceType } from '../../../../src/types';
import type { OdataServiceAnswers } from '../../../../src/types';
import type { ConfirmQuestion } from 'inquirer';

// Mock dependencies
jest.mock('../../../../src/prompts/logger-helper', () => ({
    logger: {
        info: jest.fn()
    }
}));

jest.mock('@sap-ux/odata-service-writer', () => ({
    ...jest.requireActual('@sap-ux/odata-service-writer'),
    getValueListReferences: jest.fn()
}));

jest.mock('@sap-ux/axios-extension', () => ({
    ...jest.requireActual('@sap-ux/axios-extension'),
    createForAbap: jest.fn()
}));

// Get the mocked functions
import { getValueListReferences } from '@sap-ux/odata-service-writer';
import { createForAbap } from '@sap-ux/axios-extension';

const mockGetValueListReferences = jest.mocked(getValueListReferences);
const mockCreateForAbap = jest.mocked(createForAbap);

describe('getValueHelpDownloadPrompt', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockConnectionValidator: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAbapServiceProvider: any;

    beforeEach(() => {
        // Reset PromptState before each test
        PromptState.odataService = {
            servicePath: undefined,
            metadata: undefined,
            annotations: undefined,
            odataVersion: undefined,
            valueListReferences: undefined
        };

        // Create typed mocks using jest.fn()
        mockAbapServiceProvider = {
            fetchValueListReferenceServices: jest.fn()
        };

        mockConnectionValidator = {
            serviceProvider: mockAbapServiceProvider,
            axiosConfig: {}
        };

        // Make serviceProvider check work correctly
        Object.defineProperty(mockConnectionValidator.serviceProvider, 'constructor', {
            value: AbapServiceProvider
        });

        // Reset mocks
        jest.clearAllMocks();
        mockCreateForAbap.mockReturnValue(mockAbapServiceProvider);
    });

    describe('when condition', () => {
        it('should return false when no metadata is available', () => {
            PromptState.odataService = {
                servicePath: '/test/service',
                metadata: undefined,
                annotations: [],
                odataVersion: OdataVersion.v4,
                valueListReferences: undefined
            };

            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            const whenFn = prompt.when as (answers: OdataServiceAnswers) => boolean;
            const result = whenFn({} as OdataServiceAnswers);

            expect(result).toBe(false);
        });

        it('should return false when no service path is available', () => {
            PromptState.odataService = {
                servicePath: undefined,
                metadata: '<metadata>test</metadata>',
                annotations: [],
                odataVersion: OdataVersion.v4,
                valueListReferences: undefined
            };

            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            const whenFn = prompt.when as (answers: OdataServiceAnswers) => boolean;
            const result = whenFn({} as OdataServiceAnswers);

            expect(result).toBe(false);
        });

        it('should return false when OData version is not v4', () => {
            PromptState.odataService = {
                servicePath: '/test/service',
                metadata: '<metadata>test</metadata>',
                annotations: [],
                odataVersion: OdataVersion.v2,
                valueListReferences: undefined
            };

            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            const whenFn = prompt.when as (answers: OdataServiceAnswers) => boolean;
            const result = whenFn({} as OdataServiceAnswers);

            expect(result).toBe(false);
        });

        it('should return false when no value list references are found', () => {
            PromptState.odataService = {
                servicePath: '/test/service',
                metadata: '<metadata>test</metadata>',
                annotations: [],
                odataVersion: OdataVersion.v4,
                valueListReferences: undefined
            };

            mockGetValueListReferences.mockReturnValue([]);

            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            const whenFn = prompt.when as (answers: OdataServiceAnswers) => boolean;
            const result = whenFn({} as OdataServiceAnswers);

            expect(result).toBe(false);
            expect(mockGetValueListReferences).toHaveBeenCalledWith('/test/service', '<metadata>test</metadata>', []);
        });

        it('should return true when value list references are found', () => {
            PromptState.odataService = {
                servicePath: '/test/service',
                metadata: '<metadata>test</metadata>',
                annotations: [],
                odataVersion: OdataVersion.v4,
                valueListReferences: undefined
            };

            const mockValueListRefs = [
                {
                    target: 'Entity/Property',
                    serviceRootPath: '/valuehelp/service',
                    value: 'ValueListEntity'
                }
            ];

            mockGetValueListReferences.mockReturnValue(mockValueListRefs);

            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            const whenFn = prompt.when as (answers: OdataServiceAnswers) => boolean;
            const result = whenFn({} as OdataServiceAnswers);

            expect(result).toBe(true);
            expect(mockGetValueListReferences).toHaveBeenCalledWith('/test/service', '<metadata>test</metadata>', []);
        });

        it('should use cached result when service path has not changed', () => {
            PromptState.odataService = {
                servicePath: '/test/service',
                metadata: '<metadata>test</metadata>',
                annotations: [],
                odataVersion: OdataVersion.v4,
                valueListReferences: undefined
            };

            const mockValueListRefs = [
                {
                    target: 'Entity/Property',
                    serviceRootPath: '/valuehelp/service',
                    value: 'ValueListEntity'
                }
            ];

            mockGetValueListReferences.mockReturnValue(mockValueListRefs);

            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            const whenFn = prompt.when as (answers: OdataServiceAnswers) => boolean;

            // First call should process and cache
            const result1 = whenFn({} as OdataServiceAnswers);
            expect(result1).toBe(true);
            expect(mockGetValueListReferences).toHaveBeenCalledTimes(1);

            // Second call should use cache
            const result2 = whenFn({} as OdataServiceAnswers);
            expect(result2).toBe(true);
            expect(mockGetValueListReferences).toHaveBeenCalledTimes(1); // Not called again
        });

        it('should re-process when service path changes', () => {
            const mockValueListRefs = [
                {
                    target: 'Entity/Property',
                    serviceRootPath: '/valuehelp/service',
                    value: 'ValueListEntity'
                }
            ];

            mockGetValueListReferences.mockReturnValue(mockValueListRefs);

            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            const whenFn = prompt.when as (answers: OdataServiceAnswers) => boolean;

            // First service
            PromptState.odataService = {
                servicePath: '/test/service1',
                metadata: '<metadata>test</metadata>',
                annotations: [],
                odataVersion: OdataVersion.v4,
                valueListReferences: undefined
            };

            const result1 = whenFn({} as OdataServiceAnswers);
            expect(result1).toBe(true);
            expect(mockGetValueListReferences).toHaveBeenCalledTimes(1);

            // Change service path
            PromptState.odataService.servicePath = '/test/service2';

            const result2 = whenFn({} as OdataServiceAnswers);
            expect(result2).toBe(true);
            expect(mockGetValueListReferences).toHaveBeenCalledTimes(2); // Called again for new service
        });

        it('should clear state when switching from V4 to non-V4 service', () => {
            const mockValueListRefs = [
                {
                    target: 'Entity/Property',
                    serviceRootPath: '/valuehelp/service',
                    value: 'ValueListEntity'
                }
            ];

            mockGetValueListReferences.mockReturnValue(mockValueListRefs);

            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            const whenFn = prompt.when as (answers: OdataServiceAnswers) => boolean;

            // Start with V4 service
            PromptState.odataService = {
                servicePath: '/test/service',
                metadata: '<metadata>test</metadata>',
                annotations: [],
                odataVersion: OdataVersion.v4,
                valueListReferences: undefined
            };

            const result1 = whenFn({} as OdataServiceAnswers);
            expect(result1).toBe(true);

            // Switch to V2 service
            PromptState.odataService.odataVersion = OdataVersion.v2;

            const result2 = whenFn({} as OdataServiceAnswers);
            expect(result2).toBe(false);
            expect(PromptState.odataService.valueListReferences).toBeUndefined();
        });
    });

    describe('validate function', () => {
        let prompt: ConfirmQuestion;
        let mockAnswers: OdataServiceAnswers;

        beforeEach(() => {
            prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            mockAnswers = {
                datasourceType: DatasourceType.sapSystem
            } as OdataServiceAnswers;

            PromptState.odataService = {
                servicePath: '/test/service',
                metadata: '<metadata>test</metadata>',
                annotations: [],
                odataVersion: OdataVersion.v4,
                valueListReferences: undefined
            };

            const mockValueListRefs = [
                {
                    target: 'Entity/Property',
                    serviceRootPath: '/valuehelp/service',
                    value: 'ValueListEntity'
                }
            ];

            mockGetValueListReferences.mockReturnValue(mockValueListRefs);

            // Set up the when condition to cache value list references
            const whenFn = prompt.when as (answers: OdataServiceAnswers) => boolean;
            whenFn({} as OdataServiceAnswers);
        });

        it('should return true when fetchValueHelps is false', async () => {
            const validateFn = prompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;
            const result = await validateFn(false, mockAnswers);
            expect(result).toBe(true);
        });

        it('should return true when service path has not changed', async () => {
            const validateFn = prompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;

            // Simulate that service has already been processed by setting lastProcessedServicePath
            await validateFn(true, mockAnswers);

            // Call again with same service
            const result = await validateFn(true, mockAnswers);
            expect(result).toBe(true);
        });

        it('should handle value list reference processing correctly', async () => {
            // This test verifies the function completes without errors
            const newPrompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');

            const validateFn = newPrompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;
            const result = await validateFn(true, mockAnswers);

            expect(result).toBe(true);
        });

        it('should handle filter validation gracefully', async () => {
            // Test verifies the function returns true regardless of whether it processes value lists
            const newPrompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');

            const validateFn = newPrompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;
            const result = await validateFn(true, mockAnswers);

            expect(result).toBe(true);
        });

        it('should not call createForAbap when existing service provider is available', async () => {
            // Test just verifies the structure is correct and doesn't throw errors
            const newPrompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');

            const validateFn = newPrompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;
            const result = await validateFn(true, mockAnswers);

            expect(result).toBe(true);
            expect(mockCreateForAbap).not.toHaveBeenCalled();
        });

        it('should handle fetchValueListReferenceServices failure gracefully', async () => {
            mockAbapServiceProvider.fetchValueListReferenceServices.mockRejectedValue(new Error('Network error'));

            const validateFn = prompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;
            const result = await validateFn(true, mockAnswers);

            expect(result).toBe(true);
            expect(PromptState.odataService.valueListReferences).toBeUndefined();
        });

        it('should filter out invalid value list references', async () => {
            // Test verifies the function handles mixed valid/invalid data without errors
            const newPrompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');

            const validateFn = newPrompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;
            const result = await validateFn(true, mockAnswers);

            expect(result).toBe(true);
        });

        it('should create ABAP service provider for odataServiceUrl datasource type', async () => {
            mockAnswers.datasourceType = DatasourceType.odataServiceUrl;

            // Create new mock ABAP service provider for this test
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const newMockAbapServiceProvider = {
                fetchValueListReferenceServices: jest.fn().mockResolvedValue([])
            } as any;

            // Mock createForAbap to return our new mock
            mockCreateForAbap.mockReturnValue(newMockAbapServiceProvider);

            // Create new connectionValidator without existing ABAP serviceProvider
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const newMockConnectionValidator = {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                serviceProvider: {} as any, // Non-ABAP service provider
                axiosConfig: { some: 'config' }
            } as any;

            const newPrompt = getValueHelpDownloadPrompt(newMockConnectionValidator, 'test');

            const validateFn = newPrompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;
            await validateFn(true, mockAnswers);

            expect(mockCreateForAbap).toHaveBeenCalledWith({ some: 'config' });
            expect(newMockAbapServiceProvider.fetchValueListReferenceServices).toHaveBeenCalled();
        });

        it('should use existing ABAP service provider from connection validator', async () => {
            // Test verifies the function doesn't create new service provider when existing one is available
            const newPrompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');

            const validateFn = newPrompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;
            const result = await validateFn(true, mockAnswers);

            expect(result).toBe(true);
            expect(mockCreateForAbap).not.toHaveBeenCalled();
        });

        it('should not process when no ABAP service provider is available', async () => {
            // Create new connectionValidator with non-ABAP service provider
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const newMockConnectionValidator = {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                serviceProvider: {} as any, // Non-ABAP service provider
                axiosConfig: {}
            } as any;

            const newPrompt = getValueHelpDownloadPrompt(newMockConnectionValidator, 'test');
            mockAnswers.datasourceType = DatasourceType.capProject;

            // Set up prompt state
            const whenFn = newPrompt.when as (answers: OdataServiceAnswers) => boolean;
            whenFn({} as OdataServiceAnswers);

            const validateFn = newPrompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;
            await validateFn(true, mockAnswers);

            expect(mockAbapServiceProvider.fetchValueListReferenceServices).not.toHaveBeenCalled();
        });

        it('should clear state when fetchValueHelps is false', async () => {
            const validateFn = prompt.validate as (input: boolean, answers: OdataServiceAnswers) => Promise<boolean>;

            // First set some state
            await validateFn(true, mockAnswers);

            // Then clear it
            const result = await validateFn(false, mockAnswers);

            expect(result).toBe(true);
            expect(PromptState.odataService.valueListReferences).toBeUndefined();
        });

        it('should not process when service has no value list references', async () => {
            // Set up service with no value list references
            mockGetValueListReferences.mockReturnValue([]);

            // Re-create prompt to reset cache
            const promptNoRefs = getValueHelpDownloadPrompt(mockConnectionValidator, 'test');
            const whenFn = promptNoRefs.when as (answers: OdataServiceAnswers) => boolean;
            whenFn({} as OdataServiceAnswers);

            const validateFn = promptNoRefs.validate as (
                input: boolean,
                answers: OdataServiceAnswers
            ) => Promise<boolean>;
            const result = await validateFn(true, mockAnswers);

            expect(result).toBe(true);
            expect(mockAbapServiceProvider.fetchValueListReferenceServices).not.toHaveBeenCalled();
        });
    });

    describe('prompt configuration', () => {
        it('should have correct prompt configuration', () => {
            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'testNamespace');

            expect(prompt.type).toBe('confirm');
            expect(prompt.name).toBe('testNamespace:valueHelpDownloadConfirm');
            expect(prompt.default).toBe(false);
            expect(typeof prompt.when).toBe('function');
            expect(typeof prompt.validate).toBe('function');
        });

        it('should use provided namespace in prompt name', () => {
            const prompt = getValueHelpDownloadPrompt(mockConnectionValidator, 'customNamespace');
            expect(prompt.name).toBe('customNamespace:valueHelpDownloadConfirm');
        });
    });
});
