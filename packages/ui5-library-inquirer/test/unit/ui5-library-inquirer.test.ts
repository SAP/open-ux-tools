import type { UI5Version } from '@sap-ux/ui5-info';
import { getPrompts, prompt } from '../../src/index';
import type { InquirerAdapter, UI5LibraryAnswers } from '../../src/types';
import * as ui5LibInqApi from '../../src/index';
import * as ui5Info from '@sap-ux/ui5-info';
import * as prompting from '../../src/prompts/prompts';
import type { Answers, ListQuestion } from 'inquirer';
import inquirer, { createPromptModule } from 'inquirer';

/**
 * Tests the exported ui5-library-inquirer APIs
 */
describe('API test', () => {
    const ui5Vers: UI5Version[] = [
        {
            version: '1.118.0',
            maintained: true,
            default: true
        },
        {
            version: '1.117.0',
            maintained: true
        },
        {
            version: '1.116.0',
            maintained: false
        }
    ];

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('getPrompts, no prompt options', async () => {
        jest.spyOn(process, 'cwd').mockReturnValue('/mocked/cwd');
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions');
        const prompts = await getPrompts();
        expect(prompts).toMatchSnapshot();
        const ui5VersionPrompt = prompts.find(
            (prompt) => prompt.name === 'ui5Version'
        ) as ListQuestion<UI5LibraryAnswers>;
        expect((ui5VersionPrompt.choices as Function)()).toMatchInlineSnapshot(`
            [
              {
                "name": "1.118.0 - (Maintained version)",
                "value": "1.118.0",
              },
              {
                "name": "1.117.0 - (Maintained version)",
                "value": "1.117.0",
              },
              {
                "name": "1.116.0 - (Out of maintenance version)",
                "value": "1.116.0",
              },
            ]
        `);
        expect(getUI5VersionsSpy).toHaveBeenCalledWith({ useCache: true, includeMaintained: true });
        expect(getQuestionsSpy).toHaveBeenCalledWith(ui5Vers, {
            includeSeparators: undefined,
            targetFolder: undefined,
            useAutocomplete: undefined
        });
    });

    it('getPrompts, prompt options', async () => {
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions');

        const prompts = await getPrompts({
            includeSeparators: true,
            useAutocomplete: true,
            targetFolder: 'some/target/folder/'
        });
        expect(prompts).toMatchSnapshot();
        expect(getUI5VersionsSpy).toHaveBeenCalledWith({ useCache: true, includeMaintained: true });
        expect(getQuestionsSpy).toHaveBeenCalledWith(ui5Vers, {
            includeSeparators: true,
            targetFolder: 'some/target/folder/',
            useAutocomplete: true
        });
    });

    it('prompt, no options', async () => {
        const questions = [
            {
                name: 'testPrompt',
                message: 'Test Prompt'
            }
        ];
        const answers: Answers = {
            enableTypescript: true,
            libraryName: 'testName',
            namespace: 'testNS',
            targetFolder: 'some/test/folder',
            ui5Version: '1.2.4'
        };

        const getPromptsSpy = jest.spyOn(ui5LibInqApi, 'getPrompts').mockResolvedValue(questions);
        const registerPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue(Object.assign({}, answers));

        const promptAnswers = await prompt();
        // No options provided
        expect(promptAnswers).toMatchInlineSnapshot(`
            {
              "enableTypescript": true,
              "libraryName": "testName",
              "namespace": "testNS",
              "targetFolder": "some/test/folder",
              "ui5Version": "1.2.4",
            }
        `);
        expect(getPromptsSpy).toHaveBeenCalledWith(undefined);
        expect(registerPromptSpy).not.toHaveBeenCalled();
        expect(inquirerPromptSpy).toHaveBeenCalledWith(questions);
    });

    it('prompt, with options', async () => {
        const questions = [
            {
                name: 'testPrompt',
                message: 'Test Prompt'
            }
        ];
        const answers: Answers = {
            enableTypescript: true,
            libraryName: 'testName',
            namespace: 'testNS',
            targetFolder: 'some/test/folder',
            ui5Version: '1.2.4'
        };

        const getPromptsSpy = jest.spyOn(ui5LibInqApi, 'getPrompts').mockResolvedValue(questions);
        const registerPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue(Object.assign({}, answers));

        const promptOptions = {
            includeSeparators: true,
            targetFolder: '/some/target/folder2',
            useAutocomplete: true
        };
        const promptAnswers = await prompt(promptOptions);
        // No options provided
        expect(promptAnswers).toMatchInlineSnapshot(`
            {
              "enableTypescript": true,
              "libraryName": "testName",
              "namespace": "testNS",
              "targetFolder": "some/test/folder",
              "ui5Version": "1.2.4",
            }
        `);
        expect(getPromptsSpy).toHaveBeenCalledWith(promptOptions);
        expect(registerPromptSpy).toHaveBeenCalledWith('autocomplete', expect.any(Function));
        expect(inquirerPromptSpy).toHaveBeenCalledWith(questions);
    });

    it('prompt, with adapter', async () => {
        const questions = [
            {
                name: 'testPrompt',
                message: 'Test Prompt'
            }
        ];
        const answers: Answers = {
            enableTypescript: true,
            libraryName: 'testName',
            namespace: 'testNS',
            targetFolder: 'some/test/folder',
            ui5Version: '1.2.4'
        };

        const getPromptsSpy = jest.spyOn(ui5LibInqApi, 'getPrompts').mockResolvedValue(questions);
        const inquirerRegisterPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt');
        const mockPromptsModule = createPromptModule();
        const adapterRegisterPromptSpy = jest.spyOn(mockPromptsModule, 'registerPrompt');
        const mockAdapter: InquirerAdapter = {
            prompt: jest.fn().mockResolvedValue(Object.assign({}, answers)),
            promptModule: mockPromptsModule
        };

        const promptOptions = {
            includeSeparators: true,
            targetFolder: '/some/target/folder2',
            useAutocomplete: true
        };
        const promptAnswers = await prompt(promptOptions, mockAdapter);
        // No options provided
        expect(promptAnswers).toMatchInlineSnapshot(`
            {
              "enableTypescript": true,
              "libraryName": "testName",
              "namespace": "testNS",
              "targetFolder": "some/test/folder",
              "ui5Version": "1.2.4",
            }
        `);
        expect(getPromptsSpy).toHaveBeenCalledWith(promptOptions);
        expect(inquirerRegisterPromptSpy).not.toHaveBeenCalledWith();
        expect(inquirerPromptSpy).not.toHaveBeenCalledWith();
        expect(mockAdapter.prompt).toHaveBeenCalledWith([{ 'message': 'Test Prompt', 'name': 'testPrompt' }]);
        expect(adapterRegisterPromptSpy).toHaveBeenCalledWith('autocomplete', expect.any(Function));
    });
});
