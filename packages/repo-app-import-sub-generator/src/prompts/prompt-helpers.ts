import { appListSearchParams, appListResultFields, generatorTitle, generatorDescription } from '../utils/constants';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import type { AppInfo, AppItem } from '../app/types';
import { PromptState } from './prompt-state';
import { t } from '../utils/i18n';
import RepoAppDownloadLogger from '../utils/logger';
import { type ConnectedSystem } from '@sap-ux/odata-service-inquirer';
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
 * Returns the prompt details for the selected application.
 *
 * @param {AppItem} app - The application item to extract details from.
 * @returns {{ name: string; value: AppInfo }} The extracted details including name and value.
 */
export const extractAppData = (app: AppItem): { name: string; value: AppInfo } => {
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
};

/**
 * Formats the application list into selectable choices.
 *
 * @param {AppIndex} appList - List of applications retrieved from the system.
 * @returns {Array<{ name: string; value: AppInfo }>} The formatted choices for selection.
 */
export const formatAppChoices = (appList: AppIndex): Array<{ name: string; value: AppInfo }> => {
    return appList
        .filter((app: AppItem) => {
            RepoAppDownloadLogger.logger?.debug(`formatAppChoices: ${JSON.stringify(app)}`);
            const hasRequiredFields =
                app['sap.app/id'] &&
                app['repoName'] &&
                app['url'] &&
                Object.prototype.hasOwnProperty.call(app, 'sap.app/title'); // allow for empty title
            if (!hasRequiredFields) {
                RepoAppDownloadLogger.logger?.warn(t('warn.requiredFieldsMissing', { app: app['sap.app/id'] }));
            }
            return hasRequiredFields;
        })
        .map((app) => extractAppData(app));
};

/**
 * Fetches a list of deployed applications from the ABAP repository.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @param {string} appId - Application ID to filter the list.
 * @returns {Promise<AppIndex>} A list of applications filtered by source template.
 */
async function getAppList(provider: AbapServiceProvider, appId?: string): Promise<AppIndex> {
    try {
        const searchParams = appId
            ? {
                  ...appListSearchParams,
                  'sap.app/id': appId
              }
            : appListSearchParams;
        return await provider.getAppIndex().search(searchParams, appListResultFields);
    } catch (error) {
        RepoAppDownloadLogger.logger?.error(t('error.applicationListFetchError', { error: error.message }));
        RepoAppDownloadLogger.logger?.debug(t('error.applicationListFetchError', { error: JSON.stringify(error) }));
        return [];
    }
}

/**
 * Fetches the application list for the selected system.
 *
 * @param {ConnectedSystem} connectedSystem - The ABAP service provider.
 * @param {string} appId - Application ID to be downloaded.
 * @returns {Promise<AppIndex>} A list of applications filtered by source template.
 */
export async function fetchAppListForSelectedSystem(
    connectedSystem: ConnectedSystem,
    appId?: string
): Promise<AppIndex> {
    if (connectedSystem?.serviceProvider) {
        PromptState.systemSelection = {
            connectedSystem: connectedSystem
        };
        return await getAppList(connectedSystem.serviceProvider as AbapServiceProvider, appId);
    }
    return [];
}
