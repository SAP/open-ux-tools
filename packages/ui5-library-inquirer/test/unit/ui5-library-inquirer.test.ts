import type { UI5Version } from '@sap-ux/ui5-info';
import { getPrompts, prompt } from '../../src/index';
import type { UI5LibraryAnswers } from '../../src/types';
import * as ui5LibInqApi from '../../src/index';
import * as ui5Info from '@sap-ux/ui5-info';
import * as prompting from '../../src/prompts/prompts';
import type { ListQuestion } from 'inquirer';
import inquirer from 'inquirer';

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
                "value": {
                  "default": true,
                  "maintained": true,
                  "version": "1.118.0",
                },
              },
              {
                "name": "1.117.0 - (Maintained version)",
                "value": {
                  "maintained": true,
                  "version": "1.117.0",
                },
              },
              {
                "name": "1.116.0 - (Out of maintenance version)",
                "value": {
                  "maintained": false,
                  "version": "1.116.0",
                },
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
        const answers: UI5LibraryAnswers = {
            enableTypescript: true,
            libraryName: 'testName',
            namespace: 'testNS',
            targetFolder: 'some/test/folder',
            ui5Version: '1.2.3'
        };

        const getPromptsSpy = jest.spyOn(ui5LibInqApi, 'getPrompts').mockResolvedValue(questions);
        const registerPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue(answers);

        const prompts = await prompt();
        // No options provided
        expect(prompts).toEqual(answers);
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
        const answers: UI5LibraryAnswers = {
            enableTypescript: true,
            libraryName: 'testName',
            namespace: 'testNS',
            targetFolder: 'some/test/folder',
            ui5Version: '1.2.3'
        };

        const getPromptsSpy = jest.spyOn(ui5LibInqApi, 'getPrompts').mockResolvedValue(questions);
        const registerPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue(answers);

        const promptOptions = {
            includeSeparators: true,
            targetFolder: '/some/target/folder2',
            useAutocomplete: true
        };
        const prompts = await prompt(promptOptions);
        // No options provided
        expect(prompts).toEqual(answers);
        expect(getPromptsSpy).toHaveBeenCalledWith(promptOptions);
        expect(registerPromptSpy).toHaveBeenCalledWith('autocomplete', expect.any(Function));
        expect(inquirerPromptSpy).toHaveBeenCalledWith(questions);
    });
});
