import type { AppIndex, AbapServiceProvider } from '@sap-ux/axios-extension';
import { getSystemSelectionQuestions } from '@sap-ux/odata-service-inquirer';
import type { BspAppDownloadAnswers, BspAppDownloadQuestions, QuickDeployedAppConfig } from '../app/types';
import { PromptNames } from '../app/types';
import { t } from '../utils/i18n';
import type { FileBrowserQuestion } from '@sap-ux/inquirer-common';
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
const getTargetFolderPrompt = (appRootPath?: string, appId?: string): FileBrowserQuestion<BspAppDownloadAnswers> => {
    return {
        type: 'input',
        name: PromptNames.targetFolder,
        message: t('prompts.targetPath.message'),
        guiType: 'folder-browser',
        when: (answers: BspAppDownloadAnswers) => {
            // Display the prompt if appId is provided. This occurs when the generator is invoked 
            // as part of the quick deployment process from ADT.
            if (appId) {
                return true;
            }
            // If appId is not provided, check if the user has selected an app.
            // If an app is selected, display the prompt accordingly.
            return Boolean(answers?.selectedApp?.appId)
        },
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true,
            breadcrumb: t('prompts.targetPath.breadcrumb')
        },
        validate: async (target, answers: BspAppDownloadAnswers): Promise<boolean | string> => {
            const selectedAppId = answers.selectedApp?.appId ?? appId;
            return await validateFioriAppTargetFolder(target, selectedAppId, true);
        },
        default: () => appRootPath
    } as FileBrowserQuestion<BspAppDownloadAnswers>;
};

/**
 * Retrieves questions for selecting system, app lists and target path where app will be generated.
 *
 * @param {string} [appRootPath] - The root path of the application.
 * @param {QuickDeployConfig} [quickDeployedAppConfig] - quick deploy config.
 * @returns {Promise<BspAppDownloadQuestions[]>} A list of questions for user interaction.
 */
export async function getPrompts(appRootPath?: string, quickDeployedAppConfig?: QuickDeployedAppConfig): Promise<BspAppDownloadQuestions[]> {
    PromptState.reset();
    // If quickDeployedAppConfig is provided, return only the target folder prompt
    if (quickDeployedAppConfig?.appId) {
        return [getTargetFolderPrompt(appRootPath, quickDeployedAppConfig.appId)] as BspAppDownloadQuestions[];
    }

    const systemQuestions = await getSystemSelectionQuestions({ serviceSelection: { hide: true } }, false); // todo: remove this isYUI value
    let appList: AppIndex = [];
    const appSelectionPrompt = [
        {
            when: async (answers: BspAppDownloadAnswers): Promise<boolean> => {
                if(answers[PromptNames.systemSelection]) {
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
            choices: () => (appList.length ? formatAppChoices(appList) : []),
            validate: (): string | boolean => (appList.length ? true : t('prompts.appSelection.noAppsDeployed'))
        }
    ];

    const targetFolderPrompts = getTargetFolderPrompt(appRootPath, quickDeployedAppConfig?.appId);
    return [...systemQuestions.prompts, ...appSelectionPrompt, targetFolderPrompts] as BspAppDownloadQuestions[];
}