import type { AppIndex, AbapServiceProvider } from '@sap-ux/axios-extension';
import { getSystemSelectionQuestions, promptNames } from '@sap-ux/odata-service-inquirer';
import type { RepoAppDownloadAnswers, RepoAppDownloadQuestions, QuickDeployedAppConfig, AppInfo } from '../app/types';
import { PromptNames } from '../app/types';
import { t } from '../utils/i18n';
import type { FileBrowserQuestion } from '@sap-ux/inquirer-common';
import { validateFioriAppTargetFolder } from '@sap-ux/project-input-validator';
import { PromptState } from './prompt-state';
import { fetchAppListForSelectedSystem, formatAppChoices } from './prompt-helpers';
import { ListQuestion } from 'inquirer';

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

// function getDefaultStuff (getDefaultStuff: QuickDeployedAppConfig | undefined): { defaultSystem: string; defaultAppId: string } {
//     let defaultSystem: string = '';
//     let defaultAppId: string = '';
//     if(getDefaultStuff?.appId && getDefaultStuff?.serviceProvider) {
//         // If appId is provided but serviceProvider is not, set the serviceProvider to the default value
//         //defaultSystem = getDefaultStuff.serviceProvider.;
//         defaultAppId = getDefaultStuff.appId;
//         defaultSystem = getDefaultStuff.serviceProvider.name;
//     }
//     return { defaultSystem, defaultAppId};
// }

// /**
//  * Retrieves questions for selecting system, app lists and target path where app will be generated.
//  *
//  * @param {string} [appRootPath] - The root path of the application.
//  * @param {QuickDeployedAppConfig} [quickDeployedAppConfig] - quick deployed app config.
//  * @returns {Promise<RepoAppDownloadQuestions[]>} A list of questions for user interaction.
//  */
// export async function getPrompts(
//     appRootPath?: string,
//     quickDeployedAppConfig?: QuickDeployedAppConfig
// ): Promise<RepoAppDownloadQuestions[]> {
//     PromptState.reset();

//     const { defaultSystem} =  getDefaultStuff(quickDeployedAppConfig)
//     let  systemQuestions = await getSystemSelectionQuestions( { serviceSelection: { hide: true } }, false);
//     if (quickDeployedAppConfig?.appId) {
//         const filteredSystemQuestion = systemQuestions.prompts.find(p => p.name === promptNames.systemSelection);   
//         let defaultIndex = -1;
//         if (filteredSystemQuestion) {
//             //const choices = (filteredSystemQuestion as ListQuestion<RepoAppDownloadAnswers>).choices;
//             // Filter the choices based on the default system
//             let choices = (filteredSystemQuestion as ListQuestion<RepoAppDownloadAnswers>).choices;
//             if (Array.isArray(choices)) {
//                 // Filter the choices based on the default system
//                 defaultIndex = choices.findIndex((choice: any) => choice.value.system.name === defaultSystem);
//                 filteredSystemQuestion.default = defaultIndex !== -1 ? defaultIndex : undefined; // Assign default index if found
//                 systemQuestions.prompts = [filteredSystemQuestion];
//             }

//             filteredSystemQuestion.default = defaultIndex !== -1 ? defaultIndex : undefined; // Assign default index if found
//             systemQuestions.prompts = [filteredSystemQuestion];
//         }
//     }
    
   
//     let appList: AppIndex = [];
//     const appSelectionPrompt = [
//         {
//             when: async (answers: RepoAppDownloadAnswers): Promise<boolean> => {
//                 if (answers[PromptNames.systemSelection]) {
//                     debugger;
//                     if(quickDeployedAppConfig?.appId) {
//                         appList = await fetchAppListForSelectedSystem(
//                             systemQuestions.answers.connectedSystem?.serviceProvider as AbapServiceProvider,
//                             quickDeployedAppConfig.appId
//                         );
//                     }
//                     else {
//                         appList = await fetchAppListForSelectedSystem(
//                             systemQuestions.answers.connectedSystem?.serviceProvider as AbapServiceProvider
//                         );
//                     }
//                 }
//                 // display app selection prompt only if user has selected a system
//                 return !!systemQuestions.answers.connectedSystem?.serviceProvider;
//             },
//             type: 'list',
//             name: PromptNames.selectedApp,
//             default: () =>  quickDeployedAppConfig?.appId ? 0 : undefined,
//             guiOptions: {
//                 mandatory: !!appList.length,
//                 breadcrumb: t('prompts.appSelection.breadcrumb')
//             },
//             message: t('prompts.appSelection.message'),
//             choices: (): { name: string; value: AppInfo }[] => (appList.length ? formatAppChoices(appList) : []),
//             validate: (): string | boolean => (appList.length ? true : t('prompts.appSelection.noAppsDeployed'))
//         }
//     ];

//     const targetFolderPrompts = getTargetFolderPrompt(appRootPath, quickDeployedAppConfig?.appId);
//     return [...systemQuestions.prompts, ...appSelectionPrompt, targetFolderPrompts] as RepoAppDownloadQuestions[];
// }


/**
 * Extracts default system from the quick deployed app configuration.
 *
 * @param {QuickDeployedAppConfig | undefined} quickDeployedAppConfig - The quick deployed app configuration.
 * @returns {string} The default system.
 */
function extractDefaultSystem(quickDeployedAppConfig: QuickDeployedAppConfig | undefined): string {
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

        const defaultSystem = extractDefaultSystem(quickDeployedAppConfig);
        const systemQuestions = await getSystemSelectionQuestions({ serviceSelection: { hide: true } }, false);

        // Filter system questions and set default system if applicable
        if (quickDeployedAppConfig?.appId) {
            const filteredSystemQuestion = systemQuestions.prompts.find(p => p.name === promptNames.systemSelection);

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
                        if (quickDeployedAppConfig?.appId) {
                            appList = await fetchAppListForSelectedSystem(
                                systemQuestions.answers.connectedSystem?.serviceProvider as AbapServiceProvider,
                                quickDeployedAppConfig.appId
                            );
                        } else {
                            appList = await fetchAppListForSelectedSystem(
                                systemQuestions.answers.connectedSystem?.serviceProvider as AbapServiceProvider
                            );
                        }
                    }
                    return !!systemQuestions.answers.connectedSystem?.serviceProvider;
                },
                type: 'list',
                name: PromptNames.selectedApp,
                default: () => (quickDeployedAppConfig?.appId ? 0 : undefined),
                guiOptions: {
                    mandatory: !!appList.length,
                    breadcrumb: t('prompts.appSelection.breadcrumb'),
                },
                message: t('prompts.appSelection.message'),
                choices: (): { name: string; value: AppInfo }[] => (appList.length ? formatAppChoices(appList) : []),
                validate: (): string | boolean => {
                    if (quickDeployedAppConfig?.appId && !appList.length) {
                        return t('prompts.quickDeployedAppDownloadErrors.noAppsFound');
                    }
                    else return (appList.length ? true : t('prompts.appSelection.noAppsDeployed'))
                },
            },
        ];

        const targetFolderPrompts = getTargetFolderPrompt(appRootPath, quickDeployedAppConfig?.appId);
        return [...systemQuestions.prompts, ...appSelectionPrompt, targetFolderPrompts] as RepoAppDownloadQuestions[];
    } catch (error) {
        throw new Error(`Failed to generate prompts: ${error.message}`);
    }
}
