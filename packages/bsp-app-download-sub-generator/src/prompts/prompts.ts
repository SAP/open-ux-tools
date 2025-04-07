import type { AppIndex, AbapServiceProvider } from '@sap-ux/axios-extension';
import { getSystemSelectionQuestions } from '@sap-ux/odata-service-inquirer';
import type { BspAppDownloadAnswers, BspAppDownloadQuestions } from '../app/types';
import { PromptNames } from '../app/types';
import { t } from '../utils/i18n';
import type { FileBrowserQuestion } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import { formatAppChoices } from './prompt-helpers';
import { validateFioriAppTargetFolder } from '@sap-ux/project-input-validator';
import { PromptState } from './prompt-state';
import { fetchAppListForSelectedSystem } from './prompt-helpers';

/**
 * Gets the target folder selection prompt.
 *
 * @param {string} [appRootPath] - The application root path.
 * @returns {FileBrowserQuestion<BspAppDownloadAnswers>} The target folder prompt configuration.
 */
const getTargetFolderPrompt = (appRootPath?: string): FileBrowserQuestion<BspAppDownloadAnswers> => {
    return {
        type: 'input',
        name: PromptNames.targetFolder,
        message: t('prompts.targetPath.message'),
        guiType: 'folder-browser',
        when: (answers: BspAppDownloadAnswers) => Boolean(answers?.selectedApp?.appId),
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true,
            breadcrumb: t('prompts.targetPath.breadcrumb')
        },
        validate: async (target, answers: BspAppDownloadAnswers): Promise<boolean | string> => {
            return await validateFioriAppTargetFolder(target, answers.selectedApp.appId, true);
        },
        default: () => appRootPath
    } as FileBrowserQuestion<BspAppDownloadAnswers>;
};

/**
 * Retrieves questions for selecting system, app lists and target path where app will be generated.
 *
 * @param {string} [appRootPath] - The root path of the application.
 * @param {Logger} [log] - Logger instance for debugging.
 * @returns {Promise<BspAppDownloadQuestions[]>} A list of questions for user interaction.
 */
export async function getPrompts(appRootPath?: string, log?: Logger): Promise<BspAppDownloadQuestions[]> {
    PromptState.reset();
    const systemQuestions = await getSystemSelectionQuestions({ serviceSelection: { hide: true } }, false); // todo: remove this isYUI value
    let appList: AppIndex = [];
    let result: BspAppDownloadQuestions[] = [];

    const appSelectionPrompt = [
        {
            when: async (answers: BspAppDownloadAnswers): Promise<boolean> => {
                appList = await fetchAppListForSelectedSystem(
                    answers,
                    systemQuestions.answers.connectedSystem?.serviceProvider as unknown as AbapServiceProvider,
                    log
                );
                // display app selection prompt only if user has selected a system
                return !!systemQuestions.answers.connectedSystem?.serviceProvider;
            },
            type: 'list',
            name: PromptNames.selectedApp,
            guiOptions: {
                mandatory: !!appList.length,
                breadcrumb: t('prompts.appSelection.breadcrumb')
            },
            message: t('prompts.appSelection.message'),
            choices: () => (appList.length ? formatAppChoices(appList) : []),
            validate: (): string | boolean => (appList.length ? true : t('prompts.appSelection.noAppsDeployed'))
        }
    ];

    const targetFolderPrompts = getTargetFolderPrompt(appRootPath);
    result = [...systemQuestions.prompts, ...appSelectionPrompt, targetFolderPrompts] as BspAppDownloadQuestions[];

    return result;
}