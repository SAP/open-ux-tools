import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import { getSystemSelectionQuestions, promptNames } from '@sap-ux/odata-service-inquirer';
import type { BspAppDownloadAnswers } from './types';
import { PromptNames } from './types';
import { Severity } from '@sap-devx/yeoman-ui-types';
import { t } from '../utils/i18n';
import type { FileBrowserQuestion } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import type { Question } from 'inquirer';
import { getAppList } from '../utils/utils';
import { validateTargetFolderForFioriApp } from '@sap-ux/project-input-validator';
import { PromptState } from '../utils/prompt-state';

/**
 * Gets the target folder prompt.
 *
 * @param appRootPath - The application root path.
 * @returns - The target folder prompt.
 */
const getTargetFolderPrompt = (appRootPath?: string) => {
    return {
        type: 'input',
        name: PromptNames.targetFolder,
        message: t('prompts.targetPath.targetPathMessage'),
        guiType: 'folder-browser',
        when: (answers: BspAppDownloadAnswers) => Boolean(answers?.selectedApp?.appId),
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true,
            breadcrumb: t('prompts.targetPath.targetPathBreadcrumb')
        },
        validate: async (target, answers: BspAppDownloadAnswers): Promise<boolean | string> => {
            return await validateTargetFolderForFioriApp(target, answers.selectedApp.appId, true);
        },
        default: () => appRootPath
    } as FileBrowserQuestion<BspAppDownloadAnswers>;
};

/**
 *
 * @param appRootPath
 * @param log
 */
export async function getQuestions(appRootPath?: string, log?: Logger): Promise<Question<BspAppDownloadAnswers>[]> {
    PromptState.reset();
    const systemQuestions = await getSystemSelectionQuestions({ serviceSelection: { hide: true } }, true);
    let appList: AppIndex = [];
    let result: Question<BspAppDownloadAnswers>[] = [];

    const appSelectionPrompt = [
        {
            when: async (answers: BspAppDownloadAnswers): Promise<boolean> => {
                if (answers[promptNames.systemSelection] && systemQuestions.answers.connectedSystem?.serviceProvider) {
                    PromptState.systemSelection = {
                        connectedSystem: {
                            serviceProvider: systemQuestions.answers.connectedSystem
                                .serviceProvider as unknown as AbapServiceProvider
                        }
                    };
                    appList = await getAppList(
                        PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider
                    );
                    return !!appList.length;
                }
                return false;
            },
            type: 'list',
            name: PromptNames.selectedApp,
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            message: t('prompts.appSelection.message'),
            choices: async () =>
                appList.length
                    ? appList.map((app: any) => ({
                          name: `${app['sap.app/id']}`,
                          value: {
                              appId: app['sap.app/id'],
                              title: app['sap.app/title'],
                              description: app['sap.app/description'],
                              repoName: app['repoName'],
                              url: app['url']
                          }
                      }))
                    : [],
            additionalMessages: async () =>
                appList.length === 0
                    ? {
                          message: t('prompts.appSelection.noAppsDeployed'),
                          severity: Severity.warning
                      }
                    : undefined
        }
    ];

    const targetFolderPrompts = getTargetFolderPrompt(appRootPath);
    result = [
        ...systemQuestions.prompts,
        ...appSelectionPrompt,
        targetFolderPrompts
    ] as Question<BspAppDownloadAnswers>[];

    return result;
}
