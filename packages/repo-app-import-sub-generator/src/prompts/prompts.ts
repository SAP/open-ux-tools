import type { AppIndex } from '@sap-ux/axios-extension';
import { getSystemSelectionQuestions } from '@sap-ux/odata-service-inquirer';
import type { RepoAppDownloadAnswers, RepoAppDownloadQuestions, QuickDeployedAppConfig, AppInfo } from '../app/types';
import { PromptNames } from '../app/types';
import { t } from '../utils/i18n';
import { validateFioriAppTargetFolder } from '@sap-ux/project-input-validator';
import { PromptState } from './prompt-state';
import { fetchAppListForSelectedSystem, formatAppChoices } from './prompt-helpers';
import type { FileBrowserQuestion } from '@sap-ux/inquirer-common';
import { validateAppSelection } from '../utils/validators';
import type { AppWizard, IValidationLink } from '@sap-devx/yeoman-ui-types';
import RepoAppDownloadLogger from '../utils/logger';
import { type Question } from 'inquirer';

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

const getCliValidatePrompts = (
    appList: AppIndex,
    quickDeployedAppConfig?: QuickDeployedAppConfig,
    appWizard?: AppWizard
): Question => {
    return {
        type: 'input',
        when: async (answers: RepoAppDownloadAnswers): Promise<boolean> => {
            if (answers?.[PromptNames.selectedApp]) {
                try {
                    await validateAppSelection(
                        answers[PromptNames.selectedApp],
                        appList,
                        quickDeployedAppConfig,
                        appWizard
                    );
                } catch (error) {
                    if (error instanceof Error) {
                        RepoAppDownloadLogger.logger?.error(error.message);
                    } else {
                        RepoAppDownloadLogger.logger?.error(
                            t('error.appDownloadErrors.validationError', { error: error })
                        );
                    }
                }
            }
            return false;
        },
        name: `${PromptNames.selectedApp}-validation`
    } as Question;
};

/**
 * Retrieves prompts for selecting a system, app list, and target folder where the app will be generated.
 *
 * @param {string} [appRootPath] - The root path of the application.
 * @param {QuickDeployedAppConfig} [quickDeployedAppConfig] - The quick deployed app configuration.
 * @param {AppWizard} [appWizard] - The app wizard instance.
 * @param {boolean} [isCli] - Indicates if the prompts are being generated for CLI usage.
 * @returns {Promise<RepoAppDownloadQuestions[]>} A list of prompts for user interaction.
 */
export async function getPrompts(
    appRootPath?: string,
    quickDeployedAppConfig?: QuickDeployedAppConfig,
    appWizard?: AppWizard,
    isCli: boolean = false
): Promise<RepoAppDownloadQuestions[]> {
    try {
        PromptState.reset();

        const systemQuestions = await getSystemSelectionQuestions(
            {
                serviceSelection: { hide: true, useAutoComplete: isCli },
                systemSelection: { defaultChoice: quickDeployedAppConfig?.serviceProviderInfo?.name }
            },
            !isCli
        );
        let appList: AppIndex = [];
        const appSelectionPrompts: Partial<object[]> = [
            {
                when: async (answers: RepoAppDownloadAnswers): Promise<boolean> => {
                    if (
                        answers[PromptNames.systemSelection] &&
                        systemQuestions.answers.connectedSystem?.serviceProvider
                    ) {
                        appList = await fetchAppListForSelectedSystem(
                            systemQuestions.answers.connectedSystem,
                            quickDeployedAppConfig?.appId
                        );
                    }
                    return !!systemQuestions.answers.connectedSystem?.serviceProvider;
                },
                type: 'list',
                name: PromptNames.selectedApp,
                default: (): number | undefined => (quickDeployedAppConfig?.appId ? 0 : undefined),
                guiOptions: {
                    mandatory: !!appList.length,
                    breadcrumb: t('prompts.appSelection.breadcrumb'),
                    applyDefaultWhenDirty: true
                },
                message: t('prompts.appSelection.message'),
                choices: (): { name: string; value: AppInfo }[] => (appList.length ? formatAppChoices(appList) : []),
                validate: async (answers: AppInfo): Promise<boolean | IValidationLink | string> => {
                    return await validateAppSelection(answers, appList, quickDeployedAppConfig, appWizard);
                }
            }
        ];
        // Only for CLI use as `list` prompt validation does not run on CLI unless autocomplete plugin is used
        if (isCli) {
            appSelectionPrompts?.push(getCliValidatePrompts(appList, quickDeployedAppConfig, appWizard));
        }

        const targetFolderPrompts = getTargetFolderPrompt(appRootPath, quickDeployedAppConfig?.appId);
        return [...systemQuestions.prompts, ...appSelectionPrompts, targetFolderPrompts] as RepoAppDownloadQuestions[];
    } catch (error) {
        throw new Error(`Failed to generate prompts: ${error.message}`);
    }
}
