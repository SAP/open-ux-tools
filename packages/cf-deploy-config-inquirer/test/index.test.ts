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
        const prompts = await getPrompts(promptOptions);
        expect(prompts.length).toBe(3);
        expect(getQuestionsSpy).toHaveBeenCalledWith(promptOptions);
    });

    it('should return prompts from getPrompts along with logger', async () => {
        const getQuestionsSpy = jest.spyOn(cfPrompts, 'getQuestions');
        const prompts = await getPrompts(promptOptions, mockLog);
        expect(prompts.length).toBe(3);
        expect(getQuestionsSpy).toHaveBeenCalledWith(promptOptions);
    });

    it('should prompt with inquirer adapter', async () => {
        const answers: CfDeployConfigAnswers = {
            destinationName: 'testDestination',
            addManagedRouter: true,
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
});
