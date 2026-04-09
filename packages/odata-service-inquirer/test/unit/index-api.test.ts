import { jest } from '@jest/globals';
import { Severity } from '@sap-devx/yeoman-ui-types';
import { ErrorHandler, type InquirerAdapter } from '@sap-ux/inquirer-common';
import { type BackendSystem } from '@sap-ux/store';

const actualPrompts = await import('../../src/prompts');
const mockGetQuestions = jest.fn<any>(actualPrompts.getQuestions);
jest.unstable_mockModule('../../src/prompts', () => ({
    ...actualPrompts,
    getQuestions: mockGetQuestions
}));

const actualSystemSelection = await import('../../src/prompts/datasources/sap-system/system-selection');
const mockGetSystemSelectionQuestions = jest.fn<any>(actualSystemSelection.getSystemSelectionQuestions);
jest.unstable_mockModule('../../src/prompts/datasources/sap-system/system-selection', () => ({
    ...actualSystemSelection,
    getSystemSelectionQuestions: mockGetSystemSelectionQuestions
}));

const actualStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue([
            {
                name: 'storedSystem1',
                url: 'http://url1',
                systemType: 'OnPrem'
            },
            {
                name: 'storedSystem2',
                url: 'http://url2',
                systemType: 'BTP'
            }
        ] as BackendSystem[]),
        read: jest.fn().mockImplementation((key) => {
            // Mock read to return systems with credentials
            const systems = [
                {
                    name: 'storedSystem1',
                    url: 'http://url1',
                    systemType: 'OnPrem',
                    username: 'user1',
                    password: 'pass1'
                },
                {
                    name: 'storedSystem2',
                    url: 'http://url2',
                    systemType: 'BTP'
                }
            ];
            return Promise.resolve(systems.find((s) => s.url === key.url));
        })
    }))
}));

const { DatasourceType, getPrompts, getSystemSelectionQuestions, OdataVersion, promptNames, prompt } =
    await import('../../src/index');
import type { OdataServicePromptOptions, OdataServiceAnswers } from '../../src/index';
import LoggerHelper from '../../src/prompts/logger-helper';
const { PromptState } = await import('../../src/utils');

describe('API tests', () => {
    interface MockInquirerAdapter {
        prompt: jest.MockedFunction<InquirerAdapter['prompt']>;
        promptModule?: {
            registerPrompt: jest.MockedFunction<any>;
        };
    }

    let mockAdapter: MockInquirerAdapter;
    beforeEach(() => {
        jest.clearAllMocks();
        mockAdapter = {
            prompt: jest.fn() as any,
            promptModule: {
                registerPrompt: jest.fn() as any
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getPrompts', async () => {
        mockGetQuestions.mockResolvedValue([
            {
                name: 'prompt1',
                validate: () => (PromptState.odataService.metadata = 'metadata contents')
            }
        ]);

        const prompOptions: OdataServicePromptOptions = {
            [promptNames.serviceUrl]: {
                requiredOdataVersion: OdataVersion.v4,
                showCollaborativeDraftWarning: false,
                additionalMessages: (input: any) => {
                    if (input === 'X') {
                        return {
                            message: 'X may mark the spot',
                            severity: Severity.information
                        };
                    }
                }
            }
        };

        const { prompts: questions, answers } = await getPrompts(prompOptions);

        expect(questions).toHaveLength(1);
        // execute the validate function as it would be done by inquirer
        (questions[0].validate as Function)();
        expect(answers.metadata).toBe('metadata contents');

        // Ensure stateful properties are set correctly
        expect(PromptState.isYUI).toBe(false);
        expect(PromptState.odataService).toBe(answers);
        // Default logger created
        expect(LoggerHelper.logger).toBeDefined();
        expect(ErrorHandler.logger).toBeDefined();
        expect(ErrorHandler.guidedAnswersEnabled).toBe(false);
    });

    test('getSystemSelectionQuestions', async () => {
        PromptState.isYUI = false;
        mockGetSystemSelectionQuestions.mockResolvedValue([
            {
                name: 'prompt1',
                validate: () => (PromptState.odataService.servicePath = '/path/to/service')
            }
        ]);

        const { prompts: questions, answers } = await getSystemSelectionQuestions();
        expect(PromptState.isYUI).toBe(false);
        expect(questions).toHaveLength(1);
        (questions[0].validate as Function)();
        expect(answers.servicePath).toBe('/path/to/service');

        await getSystemSelectionQuestions(undefined, true);
        expect(PromptState.isYUI).toBe(true);
    });

    test('getPrompts, i18n is loaded', async () => {
        const { prompts: questions } = await getPrompts(undefined, undefined, true, undefined, true);
        expect(questions).toMatchSnapshot();
    });

    test('prompt - basic flow with autocomplete and answer merging', async () => {
        const userAnswers: Partial<OdataServiceAnswers> = {
            datasourceType: DatasourceType.sapSystem,
            servicePath: '/user/service'
        };
        mockAdapter.prompt.mockResolvedValue(userAnswers as any);
        mockGetQuestions.mockResolvedValue([{ name: 'test', message: 'Test?' }]);

        PromptState.odataService = { metadata: 'some metadata' };

        const promptOptions: OdataServicePromptOptions = {
            serviceSelection: { useAutoComplete: true }
        };

        const result = await prompt(mockAdapter as unknown as InquirerAdapter, promptOptions);

        expect(mockAdapter.promptModule?.registerPrompt).toHaveBeenCalledWith('autocomplete', expect.any(Function));
        expect(result).toEqual({ ...userAnswers, metadata: 'some metadata' });
    });

    test('prompt - capProject autocomplete registration', async () => {
        mockAdapter.prompt.mockResolvedValue({} as any);
        mockGetQuestions.mockResolvedValue([]);
        PromptState.odataService = {};

        await prompt(mockAdapter as unknown as InquirerAdapter, {
            capProject: { capSearchPaths: ['/test'], useAutoComplete: true }
        });

        expect(mockAdapter.promptModule?.registerPrompt).toHaveBeenCalledWith('autocomplete', expect.any(Function));
    });

    test('prompt - no autocomplete when disabled or missing promptModule', async () => {
        mockAdapter.prompt.mockResolvedValue({} as any);
        mockGetQuestions.mockResolvedValue([]);
        PromptState.odataService = {};

        // Test with useAutoComplete false
        await prompt(mockAdapter as unknown as InquirerAdapter, { serviceSelection: { useAutoComplete: false } });
        expect(mockAdapter.promptModule?.registerPrompt).not.toHaveBeenCalled();

        // Test with missing promptModule
        const adapterNoModule = {
            prompt: jest.fn().mockResolvedValue({}) as any
        };
        await prompt(adapterNoModule as unknown as InquirerAdapter, { serviceSelection: { useAutoComplete: true } });
        expect(adapterNoModule.prompt).toHaveBeenCalled();
    });
});
