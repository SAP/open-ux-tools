import type { IMessageSeverity } from '@sap-ux/inquirer-common';
import { Severity } from '@sap-ux/inquirer-common';
import { latestVersionString } from '@sap-ux/ui5-info';
import type { Answers } from 'inquirer';
import { join } from 'path';
import { initI18nUi5AppInquirer } from '../../../src/i18n';
import * as promptHelpers from '../../../src/prompts/prompt-helpers';
import {
    appPathExists,
    defaultAppName,
    extendWithOptions,
    hidePrompts,
    isVersionIncluded,
    withCondition
} from '../../../src/prompts/prompt-helpers';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions, UI5ApplicationQuestion } from '../../../src/types';
import { promptNames } from '../../../src/types';

describe('prompt-helpers', () => {
    const testTempDir = join(__dirname, './test-tmp');

    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nUi5AppInquirer();
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
        jest.restoreAllMocks();
    });

    test('appPathExists', () => {
        const mockCwd = '/any/current/working/directory';
        let cwdSpy = jest.spyOn(process, 'cwd').mockReturnValueOnce(mockCwd);
        expect(appPathExists('prompts')).toEqual(false);
        expect(cwdSpy).toHaveBeenCalled();
        cwdSpy.mockClear();

        const parentPath = join(__dirname, '../');
        expect(appPathExists('prompts', parentPath)).toEqual(true);
        expect(cwdSpy).not.toHaveBeenCalled();
        cwdSpy.mockClear();

        cwdSpy = jest.spyOn(process, 'cwd').mockReturnValueOnce(parentPath);
        expect(appPathExists('prompts')).toEqual(true);
        expect(cwdSpy).toHaveBeenCalled();
    });

    test('defaultAppName', () => {
        jest.spyOn(promptHelpers, 'appPathExists').mockReturnValue(false);
        expect(defaultAppName(testTempDir)).toEqual('project1');
        jest.spyOn(promptHelpers, 'appPathExists').mockReturnValueOnce(true);
        expect(defaultAppName(testTempDir)).toEqual('project2');
        // Test maximal suggested app name
        jest.spyOn(promptHelpers, 'appPathExists').mockReturnValue(true);
        expect(defaultAppName(testTempDir)).toEqual('project1000');
    });

    test('isVersionIncluded', () => {
        expect(isVersionIncluded('1.1.1', '0.0.1')).toEqual(true);
        expect(isVersionIncluded('1.1.1', '1.1.1')).toEqual(true);
        expect(isVersionIncluded('1.1.1', '1.1.2')).toEqual(false);
        expect(isVersionIncluded('2.2.2-snapshot', '1.1.1')).toEqual(true);
        expect(isVersionIncluded(latestVersionString, '1.1.1')).toEqual(true);
        expect(isVersionIncluded('not-a-version', '0.0.0')).toEqual(false);
    });

    test('withCondition', () => {
        const questions = [
            {
                type: 'input',
                name: 'A',
                message: 'Message A'
            },
            {
                when: () => false,
                type: 'list',
                name: 'B',
                message: 'Message B'
            },
            {
                when: false,
                type: 'list',
                name: 'C',
                message: 'Message C'
            },
            {
                when: () => true,
                type: 'list',
                name: 'D',
                message: 'Message D'
            },
            {
                when: true,
                type: 'list',
                name: 'E',
                message: 'Message E'
            },
            {
                when: (answers: Record<string, string>) => answers.A === 'answerA',
                type: 'list',
                name: 'F',
                message: 'Message F'
            }
        ];

        const questionsWithTrueCondition = withCondition(questions, () => true);
        expect(questionsWithTrueCondition[0].name).toEqual('A');
        expect((questionsWithTrueCondition[0].when as Function)()).toEqual(true);
        expect(questionsWithTrueCondition[1].name).toEqual('B');
        expect((questionsWithTrueCondition[1].when as Function)()).toEqual(false);
        expect(questionsWithTrueCondition[2].name).toEqual('C');
        expect((questionsWithTrueCondition[2].when as Function)()).toEqual(false);
        expect(questionsWithTrueCondition[3].name).toEqual('D');
        expect((questionsWithTrueCondition[3].when as Function)()).toEqual(true);
        expect(questionsWithTrueCondition[4].name).toEqual('E');
        expect((questionsWithTrueCondition[4].when as Function)()).toEqual(true);
        expect(questionsWithTrueCondition[5].name).toEqual('F');
        expect((questionsWithTrueCondition[5].when as Function)({ A: 'answerA' })).toEqual(true);
        expect((questionsWithTrueCondition[5].when as Function)({ A: 'answerA1' })).toEqual(false);

        const questionsWithAnswersCondition = withCondition(
            questions,
            (answers: Record<string, string>) => answers.B === 'answerB'
        );
        expect(questionsWithAnswersCondition[0].name).toEqual('A');
        expect((questionsWithAnswersCondition[0].when as Function)({ B: 'answerB' })).toEqual(true);
        expect(questionsWithAnswersCondition[1].name).toEqual('B');
        expect((questionsWithAnswersCondition[1].when as Function)({ B: 'answerB' })).toEqual(false);
        expect(questionsWithAnswersCondition[2].name).toEqual('C');
        expect((questionsWithAnswersCondition[2].when as Function)({ B: 'answerB' })).toEqual(false);
        expect(questionsWithAnswersCondition[3].name).toEqual('D');
        expect((questionsWithAnswersCondition[3].when as Function)({ B: 'answerB' })).toEqual(true);
        expect(questionsWithAnswersCondition[4].name).toEqual('E');
        expect((questionsWithAnswersCondition[4].when as Function)({ B: 'answerB' })).toEqual(true);
        expect(questionsWithAnswersCondition[5].name).toEqual('F');
        expect((questionsWithAnswersCondition[5].when as Function)({ B: 'answerB' })).toEqual(false);
        expect((questionsWithAnswersCondition[5].when as Function)({ A: 'answerA', B: 'answerB' })).toEqual(true);

        const questionsWithFalseCondition = withCondition(questions, () => false);
        expect(questionsWithFalseCondition[0].name).toEqual('A');
        expect((questionsWithFalseCondition[0].when as Function)()).toEqual(false);
    });

    test('extendWithOptions, no options specified', () => {
        const questions = [
            {
                type: 'input',
                name: promptNames.name,
                message: 'Message A',
                validate: (input: string) => !!input
            },
            {
                type: 'input',
                name: promptNames.description,
                message: 'Message B',
                validate: (input: string) => !!input
            }
        ] as UI5ApplicationQuestion[];

        // No options provided
        const extQuestions = extendWithOptions(questions, {});
        expect(extendWithOptions(questions, {})).toEqual(questions);
        const nameQuestionValidate = extQuestions.find((question) => question.name === promptNames.name)
            ?.validate as Function;
        expect(nameQuestionValidate('')).toEqual(false);
        expect(nameQuestionValidate('a')).toEqual(true);

        const descriptionQuestionValidate = extQuestions.find((question) => question.name === promptNames.description)
            ?.validate as Function;
        expect(descriptionQuestionValidate('')).toEqual(false);
        expect(descriptionQuestionValidate('a')).toEqual(true);
    });

    test('extendWithOptions, `validate` and `default` prompt options specified', () => {
        const questionA = {
            type: 'input',
            name: promptNames.name,
            message: 'Message',
            default: false
        };

        let promptOptions: UI5ApplicationPromptOptions = {
            [promptNames.name]: {
                validate: (val) => (!val ? 'bad input' : true),
                default: () => 'some default val from func'
            }
        };

        let extQuestions = extendWithOptions([questionA], promptOptions);
        let nameQuestion = extQuestions.find((question) => question.name === promptNames.name);
        let nameQuestionDefault = nameQuestion?.default as Function;
        // Default value should override original value
        expect(nameQuestionDefault()).toEqual('some default val from func');
        // No validate in original question, should apply extension
        let nameQuestionValidate = nameQuestion?.validate as Function;
        expect(nameQuestionValidate(undefined)).toEqual('bad input');
        expect(nameQuestionValidate('good')).toEqual(true);

        // Test that original validator is still applied
        const questionB = {
            type: 'input',
            name: promptNames.name,
            message: 'Message',
            default: false,
            validate: (val: string) => (val === 'bad input B' ? `Input: "${val}" is invalid` : true)
        };

        promptOptions = {
            [promptNames.name]: {
                validate: (val) => (!val ? 'bad input' : true)
            }
        };

        extQuestions = extendWithOptions([questionB], promptOptions);
        nameQuestion = extQuestions.find((question) => question.name === promptNames.name);
        nameQuestionDefault = nameQuestion?.default;
        // Default value should override original value
        // Default value should use original value
        expect(nameQuestionDefault).toEqual(false);
        // Both original and extended validation is applied
        nameQuestionValidate = nameQuestion?.validate as Function;
        expect(nameQuestionValidate(undefined)).toEqual('bad input');
        expect(nameQuestionValidate('bad input B')).toEqual('Input: "bad input B" is invalid');
        expect(nameQuestionValidate('good')).toEqual(true);

        // Previous answers are provided to extended validator/default funcs
        const questions = [
            {
                type: 'input',
                name: promptNames.name,
                message: 'Message A'
            },
            {
                type: 'input',
                name: promptNames.description,
                message: 'Message B',
                validate: (input: string) => !!input,
                default: 'description'
            }
        ] as UI5ApplicationQuestion[];

        promptOptions = {
            [promptNames.name]: {
                validate: (input: string, answers: UI5ApplicationAnswers | undefined) =>
                    input === 'name1' && answers?.description === 'abcd'
            },
            [promptNames.description]: {
                default: (answers: UI5ApplicationAnswers | undefined) =>
                    answers?.name === '1234' ? '1234 description' : 'none'
            }
        };

        // Options with validate funcs
        extQuestions = extendWithOptions(questions, promptOptions);
        nameQuestionValidate = extQuestions.find((question) => question.name === promptNames.name)
            ?.validate as Function;
        expect(nameQuestionValidate('name1', { description: 'abcd' })).toEqual(true);
        expect(nameQuestionValidate('name1', { description: 'efgh' })).toEqual(false);

        // Defaults should be replaced
        const descriptionQuestionDefault = extQuestions.find(
            (question) => question.name === promptNames.description
        )?.default;
        expect(descriptionQuestionDefault()).toEqual('none');
        expect(descriptionQuestionDefault({ name: '1234' })).toEqual('1234 description');
    });

    test('extendWithOptions: `additionaMessages` options specified', () => {
        // Additional messages
        const confirmQuestion = {
            type: 'confirm',
            name: promptNames.skipAnnotations,
            message: 'Message',
            default: false
        } as UI5ApplicationQuestion;

        const addMessageWarn: IMessageSeverity = {
            message: 'You must enter something',
            severity: Severity.warning
        };

        const addMessageInfo: IMessageSeverity = { message: 'thanks!', severity: Severity.information };

        let promptOptions: UI5ApplicationPromptOptions = {
            [promptNames.skipAnnotations]: {
                additionalMessages: (val) => (!val ? addMessageWarn : addMessageInfo)
            }
        };

        let extQuestions = extendWithOptions([confirmQuestion], promptOptions);
        let additionalMessages = extQuestions.find((question) => question.name === promptNames.skipAnnotations)
            ?.additionalMessages as Function;
        // Default value should use original value
        expect(additionalMessages()).toEqual(addMessageWarn);
        expect(additionalMessages(true)).toEqual(addMessageInfo);

        // Ensure override behaviour, use existing message if no message (undefined) returned
        const baseMsgWarn = {
            message: 'This is the base msg',
            severity: Severity.warning
        };
        const inputQuestion = {
            type: 'input',
            name: promptNames.name,
            message: 'Message',
            default: false,
            additionalMessages: (): IMessageSeverity => baseMsgWarn
        } as UI5ApplicationQuestion;
        const addMessageError = {
            message: 'The input value will result in an error',
            severity: Severity.warning
        };
        const previousAnswers: Answers = {
            a: 123,
            b: true,
            c: {
                name: 'name',
                value: 'somevalue'
            }
        };
        promptOptions = {
            [promptNames.name]: {
                additionalMessages: (val, previousAnswers) => {
                    if (val == 'abc' && previousAnswers?.a === 123) {
                        return addMessageError;
                    }
                    if (val === 'abc') {
                        return addMessageInfo;
                    }
                }
            }
        };
        extQuestions = extendWithOptions([inputQuestion], promptOptions);
        additionalMessages = extQuestions.find((question) => question.name === promptNames.name)
            ?.additionalMessages as Function;
        // Default value should use original value
        expect(additionalMessages()).toEqual(baseMsgWarn);
        // Previous answers tests
        expect(additionalMessages('abc', previousAnswers)).toEqual(addMessageError);
        expect(additionalMessages('def')).toEqual(baseMsgWarn);

        // Ensure only relevant prompt is updated
        const testNameAddMsg = { message: 'success', severity: Severity.information };
        promptOptions = {
            [promptNames.name]: {
                additionalMessages: (val) => (val === 'testName' ? testNameAddMsg : undefined)
            }
        };
        extQuestions = extendWithOptions(
            [
                { name: promptNames.name },
                { name: promptNames.description },
                { name: promptNames.title },
                { name: promptNames.targetFolder }
            ],
            promptOptions
        );
        expect(extQuestions).toMatchInlineSnapshot(`
            [
              {
                "additionalMessages": [Function],
                "name": "name",
              },
              {
                "name": "description",
              },
              {
                "name": "title",
              },
              {
                "name": "targetFolder",
              },
            ]
        `);
        additionalMessages = extQuestions.find((question) => question.name === promptNames.name)
            ?.additionalMessages as Function;
        expect(additionalMessages('testName')).toEqual(testNameAddMsg);
    });

    test('hidePrompts', () => {
        const prompts: Record<Partial<promptNames>, UI5ApplicationQuestion> = {
            [promptNames.name]: {
                name: promptNames.name
            },
            [promptNames.description]: {
                when: () => true,
                name: promptNames.description
            },
            [promptNames.addDeployConfig]: {
                when: (answers: UI5ApplicationAnswers) => answers.name === 'abcd1234',
                name: promptNames.addDeployConfig
            },
            [promptNames.title]: {
                name: promptNames.title
            },
            [promptNames.namespace]: {
                name: promptNames.namespace
            },
            [promptNames.targetFolder]: {
                name: promptNames.targetFolder
            },
            [promptNames.ui5Version]: {
                name: promptNames.ui5Version
            },
            [promptNames.addFlpConfig]: {
                name: promptNames.addFlpConfig
            },
            [promptNames.ui5Theme]: {
                name: promptNames.ui5Theme
            },
            [promptNames.enableEslint]: {
                name: promptNames.enableEslint
            },
            [promptNames.enableNPMWorkspaces]: {
                name: promptNames.enableNPMWorkspaces
            },
            [promptNames.enableCodeAssist]: {
                name: promptNames.enableCodeAssist
            },
            [promptNames.skipAnnotations]: {
                name: promptNames.skipAnnotations
            },
            [promptNames.enableTypeScript]: {
                name: promptNames.enableTypeScript
            },
            [promptNames.showAdvanced]: {
                name: promptNames.showAdvanced
            }
        };
        // All prompts returned
        expect(hidePrompts(prompts).length).toEqual(15);
        // Hide prompts that are not applicable for CAP projects
        let filteredPrompts = hidePrompts(prompts, {}, true);
        expect(filteredPrompts.length).toEqual(13);
        expect(filteredPrompts).not.toContainEqual({ name: promptNames.targetFolder });
        expect(filteredPrompts).not.toContainEqual({ name: promptNames.enableEslint });

        // Hide prompts based on propmt options
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.addDeployConfig]: {
                hide: true
            },
            [promptNames.skipAnnotations]: {
                hide: true
            },
            [promptNames.ui5Version]: {
                hide: true
            }
        };
        filteredPrompts = hidePrompts(prompts, promptOpts);
        expect(filteredPrompts.length).toEqual(12);
        expect(filteredPrompts).toEqual(expect.not.arrayContaining([{ name: promptNames.addDeployConfig }]));
        expect(filteredPrompts).toEqual(expect.not.arrayContaining([{ name: promptNames.skipAnnotations }]));
        expect(filteredPrompts).toEqual(expect.not.arrayContaining([{ name: promptNames.ui5Version }]));
    });
});
