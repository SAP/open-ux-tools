import type { UI5Version } from '@sap-ux/ui5-info';
import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import { getPrompts, prompt } from '../../src/index';
import type { UI5LibraryAnswers } from '../../src/types';
import { initI18n } from '../../src/i18n';
import * as ui5LibInqApi from '../../src/index';
import * as ui5Info from '@sap-ux/ui5-info';
import * as prompting from '../../src/prompts/prompts';
import * as commands from '@sap-ux/ui5-info/dist/commands';
import inquirer, { createPromptModule, type Answers, type ListQuestion } from 'inquirer';

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
        }
    ];

    beforeAll(async () => {
        // Wait for i18n to bootstrap
        await initI18n();
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
        jest.restoreAllMocks();
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
            ]
        `);
        expect(getUI5VersionsSpy).toHaveBeenCalledWith({
            useCache: true,
            includeMaintained: true,
            onlyNpmVersion: true
        });
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
        expect(getUI5VersionsSpy).toHaveBeenCalledWith({
            useCache: true,
            includeMaintained: true,
            onlyNpmVersion: true
        });
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
            ui5Version: '1.76.0'
        };

        // Mock the underlying functions that getPrompts uses instead of getPrompts itself
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions').mockReturnValue(questions);

        const registerPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue(Object.assign({}, answers));
        // Mock npm command to return versions that include the expected version
        jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(['1.76.0', '1.118.0']);

        const promptAnswers = await prompt();
        // No options provided
        expect(promptAnswers).toMatchInlineSnapshot(`
            {
              "enableTypescript": true,
              "libraryName": "testName",
              "namespace": "testNS",
              "targetFolder": "some/test/folder",
              "ui5Version": "1.76.0",
            }
        `);
        expect(getUI5VersionsSpy).toHaveBeenCalled();
        expect(getQuestionsSpy).toHaveBeenCalled();
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
            ui5Version: '1.76.0'
        };

        // Mock the underlying functions that getPrompts uses instead of getPrompts itself
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions').mockReturnValue(questions);

        const registerPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue(Object.assign({}, answers));
        // Mock npm command to return versions that include the expected version
        jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(['1.76.0', '1.118.0']);

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
              "ui5Version": "1.76.0",
            }
        `);
        expect(getUI5VersionsSpy).toHaveBeenCalled();
        expect(getQuestionsSpy).toHaveBeenCalled();
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
            ui5Version: '1.76.0'
        };

        // Mock the underlying functions that getPrompts uses instead of getPrompts itself
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions').mockReturnValue(questions);

        const inquirerRegisterPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt');
        const mockPromptsModule = createPromptModule();
        const adapterRegisterPromptSpy = jest.spyOn(mockPromptsModule, 'registerPrompt');
        const mockAdapter: InquirerAdapter = {
            prompt: jest.fn().mockResolvedValue(Object.assign({}, answers)),
            promptModule: mockPromptsModule
        };
        // Mock npm command to return versions that include the expected version
        jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(['1.76.0', '1.118.0']);

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
              "ui5Version": "1.76.0",
            }
        `);
        expect(getUI5VersionsSpy).toHaveBeenCalled();
        expect(getQuestionsSpy).toHaveBeenCalled();
        expect(inquirerRegisterPromptSpy).not.toHaveBeenCalledWith();
        expect(inquirerPromptSpy).not.toHaveBeenCalledWith();
        expect(mockAdapter.prompt).toHaveBeenCalledWith([{ 'message': 'Test Prompt', 'name': 'testPrompt' }]);
        expect(adapterRegisterPromptSpy).toHaveBeenCalledWith('autocomplete', expect.any(Function));
    });
});
