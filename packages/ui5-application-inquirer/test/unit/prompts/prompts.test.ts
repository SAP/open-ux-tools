import * as projectAccess from '@sap-ux/project-access';
import * as projectValidators from '@sap-ux/project-input-validator';
import * as ui5Info from '@sap-ux/ui5-info';
import { getQuestions } from '../../../src/prompts';
import * as promptHelpers from '../../../src/prompts/prompt-helpers';
import type { UI5ApplicationPromptOptions } from '../../../src/types';
import { promptNames } from '../../../src/types';
import { initI18nUi5AppInquirer } from '../../../src/i18n';
import type { UI5Version } from '@sap-ux/ui5-info';
import { defaultVersion, minUi5VersionSupportingCodeAssist, ui5ThemeIds } from '@sap-ux/ui5-info';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { inc } from 'semver';

jest.mock('@sap-ux/project-input-validator', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/project-input-validator')
    };
});

describe('getQuestions', () => {
    const mockCdsInfo = {
        isWorkspaceEnabled: false,
        hasMinCdsVersion: true,
        isCdsUi5PluginEnabled: false,
        hasCdsUi5Plugin: false
    };
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nUi5AppInquirer();
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
        jest.restoreAllMocks();
    });

    test('getQuestions, no options', () => {
        // Tests all declaritive values
        expect(getQuestions([])).toMatchSnapshot();
    });

    test('getQuestions, parameter `capCdsInfo` specified', () => {
        // Prompt: `targetFolder` should not returned for CAP projects
        expect(getQuestions([], undefined, mockCdsInfo)).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.targetFolder })])
        );

        // Prompt: `targetFolder` should only be returned for non-CAP projects
        expect(getQuestions([])).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.targetFolder })])
        );
    });

    test('getQuestions, prompt: `name`, conditional validator', () => {
        jest.spyOn(promptHelpers, 'appPathExists').mockReturnValue(true);
        // Test default when `isCLi` === true
        let questions = getQuestions([], {
            [promptNames.targetFolder]: {
                default: '/cap/specific/target/path'
            }
        });
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toMatchInlineSnapshot(`"A module with this name already exists in the folder: /cap/specific/target/path"`);

        // Test default when CAP project info provided
        questions = getQuestions(
            [],
            {
                [promptNames.targetFolder]: {
                    default: '/cap/specific/target/path1'
                }
            },
            mockCdsInfo,
            true
        );
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toMatchInlineSnapshot(`"A module with this name already exists in the folder: /cap/specific/target/path1"`);

        // Non-Cli usage (YUI)
        questions = getQuestions(
            [],
            {
                [promptNames.targetFolder]: {
                    default: '/cap/specific/target/path1'
                }
            },
            undefined,
            true
        );
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toEqual(true);

        jest.spyOn(promptHelpers, 'appPathExists').mockReturnValue(false);
        // Default generated name
        expect((questions.find((question) => question.name === promptNames.name)?.default as Function)({})).toEqual(
            'project1'
        );

        // Name answer
        expect(
            (questions.find((question) => question.name === promptNames.name)?.default as Function)({ name: 'abc123' })
        ).toEqual('abc123');

        // Default name provided
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.name]: {
                default: 'defaultAppName',
                defaultValue: 'shouldBeIgnoredAsDefaultIsProvided'
            }
        };
        questions = getQuestions([], promptOpts);
        const namePrompt = questions.find((question) => question.name === promptNames.name);
        expect(namePrompt?.default).toEqual(promptOpts.name?.default);

        // Test `defaultValue` prompt option - should not replace existing default function
        const promptOptionsDefaultValue = {
            [promptNames.name]: {
                defaultValue: 'defaultAppNameDontReplace'
            }
        };

        questions = getQuestions([], promptOptionsDefaultValue);
        const namePromptWithDefaultValue = questions.find((question) => question.name === promptNames.name);
        expect(namePromptWithDefaultValue?.default({})).toEqual(promptOptionsDefaultValue.name?.defaultValue);
        expect(namePromptWithDefaultValue?.default({ name: 'userInputName' })).toEqual('userInputName');
    });

    test('getQuestions, prompt: `title`, default', () => {
        const questions = getQuestions([]);
        // defaults
        expect(
            (questions.find((question) => question.name === promptNames.title)?.default as Function)({})
        ).toMatchInlineSnapshot(`"App Title"`);

        expect(
            (questions.find((question) => question.name === promptNames.title)?.default as Function)({
                title: 'alreadyAnsweredTitle'
            })
        ).toMatchInlineSnapshot(`"alreadyAnsweredTitle"`);
    });

    test('getQuestions, prompt: `namespace`', () => {
        let questions = getQuestions([]);
        // defaults
        let namespacePrompt = questions.find((question) => question.name === promptNames.namespace);
        expect((namespacePrompt?.default as Function)({})).toMatchInlineSnapshot(`""`);

        expect(
            (namespacePrompt?.default as Function)({
                namespace: 'abc'
            })
        ).toMatchInlineSnapshot(`"abc"`);

        // validators
        const validateNamespaceSpy = jest.spyOn(projectValidators, 'validateNamespace').mockReturnValue(true);
        expect(namespacePrompt?.validate!(undefined, {})).toEqual(true);

        const args = ['abc', { name: 'project1' }] as const;
        expect(namespacePrompt?.validate!(...args)).toEqual(true);
        expect(validateNamespaceSpy).toHaveBeenCalledWith(args[0], args[1].name);

        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.name]: {
                default: 'defaultAppName'
            }
        };
        questions = getQuestions([], promptOpts);
        namespacePrompt = questions.find((question) => question.name === promptNames.namespace);
        expect(namespacePrompt?.validate!('def', {})).toEqual(true);
        expect(validateNamespaceSpy).toHaveBeenCalledWith('def', promptOpts.name?.default);
    });

    test('getQuestions, prompt: `description`, default', () => {
        const questions = getQuestions([]);
        // defaults
        const descPrompt = questions.find((question) => question.name === promptNames.description);
        expect((descPrompt?.default as Function)({})).toMatchInlineSnapshot(`"An SAP Fiori application."`);

        expect(
            (descPrompt?.default as Function)({
                description: 'abc 123'
            })
        ).toMatchInlineSnapshot(`"abc 123"`);
    });

    test('getQuestions, prompt: `targetFolder`', () => {
        const mockCwd = '/any/current/working/directory';
        jest.spyOn(process, 'cwd').mockReturnValueOnce(mockCwd);
        let questions = getQuestions([]);
        // defaults, cwd
        let targetFolderPrompt = questions.find((question) => question.name === promptNames.targetFolder);
        expect((targetFolderPrompt?.default as Function)({})).toEqual(mockCwd);
        // already answered
        const mockAnsTargetFolder = '/any/answered/target/folder';
        expect((targetFolderPrompt?.default as Function)({ targetFolder: mockAnsTargetFolder })).toEqual(
            mockAnsTargetFolder
        );
        // target folder provided with prompt options
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.targetFolder]: {
                default: '/any/passed/target/folder'
            }
        };
        questions = getQuestions([], promptOpts);
        targetFolderPrompt = questions.find((question) => question.name === promptNames.targetFolder);
        expect(targetFolderPrompt?.default).toEqual(promptOpts.targetFolder?.default);

        // validators
        questions = getQuestions([]);
        targetFolderPrompt = questions.find((question) => question.name === promptNames.targetFolder);
        expect(targetFolderPrompt?.validate!(undefined, {})).toEqual(false);

        const projectValidatorSpy = jest.spyOn(projectValidators, 'validateProjectFolder').mockReturnValueOnce(true);
        const args = ['/some/target/path', { name: 'project1' }] as const;
        expect(targetFolderPrompt?.validate!(...args)).toEqual(true);
        expect(projectValidatorSpy).toHaveBeenCalledWith(...[args[0], args[1].name]);

        // Test `defaultValue` prompt option - should not replace existing default function
        const promptOptionsDefaultValue = {
            [promptNames.targetFolder]: {
                defaultValue: '/default/target/folder'
            }
        };

        questions = getQuestions([], promptOptionsDefaultValue);
        const targetFolderPromptWithDefaultValue = questions.find(
            (question) => question.name === promptNames.targetFolder
        );
        expect(targetFolderPromptWithDefaultValue?.default({})).toEqual(
            promptOptionsDefaultValue.targetFolder?.defaultValue
        );
        expect(targetFolderPromptWithDefaultValue?.default({ targetFolder: 'user/input/target/folder' })).toEqual(
            'user/input/target/folder'
        );
    });

    test('getQuestions, prompt: `ui5VersionChoice`', () => {
        // No UI5 versions specified
        let questions = getQuestions([]);
        let ui5VersionPrompt = questions.find((question) => question.name === promptNames.ui5Version);
        expect((ui5VersionPrompt?.when as Function)()).toEqual(true);
        expect(ui5VersionPrompt?.type).toEqual('list');
        expect(((ui5VersionPrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`[]`);

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
        const expectedUI5VerChoices = [
            {
                'name': '1.118.0 - (Maintained version)',
                'value': '1.118.0'
            },
            {
                'name': '1.117.0 - (Maintained version)',
                'value': '1.117.0'
            },
            {
                'name': '1.116.0 - (Out of maintenance version)',
                'value': '1.116.0'
            }
        ];
        // UI5 versions specified
        questions = getQuestions(ui5Vers);
        ui5VersionPrompt = questions.find((question) => question.name === promptNames.ui5Version);
        expect((ui5VersionPrompt?.when as Function)()).toEqual(true);
        expect(ui5VersionPrompt?.type).toEqual('list');
        expect(((ui5VersionPrompt as ListQuestion)?.choices as Function)()).toEqual(expectedUI5VerChoices);
        // No search input, all choices returned, source search is unit tested elsewhere
        expect((ui5VersionPrompt?.source as Function)()).toEqual(expectedUI5VerChoices);

        // Option `useAutocomplete` specified
        // UI5 versions specified
        questions = getQuestions(ui5Vers, {
            ui5Version: {
                useAutocomplete: true
            }
        });
        ui5VersionPrompt = questions.find((question) => question.name === promptNames.ui5Version);
        expect((ui5VersionPrompt?.when as Function)()).toEqual(true);
        expect(ui5VersionPrompt?.type).toEqual('autocomplete');
        expect(((ui5VersionPrompt as ListQuestion)?.choices as Function)()).toEqual(expectedUI5VerChoices);
        expect((ui5VersionPrompt?.source as Function)()).toEqual(expectedUI5VerChoices);
        // Default version should be used
        expect((ui5VersionPrompt?.default as Function)()).toEqual(expectedUI5VerChoices[0].value);

        // This choice is not a maintained version and so the closest maintained version should be returned
        const defaultChoice = {
            'name': '1.120.99',
            'value': '1.120.99'
        };
        questions = getQuestions(ui5Vers, {
            ui5Version: {
                defaultChoice
            }
        });

        ui5VersionPrompt = questions.find((question) => question.name === promptNames.ui5Version);
        expect(((ui5VersionPrompt as ListQuestion)?.choices as Function)()).toEqual([...expectedUI5VerChoices]);
        expect((ui5VersionPrompt?.default as Function)()).toEqual('1.118.0');
    });

    test('getQuestions, prompt: `addDeployConfig` conditions and message based on mta.yaml discovery', async () => {
        const mockMtaPath = undefined;
        const getMtaPathSpy = jest.spyOn(projectAccess, 'getMtaPath').mockResolvedValue(mockMtaPath);
        const mockCwd = '/any/current/working/directory';
        jest.spyOn(process, 'cwd').mockReturnValueOnce(mockCwd);

        // 'addDeployConfig' is always returned based on static inputs, it is the 'when' condition that determines its presence
        let questions = getQuestions([], undefined, mockCdsInfo);
        let addDeployConfigQuestion = questions.find((question) => question.name === promptNames.addDeployConfig);
        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.addDeployConfig })])
        );
        // Mta path is calculated by the when condition which is executed before the message function
        expect(await (addDeployConfigQuestion?.when as Function)()).toEqual(false);
        expect((addDeployConfigQuestion?.message as Function)()).toMatchInlineSnapshot(
            `"Add deployment configuration"`
        );

        getMtaPathSpy.mockResolvedValue({ mtaPath: 'any/path', hasRoot: false });
        questions = getQuestions([], undefined, mockCdsInfo);
        addDeployConfigQuestion = questions.find((question) => question.name === promptNames.addDeployConfig);
        expect(await (addDeployConfigQuestion?.when as Function)()).toEqual(true);
        expect(getMtaPathSpy).toHaveBeenCalledWith(mockCwd);

        const targetFolder = '/any/target/folder';
        expect(await (addDeployConfigQuestion?.when as Function)({ targetFolder })).toEqual(true);
        expect(getMtaPathSpy).toHaveBeenCalledWith(targetFolder);

        expect((addDeployConfigQuestion?.message as Function)()).toMatchInlineSnapshot(
            `"Add deployment configuration to MTA project (any/path)"`
        );
        expect(await (addDeployConfigQuestion?.default as Function)()).toEqual(true);
    });

    test('getQuestions, prompt: `addDeployConfig` validator', async () => {
        // 'addDeployConfig' is always returned based on static inputs, it is the 'when' condition that determines its presence
        let questions = getQuestions([]);
        let addDeployConfigQuestion = questions.find((question) => question.name === promptNames.addDeployConfig);
        expect(await (addDeployConfigQuestion?.validate as Function)()).toEqual(true);
        const validatorCbSpy = jest.fn();
        questions = getQuestions([], {
            addDeployConfig: {
                validatorCallback: validatorCbSpy
            }
        });
        addDeployConfigQuestion = questions.find((question) => question.name === promptNames.addDeployConfig);
        expect((addDeployConfigQuestion?.validate as Function)(false)).toBe(true);
        expect(validatorCbSpy).toHaveBeenCalledWith(false, promptNames.addDeployConfig);
        expect((addDeployConfigQuestion?.validate as Function)(true)).toBe(true);
        expect(validatorCbSpy).toHaveBeenCalledWith(true, promptNames.addDeployConfig);
    });

    test('getQuestions, prompt: `addFlpConfig`', async () => {
        let questions = getQuestions([]);
        let addFlpConfigQuestion = questions.find((question) => question.name === promptNames.addFlpConfig);

        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.addFlpConfig })])
        );
        expect((addFlpConfigQuestion?.message as Function)()).toMatchInlineSnapshot(`"Add FLP configuration"`);

        expect(await (addFlpConfigQuestion?.validate as Function)()).toEqual(true);
        const validatorCbSpy = jest.fn();
        questions = getQuestions([], {
            addFlpConfig: {
                validatorCallback: validatorCbSpy
            }
        });
        addFlpConfigQuestion = questions.find((question) => question.name === promptNames.addFlpConfig);
        expect((addFlpConfigQuestion?.validate as Function)(false)).toBe(true);
        expect(validatorCbSpy).toHaveBeenCalledWith(false, promptNames.addFlpConfig);
        expect((addFlpConfigQuestion?.validate as Function)(true)).toBe(true);
        expect(validatorCbSpy).toHaveBeenCalledWith(true, promptNames.addFlpConfig);
    });

    test('getQuestions, prompt: `ui5Theme`', async () => {
        const getDefaultUI5ThemeSpy = jest.spyOn(ui5Info, 'getDefaultUI5Theme');
        const questions = getQuestions([]);
        const ui5ThemeQuestion = questions.find((question) => question.name === promptNames.ui5Theme);

        expect(questions).toEqual(expect.arrayContaining([expect.objectContaining({ name: promptNames.ui5Theme })]));
        expect((ui5ThemeQuestion?.default as Function)({})).toEqual(ui5ThemeIds.SAP_HORIZON);
        expect(getDefaultUI5ThemeSpy).toHaveBeenCalledWith(undefined);

        const ui5Theme = ui5ThemeIds.SAP_FIORI_3;
        getDefaultUI5ThemeSpy.mockClear();
        expect((ui5ThemeQuestion?.default as Function)({ [promptNames.ui5Theme]: ui5Theme })).toEqual(
            ui5ThemeIds.SAP_FIORI_3
        );
        expect(getDefaultUI5ThemeSpy).not.toHaveBeenCalledWith();

        const ui5Version = '9.999.999';
        getDefaultUI5ThemeSpy.mockClear();
        expect((ui5ThemeQuestion?.default as Function)({ [promptNames.ui5Version]: ui5Version })).toEqual(
            ui5ThemeIds.SAP_HORIZON
        );
        expect(getDefaultUI5ThemeSpy).toHaveBeenCalledWith(ui5Version);

        // choices
        // Mock themes
        const mockThemes = [
            { id: ui5ThemeIds.SAP_FIORI_3_DARK, label: 'Theme One' },
            { id: ui5ThemeIds.SAP_HORIZON_DARK, label: 'Theme Two' }
        ];
        const getUI5ThemesSpy = jest.spyOn(ui5Info, 'getUi5Themes').mockReturnValue(mockThemes);
        expect(((ui5ThemeQuestion as ListQuestion)?.choices as Function)({})).toMatchInlineSnapshot(`
            [
              {
                "name": "Theme One",
                "value": "sap_fiori_3_dark",
              },
              {
                "name": "Theme Two",
                "value": "sap_horizon_dark",
              },
            ]
        `);
        expect(getUI5ThemesSpy).toHaveBeenCalledWith(defaultVersion);
        getUI5ThemesSpy.mockClear();
        ((ui5ThemeQuestion as ListQuestion)?.choices as Function)({ [promptNames.ui5Version]: ui5Version });
        expect(getUI5ThemesSpy).toHaveBeenCalledWith(ui5Version);
    });

    test('getQuestions, prompt: `enableEslint`', () => {
        let questions = getQuestions([]);
        let enableEslintQuestion = questions.find((question) => question.name === promptNames.enableEslint);
        // defaults
        expect(enableEslintQuestion?.default).toEqual(false);
        questions = getQuestions([], {
            enableEslint: {
                default: true
            }
        });
        enableEslintQuestion = questions.find((question) => question.name === promptNames.enableEslint);
        expect(enableEslintQuestion?.default).toEqual(true);
    });

    test('getQuestions, prompt: `enableCodeAssist`', () => {
        let questions = getQuestions([]);
        let enableCodeAssistQuestion = questions.find((question) => question.name === promptNames.enableCodeAssist);
        // defaults
        expect(enableCodeAssistQuestion?.default).toEqual(false);
        questions = getQuestions([], {
            enableCodeAssist: {
                default: true
            }
        });
        enableCodeAssistQuestion = questions.find((question) => question.name === promptNames.enableCodeAssist);
        expect(enableCodeAssistQuestion?.default).toEqual(true);

        // when condition, test that the ui5Version answer supports code assist
        let ui5Version = '1.64.0';
        expect((enableCodeAssistQuestion?.when as Function)({ [promptNames.ui5Version]: ui5Version })).toEqual(false);
        ui5Version = inc(minUi5VersionSupportingCodeAssist, 'patch')!;
        expect((enableCodeAssistQuestion?.when as Function)({ [promptNames.ui5Version]: ui5Version })).toEqual(true);
        // No ui5 version should default to latest and therefore return true
        expect((enableCodeAssistQuestion?.when as Function)({})).toEqual(true);
    });

    test('getQuestions, prompt: `skipAnnotations`', () => {
        let questions = getQuestions([]);
        let skipAnnotationsQuestion = questions.find((question) => question.name === promptNames.skipAnnotations);
        // defaults
        expect(skipAnnotationsQuestion?.default).toEqual(false);
        questions = getQuestions([], {
            skipAnnotations: {
                default: true
            }
        });
        skipAnnotationsQuestion = questions.find((question) => question.name === promptNames.skipAnnotations);
        // defaults
        expect(skipAnnotationsQuestion?.default).toEqual(true);
    });

    test('getQuestions, prompt: `enableNPMWorkspaces`', () => {
        const questions = getQuestions([]);
        let enableNPMWorkspacesQuestion = questions.find(
            (question) => question.name === promptNames.enableNPMWorkspaces
        );
        // when condition
        expect((enableNPMWorkspacesQuestion?.when as Function)()).toEqual(false);

        enableNPMWorkspacesQuestion = getQuestions([], undefined, mockCdsInfo).find(
            (question) => question.name === promptNames.enableNPMWorkspaces
        );
        expect((enableNPMWorkspacesQuestion?.when as Function)()).toEqual(true);
    });

    test('getQuestions, prompt: `enableTypeScript`', () => {
        let questions = getQuestions([]);
        let enableTypeScriptQuestion = questions.find((question) => question.name === promptNames.enableTypeScript);
        // default
        expect(enableTypeScriptQuestion?.default).toEqual(false);
        questions = getQuestions([], {
            enableTypeScript: {
                default: () => true
            }
        });
        enableTypeScriptQuestion = questions.find((question) => question.name === promptNames.enableTypeScript);
        expect(enableTypeScriptQuestion?.default()).toEqual(true);

        // when
        expect((enableTypeScriptQuestion?.when as Function)()).toEqual(true);
        const mockCdsInfoFalse = {
            hasCdsUi5Plugin: false,
            isCdsUi5PluginEnabled: false,
            isWorkspaceEnabled: false,
            hasMinCdsVersion: false
        };
        enableTypeScriptQuestion = getQuestions([], undefined, mockCdsInfoFalse).find(
            (question) => question.name === promptNames.enableTypeScript
        );
        expect((enableTypeScriptQuestion?.when as Function)()).toEqual(false);

        enableTypeScriptQuestion = getQuestions([], undefined, mockCdsInfoFalse).find(
            (question) => question.name === promptNames.enableTypeScript
        );
        expect((enableTypeScriptQuestion?.when as Function)({ [promptNames.enableNPMWorkspaces]: true })).toEqual(true);

        enableTypeScriptQuestion = getQuestions([], undefined, {
            hasCdsUi5Plugin: true,
            isCdsUi5PluginEnabled: true,
            isWorkspaceEnabled: true,
            hasMinCdsVersion: true
        }).find((question) => question.name === promptNames.enableTypeScript);
        expect((enableTypeScriptQuestion?.when as Function)()).toEqual(true);
    });

    test('getQuestions, advanced prompt grouping', () => {
        const advancedOptions = {
            [promptNames.ui5Theme]: {
                advancedOption: true
            },
            [promptNames.skipAnnotations]: {
                advancedOption: true
            },
            /**
             * Existing when() combined with advanced condition
             */
            [promptNames.enableNPMWorkspaces]: {
                advancedOption: true
            }
        };
        const questions = getQuestions([], advancedOptions, mockCdsInfo);

        Object.keys(advancedOptions).forEach((questionName) => {
            const question = questions.find(({ name }) => name === questionName);
            expect((question?.when as Function)({ [promptNames.showAdvanced]: false })).toEqual(false);
            expect((question?.when as Function)({ [promptNames.showAdvanced]: true })).toEqual(true);
        });
    });
});
