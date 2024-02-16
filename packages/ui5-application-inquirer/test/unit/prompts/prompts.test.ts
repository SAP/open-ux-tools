import * as projectAccess from '@sap-ux/project-access';
import * as projectValidators from '@sap-ux/project-input-validator';
import { getQuestions } from '../../../src/prompts';
import * as utility from '../../../src/prompts/utility';
import type { UI5ApplicationPromptOptions } from '../../../src/types';
import { promptNames } from '../../../src/types';
import { initI18nUi5AppInquirer } from '../../../src/i18n';

jest.mock('@sap-ux/project-input-validator', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/project-input-validator')
    };
});

describe('getPrompts', () => {
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
        expect(getQuestions([])).toMatchSnapshot();
    });

    test('getQuestions, parameter `capCdsInfo` specified', () => {
        // Prompt: `targetFolder` should not returned for CAP projects
        expect(getQuestions([], undefined, undefined, mockCdsInfo)).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.targetFolder })])
        );

        // Prompt: `targetFolder` should only be returned for non-CAP projects
        expect(getQuestions([])).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.targetFolder })])
        );
    });

    test('getQuestions, prompt: `name`, conditional validator', () => {
        jest.spyOn(utility, 'pathExists').mockReturnValue(true);
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
            false,
            mockCdsInfo
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
            false
        );
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toEqual(true);

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
                default: 'defaultAppName'
            }
        };
        questions = getQuestions([], promptOpts);
        const namePrompt = questions.find((question) => question.name === promptNames.name);
        expect(namePrompt?.default).toEqual(promptOpts.name?.default);
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

    test('getQuestions, prompt: `addDeployConfig` conditions and message based on mta.yaml discovery', async () => {
        const mockMtaPath = undefined;
        const getMtaPathSpy = jest.spyOn(projectAccess, 'getMtaPath').mockResolvedValue(mockMtaPath);

        // 'addDeployConfig' is always returned based on static inputs, it is the 'when' condition that determines its presence
        let questions = getQuestions([], undefined, undefined, mockCdsInfo);
        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.addDeployConfig })])
        );
        // Mta path is calculated by the when condition which is executed before the message function
        expect(
            await (questions.find((question) => question.name === promptNames.addDeployConfig)?.when as Function)()
        ).toMatchInlineSnapshot(`false`);
        expect(
            (questions.find((question) => question.name === promptNames.addDeployConfig)?.message as Function)()
        ).toMatchInlineSnapshot(`"Add deployment configuration"`);

        getMtaPathSpy.mockResolvedValue({ mtaPath: 'any/path', hasRoot: false });
        questions = getQuestions([], undefined, undefined, mockCdsInfo);
        expect(
            await (questions.find((question) => question.name === promptNames.addDeployConfig)?.when as Function)()
        ).toMatchInlineSnapshot(`true`);
        expect(
            (questions.find((question) => question.name === promptNames.addDeployConfig)?.message as Function)()
        ).toMatchInlineSnapshot(`"Add deployment configuration to MTA project (any/path)"`);

        getMtaPathSpy.mockRestore();
    });
});
