import type { AppIndex, AbapServiceProvider } from '@sap-ux/axios-extension';
import { getSystemSelectionQuestions } from '@sap-ux/odata-service-inquirer';
import type { RepoAppDownloadAnswers, RepoAppDownloadQuestions, QuickDeployedAppConfig, AppInfo } from '../app/types';
import { PromptNames } from '../app/types';
import { t } from '../utils/i18n';
import type { FileBrowserQuestion } from '@sap-ux/inquirer-common';
import { validateFioriAppTargetFolder } from '@sap-ux/project-input-validator';
import { PromptState } from './prompt-state';
import { fetchAppListForSelectedSystem, formatAppChoices } from './prompt-helpers';
import type { ListQuestion } from 'inquirer';
import { downloadApp } from '../utils/download-utils';

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
 * Extracts default system from the quick deployed app configuration.
 *
 * @param {QuickDeployedAppConfig | undefined} quickDeployedAppConfig - The quick deployed app configuration.
 * @returns {string} The default system.
 */
function extractDefaultSystem(quickDeployedAppConfig?: QuickDeployedAppConfig): string {
    let defaultSystem = '';

    if (quickDeployedAppConfig?.appId && quickDeployedAppConfig?.serviceProviderInfo) {
        defaultSystem = quickDeployedAppConfig.serviceProviderInfo.name;
    }

    return defaultSystem;
}

/**
 * Retrieves prompts for selecting a system, app list, and target folder where the app will be generated.
 *
 * @param {string} [appRootPath] - The root path of the application.
 * @param {QuickDeployedAppConfig} [quickDeployedAppConfig] - The quick deployed app configuration.
 * @returns {Promise<RepoAppDownloadQuestions[]>} A list of prompts for user interaction.
 */
export async function getPrompts(
    appRootPath?: string,
    quickDeployedAppConfig?: QuickDeployedAppConfig
): Promise<RepoAppDownloadQuestions[]> {
    try {
        PromptState.reset();

        const systemQuestions = await getSystemSelectionQuestions({ serviceSelection: { hide: true } }, false);
        // Filter system questions and set default system if applicable
        if (quickDeployedAppConfig?.appId) {
            const defaultSystem = extractDefaultSystem(quickDeployedAppConfig);
            const filteredSystemQuestion = systemQuestions.prompts.find((p) => p.name === PromptNames.systemSelection);

            if (filteredSystemQuestion) {
                const choices = (filteredSystemQuestion as ListQuestion<RepoAppDownloadAnswers>).choices;

                if (Array.isArray(choices)) {
                    const defaultIndex = choices.findIndex((choice: any) => choice.value.system.name === defaultSystem);
                    filteredSystemQuestion.default = defaultIndex !== -1 ? defaultIndex : undefined;
                    systemQuestions.prompts = [filteredSystemQuestion];
                }
            }
        }

        let appList: AppIndex = [];
        const appSelectionPrompt = [
            {
                when: async (answers: RepoAppDownloadAnswers): Promise<boolean> => {
                    if (answers[PromptNames.systemSelection]) {
                        appList = await fetchAppListForSelectedSystem(
                            systemQuestions.answers.connectedSystem?.serviceProvider as AbapServiceProvider,
                            quickDeployedAppConfig?.appId
                        );
                    }
                    return !!systemQuestions.answers.connectedSystem?.serviceProvider;
                },
                type: 'list',
                name: PromptNames.selectedApp,
                default: () => (quickDeployedAppConfig?.appId ? 0 : undefined),
                guiOptions: {
                    mandatory: !!appList.length,
                    breadcrumb: t('prompts.appSelection.breadcrumb')
                },
                message: t('prompts.appSelection.message'),
                choices: (): { name: string; value: AppInfo }[] => (appList.length ? formatAppChoices(appList) : []),
                validate: async (answers: AppInfo): Promise<string | boolean | undefined> => {
                    // Quick deploy config exists but no apps found
                    if (quickDeployedAppConfig?.appId && appList.length === 0) {
                        return t('error.quickDeployedAppDownloadErrors.noAppsFound', {
                            appId: quickDeployedAppConfig.appId
                        });
                    }

                    // No apps available at all
                    if (appList.length === 0) {
                        return t('prompts.appSelection.noAppsDeployed');
                    }

                    // Valid app selected, try to download
                    if (answers?.appId) {
                        try {
                            await downloadApp(answers.repoName);
                            return true;
                        } catch (error) {
                            throw new Error(t('error.appDownloadErrors.appDownloadFailure', { error: error.message }));
                        }
                    }
                }
            }
        ];

        const targetFolderPrompts = getTargetFolderPrompt(appRootPath, quickDeployedAppConfig?.appId);
        return [...systemQuestions.prompts, ...appSelectionPrompt, targetFolderPrompts] as RepoAppDownloadQuestions[];
    } catch (error) {
        throw new Error(`Failed to generate prompts: ${error.message}`);
    }
}
