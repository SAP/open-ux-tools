import { generatorTitle, generatorDescription } from '../utils/constants';
import { appListSearchParams, appListResultFields } from '../utils/constants';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import type { Logger } from '@sap-ux/logger';
import type { AppInfo } from '../app/types';
import { PromptNames } from '../app/types';
import { PromptState } from './prompt-state';
import type { BspAppDownloadAnswers, AppItem } from '../app/types';
import { t } from '../utils/i18n';
import BspAppDownloadLogger from '../utils/logger';

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
 */
export const formatAppChoices = (appList: AppIndex): Array<{ name: string; value: AppInfo }> => {
    return appList
        .filter((app: AppItem) => {
            const hasRequiredFields = app['sap.app/id'] && app['sap.app/title'] && app['repoName'] && app['url'];
            if (!hasRequiredFields) {
                BspAppDownloadLogger.logger?.error(t('error.requiredFieldsMissing', { app: JSON.stringify(app) }));
            }
            return hasRequiredFields;
        })
        .map((app) => {
            // cast to string because TypeScript doesn't automatically know at the point that these fields are defined
            // after filtering out invalid apps.
            const id = app['sap.app/id'] as string;
            const title = app['sap.app/title'] as string;
            const description = (app['sap.app/description'] ?? '') as string;
            const repoName = app.repoName as string;
            const url = app.url as string;

            return {
                name: id,
                value: {
                    appId: id,
                    title,
                    description,
                    repoName,
                    url
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
        log?.error(t('error.applicationListFetchError', { error: error.message }));
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
