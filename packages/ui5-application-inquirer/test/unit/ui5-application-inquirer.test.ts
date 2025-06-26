import { Severity } from '@sap-devx/yeoman-ui-types';
import type { UI5Version, UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import * as ui5Info from '@sap-ux/ui5-info';
import { createPromptModule } from 'inquirer';
import AutocompletePrompt from 'inquirer-autocomplete-prompt';
import type { InquirerAdapter, UI5ApplicationAnswers, UI5ApplicationPromptOptions } from '../../src';
import { getPrompts, prompt, promptNames } from '../../src';
import * as ui5AppPrompts from '../../src/prompts';
import { gte, lt } from 'semver';

/**
 * Workaround to allow spyOn
 */
jest.mock('../../src/prompts', () => {
    return {
        __esModule: true,
        ...jest.requireActual('../../src/prompts')
    };
});
/**
 * Tests the exported ui5-application-inquirer APIs
 */
describe('ui5-application-inquirer API', () => {
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
    let getUI5VersionsSpy: jest.SpyInstance;

    beforeEach(() => {
        getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
        jest.restoreAllMocks();
    });

    test('getPrompts, no options', async () => {
        const getQuestionsSpy = jest.spyOn(ui5AppPrompts, 'getQuestions');
        // All prompts, no options
        let prompts = await getPrompts();
        expect(prompts).toMatchSnapshot();

        // Ensure correct ui5 version filter options used
        const filterOptions: UI5VersionFilterOptions = {
            useCache: true,
            includeMaintained: true,
            includeDefault: true,
            minSupportedUI5Version: undefined
        };
        expect(getUI5VersionsSpy).toHaveBeenCalledWith(filterOptions);
        expect(getQuestionsSpy).toHaveBeenCalledWith(ui5Vers, undefined, undefined, false);
        getUI5VersionsSpy.mockClear();
        getQuestionsSpy.mockClear();

        const cdsInfo = {
            hasCdsUi5Plugin: true,
            hasMinCdsVersion: true,
            isCdsUi5PluginEnabled: true,
            isWorkspaceEnabled: false
        };
        prompts = await getPrompts(undefined, cdsInfo, true);

        expect(getQuestionsSpy).toHaveBeenCalledWith(ui5Vers, undefined, cdsInfo, true);
    });

    test('getPrompts, prompt options specified', async () => {
        const getQuestionsSpy = jest.spyOn(ui5AppPrompts, 'getQuestions');
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.ui5Version]: {
                validate: (answers: UI5ApplicationAnswers) => answers.name === 'someName'
            },
            [promptNames.skipAnnotations]: {
                advancedOption: true
            },
            [promptNames.description]: {
                hide: true
            },
            // Ensure a default is applied, even if the prompt is not executed
            [promptNames.ui5Theme]: {
                additionalMessages: () => ({
                    message: 'You must enter something',
                    severity: Severity.warning
                })
            }
        };

        await getPrompts(promptOpts);
        expect(getQuestionsSpy).toHaveBeenCalledWith(ui5Vers, promptOpts, undefined, false);
    });

    test('getPrompts, with `minUI5Version` specified', async () => {
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const minUI5Version = '1.999.9';
        const promptOptions: UI5ApplicationPromptOptions = {
            [promptNames.ui5Version]: {
                minUI5Version
            }
        };
        await getPrompts(promptOptions);
        expect(getUI5VersionsSpy).toHaveBeenCalledWith(
            expect.objectContaining({ minSupportedUI5Version: minUI5Version })
        );
    });

    test('prompt, prompt module registers plugin', async () => {
        const mockPromptsModule = createPromptModule();
        const adapterRegisterPromptSpy = jest.spyOn(mockPromptsModule, 'registerPrompt');
        const mockInquirerAdapter: InquirerAdapter = {
            prompt: jest.fn().mockResolvedValue({ aPrompt: 'a prompt answer' }),
            promptModule: mockPromptsModule
        };
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.ui5Version]: {
                useAutocomplete: true
            }
        };

        expect(await prompt(mockInquirerAdapter, promptOpts)).toMatchObject({
            aPrompt: 'a prompt answer'
        });
        // Ensure autocomplete plugin is registered
        expect(adapterRegisterPromptSpy).toHaveBeenCalledWith('autocomplete', AutocompletePrompt);
    });

    test('prompt, defaults are applied from prompt options and prompt defaults if advanced option', async () => {
        const mockPromptsModule = createPromptModule();
        const mockInquirerAdapter: InquirerAdapter = {
            prompt: jest.fn().mockResolvedValue({ [promptNames.name]: 'a prompt answer' }),
            promptModule: mockPromptsModule
        };
        const promptOpts: UI5ApplicationPromptOptions = {
            // Test default string value
            [promptNames.ui5Version]: {
                default: '999.999.999'
            },
            // Test default boolean value
            [promptNames.skipAnnotations]: {
                default: true
            },
            // Test default function with answers
            [promptNames.description]: {
                default: (answers: UI5ApplicationAnswers) =>
                    answers.skipAnnotations === false ? 'Annotations inc.' : 'No annotations'
            },
            // Ensure a default is applied, even if the prompt is not executed
            [promptNames.ui5Theme]: {
                hide: true
            },
            [promptNames.addDeployConfig]: {
                hide: true
            },
            [promptNames.enableTypeScript]: {
                default: true
            },
            [promptNames.enableCodeAssist]: {
                advancedOption: true,
                default: true
            }
        };

        let answers = await prompt(mockInquirerAdapter, promptOpts, {
            hasCdsUi5Plugin: true,
            isCdsUi5PluginEnabled: false,
            hasMinCdsVersion: false,
            isWorkspaceEnabled: false
        });
        // Since capCdsInfo was provided some prompts should not provide an answer
        expect(answers).toEqual({
            description: 'No annotations',
            enableCodeAssist: true,
            enableTypeScript: true,
            name: 'a prompt answer',
            skipAnnotations: true,
            ui5Theme: 'sap_horizon',
            ui5Version: '999.999.999'
        });

        // Provided answer takes precendence, default theme uses ui5 answer, default functions use previous answers
        mockInquirerAdapter.prompt = jest.fn().mockResolvedValue({
            [promptNames.ui5Version]: '1.64.0',
            [promptNames.skipAnnotations]: false,
            [promptNames.enableCodeAssist]: false
        });
        answers = await prompt(mockInquirerAdapter, promptOpts);
        expect(answers).toEqual({
            description: 'Annotations inc.',
            enableCodeAssist: false,
            enableTypeScript: true,
            skipAnnotations: false,
            ui5Theme: 'sap_fiori_3',
            ui5Version: '1.64.0'
        });
    });

    test('prompt, prompt args are passed correctly applied', async () => {
        const getQuestionsSpy = jest.spyOn(ui5AppPrompts, 'getQuestions');
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.name]: {
                default: 'someName'
            }
        };

        const mockPromptsModule = createPromptModule();
        const mockInquirerAdapter: InquirerAdapter = {
            prompt: jest.fn().mockResolvedValue({ [promptNames.name]: 'a prompt answer' }),
            promptModule: mockPromptsModule
        };
        const mockCdsInfo = {
            hasCdsUi5Plugin: true,
            hasMinCdsVersion: true,
            isCdsUi5PluginEnabled: true,
            isWorkspaceEnabled: false
        };
        await prompt(mockInquirerAdapter, promptOpts, mockCdsInfo, true);

        expect(getQuestionsSpy).toHaveBeenCalledWith(ui5Vers, promptOpts, mockCdsInfo, true);
    });
});

describe('Filtering UI5 themes based on UI5 version', () => {
    const versionsToTest = ['1.146.0', '1.136.0', '1.135.0', '1.133.0', '1.120.0', '1.119.0', '1.118.0'];

    // Helper function to return the expected choices for each version
    function getExpectedChoices(version: string) {
        const commonChoices = [
            { name: 'Quartz Light', value: 'sap_fiori_3' },
            { name: 'Quartz Dark', value: 'sap_fiori_3_dark' },
            { name: 'Morning Horizon', value: 'sap_horizon' },
            { name: 'Evening Horizon', value: 'sap_horizon_dark' }
        ];

        if (gte(version, '1.136.0')) {
            return commonChoices;
        } else if (gte(version, '1.120.0') && lt(version, '1.136.0')) {
            return [{ name: 'Belize (deprecated)', value: 'sap_belize' }, ...commonChoices];
        } else if (lt(version, '1.120.0')) {
            return [{ name: 'Belize', value: 'sap_belize' }, ...commonChoices];
        }
        return [];
    }

    test.each(versionsToTest)('should call getUi5Themes with correct ui5Version: %s', async (version) => {
        jest.restoreAllMocks();
        const getUi5ThemesSpy = jest.spyOn(ui5Info, 'getUi5Themes');
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue([{ version }]);
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.ui5Version]: {
                validate: (answers: UI5ApplicationAnswers) => answers.name === version,
                default: version
            },
            [promptNames.skipAnnotations]: {
                advancedOption: true
            },
            [promptNames.description]: {
                hide: true
            },
            [promptNames.ui5Theme]: {
                additionalMessages: () => ({
                    message: 'You must enter something',
                    severity: Severity.warning
                })
            }
        };

        const questions = await getPrompts(promptOpts);
        const ui5ThemeQuestion = questions.find((q) => q.name === promptNames.ui5Theme);
        const choices = await (ui5ThemeQuestion as any)?.choices({ ui5Version: version });

        const expectedChoices = getExpectedChoices(version);

        expect(getUi5ThemesSpy).toHaveBeenCalledWith(version);
        expect(choices.length).toBeGreaterThan(0);
        expect(choices).toEqual(expectedChoices);
    });
});
