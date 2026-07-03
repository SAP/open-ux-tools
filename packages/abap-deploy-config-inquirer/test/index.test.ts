import { jest } from '@jest/globals';
import { mockTargetSystems } from './fixtures/targets.js';
import type { AbapDeployConfigAnswersInternal } from '../src/types.js';
import inquirer from 'inquirer';
import AutocompletePrompt from 'inquirer-autocomplete-prompt';

// Pre-import real prompts module before mocking
const realAbapPrompts = await import('../src/prompts/index.js');
const mockGetAbapDeployConfigQuestions = jest.fn<typeof realAbapPrompts.getAbapDeployConfigQuestions>();

jest.unstable_mockModule('../src/prompts/index', () => ({
    ...realAbapPrompts,
    getAbapDeployConfigQuestions: mockGetAbapDeployConfigQuestions
}));

// Default: delegate to real implementation
mockGetAbapDeployConfigQuestions.mockImplementation((...args) => realAbapPrompts.getAbapDeployConfigQuestions(...args));

const mockGetService = jest.fn<typeof realStore.getService>();
const realStore = await import('@sap-ux/store');

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: mockGetService
}));

const { getPrompts, prompt } = await import('../src/index.js');

describe('index', () => {
    it('should return prompts from getPrompts', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockTargetSystems])
        });
        const prompts = await getPrompts({}, undefined, false);
        expect(prompts.answers).toBeDefined();
        expect(prompts.prompts.length).toBe(24);
    });

    it('should prompt with inquirer adapter', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockTargetSystems])
        });

        const answers: AbapDeployConfigAnswersInternal = {
            url: '',
            targetSystem: 'https://mock.url.target1.com',
            client: '000',
            package: '',
            ui5AbapRepo: 'mockRepo',
            packageManual: 'mockPackage',
            transportManual: 'mockTransport'
        };

        const adapter = {
            prompt: jest.fn().mockResolvedValueOnce(answers)
        };

        expect(await prompt(adapter)).toStrictEqual({
            url: 'https://mock.url.target1.com',
            client: '000',
            ui5AbapRepo: 'mockRepo',
            package: 'mockPackage',
            transport: 'mockTransport'
        });
    });

    it('should forward adapter.promptModule to getPrompts and register autocomplete plugin', async () => {
        const answers: AbapDeployConfigAnswersInternal = {
            url: '',
            targetSystem: 'https://mock.url.target1.com',
            client: '000',
            package: '',
            ui5AbapRepo: 'mockRepo',
            packageManual: 'mockPackage',
            transportManual: 'mockTransport'
        };

        const mockPromptsModule = inquirer.createPromptModule();
        const adapterRegisterPromptSpy = jest.spyOn(mockPromptsModule, 'registerPrompt');
        const adapter = {
            prompt: jest.fn().mockResolvedValueOnce(answers),
            promptModule: mockPromptsModule
        };

        mockGetAbapDeployConfigQuestions.mockResolvedValue([{ name: 'packageAutocomplete', type: 'autocomplete' }]);

        expect(await prompt(adapter)).toMatchObject({
            url: 'https://mock.url.target1.com',
            client: '000',
            ui5AbapRepo: 'mockRepo',
            package: 'mockPackage',
            transport: 'mockTransport'
        });
        expect(adapterRegisterPromptSpy).toHaveBeenCalledWith('autocomplete', AutocompletePrompt);
    });
});

describe('registerAutocompletePlugin (via getPrompts)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAbapDeployConfigQuestions.mockImplementation((...args) =>
            realAbapPrompts.getAbapDeployConfigQuestions(...args)
        );
    });

    test('registers autocomplete plugin when promptModule provided and question has autocomplete type', async () => {
        const mockRegisterPrompt = jest.fn();
        const mockPromptModule = { registerPrompt: mockRegisterPrompt } as unknown as ReturnType<
            typeof inquirer.createPromptModule
        >;
        mockGetAbapDeployConfigQuestions.mockResolvedValue([{ name: 'packageAutocomplete', type: 'autocomplete' }]);
        await getPrompts({}, undefined, false, mockPromptModule);
        expect(mockRegisterPrompt).toHaveBeenCalledWith('autocomplete', AutocompletePrompt);
    });

    test('does not register when no autocomplete questions returned', async () => {
        const mockRegisterPrompt = jest.fn();
        const mockPromptModule = { registerPrompt: mockRegisterPrompt } as unknown as ReturnType<
            typeof inquirer.createPromptModule
        >;
        mockGetAbapDeployConfigQuestions.mockResolvedValue([{ name: 'packageAutocomplete', type: 'list' }]);
        await getPrompts({}, undefined, false, mockPromptModule);
        expect(mockRegisterPrompt).not.toHaveBeenCalled();
    });

    test('does not register when promptModule is not provided', async () => {
        mockGetAbapDeployConfigQuestions.mockResolvedValue([{ name: 'packageAutocomplete', type: 'autocomplete' }]);
        await expect(getPrompts({}, undefined, false, undefined)).resolves.toMatchObject({
            prompts: expect.any(Array),
            answers: expect.any(Object)
        });
    });
});
