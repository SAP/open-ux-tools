import {
    appListResultFields,
    downloadTypeConfig,
    generatorTitleConfig,
    adtSourceTemplateId,
    appListFieldsWithoutSourceTemplate,
    sourceTemplateIdField
} from '../utils/constants.js';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import type { AppInfo, AppItem } from '../app/types.js';
import { AppDownloadType } from '../app/types.js';
import { PromptState } from './prompt-state.js';
import { t } from '../utils/i18n.js';
import RepoAppDownloadLogger from '../utils/logger.js';
import { type ConnectedSystem } from '@sap-ux/odata-service-inquirer';
/**
 * Returns the details for the YUI prompt.
 *
 * @param downloadType - The type of app download to determine which details to return.
 * @returns step details
 */
export function getYUIDetails(downloadType: AppDownloadType): { name: string; description: string }[] {
    const { title, description } = generatorTitleConfig[downloadType];
    return [{ name: title, description }];
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
 * @param {AppDownloadType} downloadType - The download type determining which search params to use.
 * @returns {Promise<AppIndex>} A list of applications.
 */
async function getAppList(
    provider: AbapServiceProvider,
    appId?: string,
    downloadType: AppDownloadType = AppDownloadType.ADTQuickDeploy
): Promise<AppIndex> {
    const baseSearchParams = downloadTypeConfig[downloadType].searchParams;
    const searchParams = appId ? { ...baseSearchParams, 'sap.app/id': appId } : baseSearchParams;

    try {
        const results = await provider.getAppIndex().search(searchParams, appListResultFields);
        if (downloadType === AppDownloadType.AbapRepository) {
            // For ABAP Repository downloads, filter out apps with the ADT source template as they follow the quick deploy app download flow.
            const filtered = results.filter((app) => app[sourceTemplateIdField] !== adtSourceTemplateId);
            RepoAppDownloadLogger.logger?.debug(
                `App list fetched: ${results.length} total, ${filtered.length} after filtering out ADT-deployed apps`
            );
            return filtered;
        }
        return results;
    } catch (error) {
        if (
            downloadType === AppDownloadType.AbapRepository &&
            (error as { response?: { status?: number } })?.response?.status === 400
        ) {
            // Older systems may not support sourceTemplateIdField or the sap.app/type search param.
            // Retry with no search params and without sourceTemplateIdField — return all results as-is
            // since old systems won't have ADT-deployed apps to filter out anyway.
            RepoAppDownloadLogger.logger?.debug(`Retrying without ${sourceTemplateIdField} and search params`);
            try {
                // sap.app/type=application is also dropped — older systems may reject it too.
                // Non-application entries in the list are acceptable; they will fail at the download step.
                const retryResults = await provider.getAppIndex().search({}, appListFieldsWithoutSourceTemplate);
                RepoAppDownloadLogger.logger?.debug(`Retry succeeded: ${retryResults.length} results`);
                return retryResults;
            } catch (retryError) {
                const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
                RepoAppDownloadLogger.logger?.error(t('error.applicationListFetchError', { error: retryMessage }));
                return [];
            }
        }
        const message = error instanceof Error ? error.message : String(error);
        RepoAppDownloadLogger.logger?.error(t('error.applicationListFetchError', { error: message }));
        return [];
    }
}

/**
 * Fetches the application list for the selected system.
 *
 * @param {ConnectedSystem} connectedSystem - The ABAP service provider.
 * @param {string} appId - Application ID to be downloaded.
 * @param {AppDownloadType} downloadType - The download type determining which search params to use.
 * @returns {Promise<AppIndex>} A list of applications filtered by source template.
 */
export async function fetchAppListForSelectedSystem(
    connectedSystem: ConnectedSystem,
    appId?: string,
    downloadType: AppDownloadType = AppDownloadType.ADTQuickDeploy
): Promise<AppIndex> {
    if (connectedSystem?.serviceProvider) {
        PromptState.systemSelection = {
            connectedSystem: connectedSystem
        };
        return await getAppList(connectedSystem.serviceProvider as AbapServiceProvider, appId, downloadType);
    }
    return [];
}
