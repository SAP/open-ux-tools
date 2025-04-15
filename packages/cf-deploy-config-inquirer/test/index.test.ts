import { getPrompts, promptNames, type CfDeployConfigPromptOptions, prompt } from '../src';
import * as cfPrompts from '../src/prompts/prompts';
import type { CfDeployConfigAnswers } from '../src/types';
import type { Logger } from '@sap-ux/logger';
import { createPromptModule } from 'inquirer';
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import AutocompletePrompt from 'inquirer-autocomplete-prompt';

describe('index', () => {
    const mockLog = {
        info: jest.fn(),
        warn: jest.fn()
    } as unknown as Logger;
    const promptOptions: CfDeployConfigPromptOptions = {
        [promptNames.destinationName]: {
            defaultValue: 'defaultDestination',
            hint: false,
            useAutocomplete: true
        },
        [promptNames.addManagedAppRouter]: true,
        [promptNames.overwrite]: true
    };

    it('should return prompts from getPrompts', async () => {
        const getQuestionsSpy = jest.spyOn(cfPrompts, 'getQuestions');
        const prompts = await getPrompts(promptOptions, mockLog);
        expect(prompts.length).toBe(3);
        expect(getQuestionsSpy).toHaveBeenCalledWith(promptOptions, mockLog);
    });

    it('should prompt with inquirer adapter', async () => {
        const answers: CfDeployConfigAnswers = {
            destinationName: 'testDestination',
            addManagedAppRouter: true,
            overwrite: true
        };

        const mockPromptsModule = createPromptModule();
        const adapterRegisterPromptSpy = jest.spyOn(mockPromptsModule, 'registerPrompt');
        const mockInquirerAdapter: InquirerAdapter = {
            prompt: jest.fn().mockResolvedValue(answers),
            promptModule: mockPromptsModule
        };

        expect(await prompt(mockInquirerAdapter, promptOptions)).toMatchObject(answers);
        // Ensure autocomplete plugin is registered
        expect(adapterRegisterPromptSpy).toHaveBeenCalledWith('autocomplete', AutocompletePrompt);
    });

    it('should return prompts from getPrompts with router options enabled', async () => {
        const getQuestionsSpy = jest.spyOn(cfPrompts, 'getQuestions');
        const prompts = await getPrompts({ ...promptOptions, routerType: true, addManagedAppRouter: false }, mockLog);
        expect(prompts.length).toBe(3);
        expect(getQuestionsSpy).toHaveBeenCalledWith(promptOptions, mockLog);
    });
});
