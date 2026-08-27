import { jest } from '@jest/globals';

// Pre-import real modules before mocking
const realCfPrompts = await import('../src/prompts/prompts.js');

const mockGetQuestions = jest.fn<typeof realCfPrompts.getQuestions>();

jest.unstable_mockModule('../src/prompts/prompts', () => ({
    ...realCfPrompts,
    getQuestions: mockGetQuestions
}));

// Set default implementation to call through to the real function
mockGetQuestions.mockImplementation((...args) => realCfPrompts.getQuestions(...args));

const { getPrompts, promptNames, prompt } = await import('../src/index.js');
import type { CfDeployConfigPromptOptions, CfDeployConfigAnswers } from '../src/types.js';
import type { Logger } from '@sap-ux/logger';
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import inquirer from 'inquirer';
import AutocompletePrompt from 'inquirer-autocomplete-prompt';

describe('index', () => {
    const mockLog = {
        info: jest.fn(),
        warn: jest.fn()
    } as unknown as Logger;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset to call-through after clearAllMocks
        mockGetQuestions.mockImplementation((...args) => realCfPrompts.getQuestions(...args));
    });

    const promptOptions: CfDeployConfigPromptOptions = {
        [promptNames.destinationName]: {
            defaultValue: 'defaultDestination',
            hint: false,
            useAutocomplete: true
        },
        [promptNames.addManagedAppRouter]: {
            hide: true
        },
        [promptNames.overwriteCfConfig]: {
            hide: false
        }
    };

    it('should return prompts from getPrompts', async () => {
        const prompts = await getPrompts(promptOptions, mockLog);
        expect(prompts.length).toBe(3);
        expect(mockGetQuestions).toHaveBeenCalledWith(promptOptions, mockLog);
    });

    it('should prompt with inquirer adapter', async () => {
        const answers: CfDeployConfigAnswers = {
            destinationName: 'testDestination',
            addManagedAppRouter: true,
            overwrite: true
        };

        const mockPromptsModule = inquirer.createPromptModule();
        const adapterRegisterPromptSpy = jest.spyOn(mockPromptsModule, 'registerPrompt');
        const mockInquirerAdapter: InquirerAdapter = {
            prompt: jest.fn().mockResolvedValue(answers),
            promptModule: mockPromptsModule
        };

        // Return an autocomplete question so plugin registration is triggered
        mockGetQuestions.mockResolvedValue([{ name: 'destinationName', type: 'autocomplete' }]);

        expect(await prompt(mockInquirerAdapter, promptOptions)).toMatchObject(answers);
        expect(adapterRegisterPromptSpy).toHaveBeenCalledWith('autocomplete', AutocompletePrompt);
    });

    it('should return prompts from getPrompts with router options enabled', async () => {
        const routerEnabledPromptOptions: CfDeployConfigPromptOptions = {
            ...promptOptions,
            [promptNames.routerType]: { hide: false },
            [promptNames.addManagedAppRouter]: { hide: true }
        };
        const prompts = await getPrompts(routerEnabledPromptOptions, mockLog);
        expect(prompts.length).toBe(3);
        expect(mockGetQuestions).toHaveBeenCalledWith(routerEnabledPromptOptions, mockLog);
    });
});

describe('registerAutocompletePlugin (via getPrompts)', () => {
    const mockOptions: CfDeployConfigPromptOptions = {
        [promptNames.destinationName]: { defaultValue: 'dest', useAutocomplete: true }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetQuestions.mockImplementation((...args) => realCfPrompts.getQuestions(...args));
    });

    test('registers autocomplete plugin when promptModule provided and question has autocomplete type', async () => {
        const mockRegisterPrompt = jest.fn();
        const mockPromptModule = { registerPrompt: mockRegisterPrompt } as unknown as ReturnType<
            typeof inquirer.createPromptModule
        >;
        mockGetQuestions.mockResolvedValue([{ name: 'destinationName', type: 'autocomplete' }]);
        await getPrompts(mockOptions, undefined, mockPromptModule);
        expect(mockRegisterPrompt).toHaveBeenCalledWith('autocomplete', AutocompletePrompt);
    });

    test('does not register when no autocomplete questions returned', async () => {
        const mockRegisterPrompt = jest.fn();
        const mockPromptModule = { registerPrompt: mockRegisterPrompt } as unknown as ReturnType<
            typeof inquirer.createPromptModule
        >;
        mockGetQuestions.mockResolvedValue([{ name: 'destinationName', type: 'list' }]);
        await getPrompts(mockOptions, undefined, mockPromptModule);
        expect(mockRegisterPrompt).not.toHaveBeenCalled();
    });

    test('does not register when promptModule is not provided', async () => {
        mockGetQuestions.mockResolvedValue([{ name: 'destinationName', type: 'autocomplete' }]);
        await expect(getPrompts(mockOptions, undefined, undefined)).resolves.not.toThrow();
    });
});
