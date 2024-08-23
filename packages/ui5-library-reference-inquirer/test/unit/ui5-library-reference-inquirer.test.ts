import { join } from 'path';
import { prompt, getPrompts, type InquirerAdapter, type UI5LibraryReferencePromptOptions } from '../../src';
import * as ui5LibRefPrompts from '../../src/prompts';
import { createPromptModule } from 'inquirer';
import { promptNames } from '../../src/types';
import * as uxProjectAccess from '@sap-ux/project-access';

jest.mock('../../src/prompts', () => {
    return {
        __esModule: true,
        ...jest.requireActual('../../src/prompts')
    };
});

describe('ui5-library-reference-inquirer API', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('getPrompts, no options', async () => {
        const getQuestionsSpy = jest.spyOn(ui5LibRefPrompts, 'getQuestions');
        // All prompts, no options
        const prompts = await getPrompts([join(__dirname, '/samples')]);
        expect(prompts).toMatchSnapshot();
        expect(getQuestionsSpy).toHaveBeenCalled();
    });

    test('prompt, prompt module registers plugin', async () => {
        const mockPromptsModule = createPromptModule();
        jest.spyOn(uxProjectAccess, 'findFioriArtifacts').mockResolvedValue([] as uxProjectAccess.FoundFioriArtifacts);
        const mockInquirerAdapter: InquirerAdapter = {
            prompt: jest.fn().mockResolvedValue({ aPrompt: 'a prompt answer' }),
            promptModule: mockPromptsModule
        };
        const promptOpts: UI5LibraryReferencePromptOptions = {
            [promptNames.source]: {
                hide: true
            }
        };

        expect(await prompt([join(__dirname, '/samples'), 'test'], mockInquirerAdapter, promptOpts))
            .toMatchInlineSnapshot(`
            Object {
              "aPrompt": "a prompt answer",
            }
        `);
    });
});
