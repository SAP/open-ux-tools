import { generatorTitle, generatorDescription } from '../utils/constants';
import { appListSearchParams, appListResultFields } from '../utils/constants';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import type { Logger } from '@sap-ux/logger';
import type { AppInfo } from '../app/types';
import { PromptNames } from '../app/types';
import { PromptState } from './prompt-state';
import type { BspAppDownloadAnswers, AppItem } from '../app/types';

/**
 * Returns the details for the YUI prompt.
 *
 * @returns step details
 */
export function getYUIDetails(): { name: string; description: string }[] {
    return [
        {
            name: generatorTitle,
            description: generatorDescription
        }
    ];
}

/**
 * Formats the application list into selectable choices.
 *
 * @param {AppIndex} appList - List of applications retrieved from the system.
 * @returns {Array<{ name: string; value: AppInfo }>} The formatted choices for selection.
 * @throws Will throw an error if any required fields are missing.
 */
export const formatAppChoices = (appList: AppIndex): Array<{ name: string; value: AppInfo }> => {
    return appList.map((app: AppItem) => {
        // Check if any required fields are missing
        if (
            !app['sap.app/id'] ||
            !app['sap.app/title'] ||
            !app['sap.app/description'] ||
            !app['repoName'] ||
            !app['url']
        ) {
            throw new Error(`Required fields are missing for app: ${JSON.stringify(app)}`);
        }

        return {
            name: app['sap.app/id'],
            value: {
                appId: app['sap.app/id'],
                title: app['sap.app/title'],
                description: app['sap.app/description'] as string,
                repoName: app['repoName'] as string,
                url: app['url']
            }
        };
    });
};

/**
 * Fetches a list of deployed applications from the ABAP repository.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @param {Logger} [log] - The logger instance.
 * @returns {Promise<AppIndex>} A list of applications filtered by source template.
 */
async function getAppList(provider: AbapServiceProvider, log?: Logger): Promise<AppIndex> {
    try {
        return await provider.getAppIndex().search(appListSearchParams, appListResultFields);
    } catch (error) {
        log?.error(`Error fetching application list: ${error.message}`);
        return [];
    }
}

/**
 * Fetches the application list for the selected system.
 *
 * @param {BspAppDownloadAnswers} answers - The user's answers from the prompts.
 * @param {AbapServiceProvider | undefined} serviceProvider - The ABAP service provider.
 * @param {Logger} [log] - The logger instance.
 * @returns {Promise<AppIndex>} A list of applications filtered by source template.
 */
export async function fetchAppListForSelectedSystem(
    answers: BspAppDownloadAnswers,
    serviceProvider?: AbapServiceProvider,
    log?: Logger
): Promise<AppIndex> {
    if (answers[PromptNames.systemSelection] && serviceProvider) {
        PromptState.systemSelection = {
            connectedSystem: { serviceProvider }
        };
        return await getAppList(serviceProvider, log);
    }
    return [];
}
