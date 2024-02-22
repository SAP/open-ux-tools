import { join } from 'path';
import { initI18nUi5AppInquirer } from '../../../src/i18n';
import * as promptHelpers from '../../../src/prompts/prompt-helpers';
import { appPathExists, defaultAppName, isVersionIncluded, withCondition } from '../../../src/prompts/prompt-helpers';
import { latestVersionString } from '@sap-ux/ui5-info';

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
});
