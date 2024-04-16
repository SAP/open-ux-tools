import type { ListQuestion } from 'inquirer';
import { initI18n, t } from '../../../src/i18n';
import { getQuestions } from '../../../src/prompts/';
import { promptNames } from '../../../src/types';
import type { CheckBoxQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { ReuseLibType } from '@sap-ux/project-access';
import * as projectAccess from '@sap-ux/project-access';
import { Severity } from '@sap-devx/yeoman-ui-types';

describe('getQuestions', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
        jest.restoreAllMocks();
    });

    test('getQuestions, no project, libs or options', () => {
        const questions = getQuestions();
        const targetFolderPrompt = questions.find((question) => question.name === promptNames.targetProjectFolder);
        const referenceLibrariesPrompt = questions.find((question) => question.name === promptNames.referenceLibraries);

        expect(questions).toMatchSnapshot();
        expect((targetFolderPrompt as ListQuestion)?.choices).toBeUndefined();
        expect(((targetFolderPrompt as ListQuestion)?.default as Function)()).toBeUndefined();
        expect(((targetFolderPrompt as ListQuestion)?.validate as Function)()).toBe(t('error.noProjectsFound'));

        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)()).toBe(t('error.noLibsFound'));
    });

    test('getQuestions, with project & libs', () => {
        const projectChoices = [{ name: 'project1', value: 'project1' }];
        const reuseLibs = [
            {
                name: 'lib1',
                value: {
                    name: 'lib1',
                    path: 'path/to/lib1',
                    type: ReuseLibType.Library,
                    uri: 'uri.for.lib1',
                    dependencies: ['dep1'],
                    libRoot: 'lib/root'
                }
            }
        ];

        const questions = getQuestions(projectChoices, reuseLibs);
        const targetFolderPrompt = questions.find((question) => question.name === promptNames.targetProjectFolder);
        const referenceLibrariesPrompt = questions.find((question) => question.name === promptNames.referenceLibraries);

        expect((targetFolderPrompt as ListQuestion)?.choices).toBe(projectChoices);
        expect(((targetFolderPrompt as ListQuestion)?.default as Function)()).toBe(0);
        expect(((targetFolderPrompt as ListQuestion)?.validate as Function)()).toBe(true);

        expect((referenceLibrariesPrompt as CheckBoxQuestion)?.choices).toBe(reuseLibs);
        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)()).toBe(true);
        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)([])).toBe(
            t('error.noLibSelected')
        );
        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)(reuseLibs)).toBe(true);

        expect(((referenceLibrariesPrompt as YUIQuestion)?.additionalMessages as Function)()).toBeUndefined();

        jest.spyOn(projectAccess, 'checkDependencies').mockReturnValue('dep1');
        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)(reuseLibs)).toBe(true);
        expect(((referenceLibrariesPrompt as YUIQuestion)?.additionalMessages as Function)()).toStrictEqual({
            message: t('addtionalMsgs.missingDeps', { dependencies: 'dep1' }),
            severity: Severity.warning
        });
    });

    test('getQuestions, with project & libs and hide options', () => {
        const projectChoices = [{ name: 'project1', value: 'project1' }];
        const reuseLibs = [
            {
                name: 'lib1',
                value: {
                    name: 'lib1',
                    path: 'path/to/lib1',
                    type: ReuseLibType.Library,
                    uri: 'uri.for.lib1',
                    dependencies: ['dep1'],
                    libRoot: 'lib/root'
                }
            }
        ];

        const promptOptions = {
            [promptNames.source]: {
                hide: true
            }
        };

        const questions = getQuestions(projectChoices, reuseLibs, promptOptions);

        expect(questions.find((question) => question.name === promptNames.source)).toBeUndefined();
    });
});
