import type { AppIndex, AbapServiceProvider } from '@sap-ux/axios-extension';
import { getSystemSelectionQuestions } from '@sap-ux/odata-service-inquirer';
import type { RepoAppDownloadAnswers, RepoAppDownloadQuestions, QuickDeployedAppConfig, AppInfo } from '../app/types';
import { PromptNames } from '../app/types';
import { t } from '../utils/i18n';
import type { FileBrowserQuestion } from '@sap-ux/inquirer-common';
import { validateFioriAppTargetFolder } from '@sap-ux/project-input-validator';
import { PromptState } from './prompt-state';
import { fetchAppListForSelectedSystem, formatAppChoices } from './prompt-helpers';

/**
 * Gets the target folder selection prompt.
 *
 * @param {string} [appRootPath] - The application root path.
 * @param {string} appId - The application ID.
 * @returns {FileBrowserQuestion<RepoAppDownloadAnswers>} The target folder prompt configuration.
 */
const getTargetFolderPrompt = (appRootPath?: string, appId?: string): FileBrowserQuestion<RepoAppDownloadAnswers> => {
    return {
        type: 'input',
        name: PromptNames.targetFolder,
        message: t('prompts.targetPath.message'),
        guiType: 'folder-browser',
        when: (answers: RepoAppDownloadAnswers) => {
            // Display the prompt if appId is provided. This occurs when the generator is invoked
            // as part of the quick deployment process from ADT.
            if (appId) {
                return true;
            }
            // If appId is not provided, check if the user has selected an app.
            // If an app is selected, display the prompt accordingly.
            return Boolean(answers?.selectedApp?.appId);
        },
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true,
            breadcrumb: t('prompts.targetPath.breadcrumb')
        },
        validate: async (target, answers: RepoAppDownloadAnswers): Promise<boolean | string> => {
            const selectedAppId = answers.selectedApp?.appId ?? appId;
            return await validateFioriAppTargetFolder(target, selectedAppId, true);
        },
        default: () => appRootPath
    } as FileBrowserQuestion<RepoAppDownloadAnswers>;
};

/**
 * Retrieves questions for selecting system, app lists and target path where app will be generated.
 *
 * @param {string} [appRootPath] - The root path of the application.
 * @param {QuickDeployedAppConfig} [quickDeployedAppConfig] - quick deployed app config.
 * @returns {Promise<RepoAppDownloadQuestions[]>} A list of questions for user interaction.
 */
export async function getPrompts(
    appRootPath?: string,
    quickDeployedAppConfig?: QuickDeployedAppConfig
): Promise<RepoAppDownloadQuestions[]> {
    PromptState.reset();
    // If quickDeployedAppConfig is provided, return only the target folder prompt
    if (quickDeployedAppConfig?.appId) {
        return [getTargetFolderPrompt(appRootPath, quickDeployedAppConfig.appId)] as RepoAppDownloadQuestions[];
    }

    const systemQuestions = await getSystemSelectionQuestions({ serviceSelection: { hide: true } }, false);
    let appList: AppIndex = [];
    const appSelectionPrompt = [
        {
            when: async (answers: RepoAppDownloadAnswers): Promise<boolean> => {
                if (answers[PromptNames.systemSelection]) {
                    appList = await fetchAppListForSelectedSystem(
                        systemQuestions.answers.connectedSystem?.serviceProvider as AbapServiceProvider
                    );
                }
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
            choices: (): { name: string; value: AppInfo }[] => (appList.length ? formatAppChoices(appList) : []),
            validate: (): string | boolean => (appList.length ? true : t('prompts.appSelection.noAppsDeployed'))
        }
    ];

    const targetFolderPrompts = getTargetFolderPrompt(appRootPath, quickDeployedAppConfig?.appId);
    return [...systemQuestions.prompts, ...appSelectionPrompt, targetFolderPrompts] as RepoAppDownloadQuestions[];
}
