import {
    appListResultFields,
    downloadTypeConfig,
    generatorTitleConfig,
    adtSourceTemplateId,
    appListFieldsWithoutSourceTemplate,
    sourceTemplateIdField
} from '../utils/constants.js';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import { isAxiosError } from '@sap-ux/axios-extension';
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
 * Returns true when the error is an HTTP 400 response indicating the system
 * does not know the `sap.app/sourceTemplate/id` column.
 *
 * @param {unknown} error - The error thrown by the app index search call.
 * @returns {boolean} Whether the error is a "column unknown" 400 response.
 */
function isUnsupportedFieldError(error: unknown): boolean {
    return isAxiosError(error) && error.response?.status === 400 && error.message.includes(sourceTemplateIdField);
}

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
            return results.filter((app) => app[sourceTemplateIdField] !== adtSourceTemplateId);
        }
        return results;
    } catch (error) {
        if (downloadType === AppDownloadType.AbapRepository && isUnsupportedFieldError(error)) {
            // Safe to skip ADT filter — a system that doesn't support this field cannot have ADT-deployed apps.
            RepoAppDownloadLogger.logger?.debug(`${sourceTemplateIdField} not supported, retrying without it`);
            try {
                return await provider.getAppIndex().search(searchParams, appListFieldsWithoutSourceTemplate);
            } catch (retryError) {
                const message = retryError instanceof Error ? retryError.message : String(retryError);
                RepoAppDownloadLogger.logger?.error(t('error.applicationListFetchError', { error: message }));
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
