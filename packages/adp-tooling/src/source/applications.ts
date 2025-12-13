import { type AbapServiceProvider, AdaptationProjectType, type App } from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../i18n';
import type { SourceApplication } from '../types';

type UI5AppFilter = {
    fields: string;
    readonly ['sap.ui/technology']: 'UI5';
    readonly ['sap.app/type']: 'application';
} & Record<string, string>;

const APP_FIELDS =
    'sap.app/id,sap.app/ach,sap.fiori/registrationIds,sap.app/title,url,fileType,repoName,sap.fiori/cloudDevAdaptationStatus';

const APPS_WITH_DESCR_FILTER: UI5AppFilter = {
    fields: APP_FIELDS,
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'application',
    'fileType': 'appdescr'
};

const APPS_WITH_VARIANT_DESCR_FILTER: UI5AppFilter = {
    fields: APP_FIELDS,
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'application',
    'fileType': 'appdescr_variant',
    'originLayer': 'VENDOR'
};

const CLOUD_ONLY_APPS_FILTER: UI5AppFilter = {
    fields: APP_FIELDS,
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'application',
    'cloudDevAdaptationStatus': 'released'
};

/**
 * Compares two applications for sorting, using the title and falling back to the ID if titles are missing or equal.
 * This function ensures that applications are sorted alphabetically by their title or ID in a case-insensitive manner.
 *
 * @param {SourceApplication} appA - The first application to compare.
 * @param {SourceApplication} appB - The second application to compare.
 * @returns {number} A number indicating the sort order.
 */
export const compareByTitleOrId = (appA: SourceApplication, appB: SourceApplication): number => {
    let titleA = appA.title.toUpperCase();
    let titleB = appB.title.toUpperCase();

    if (!titleA.trim()) {
        titleA = appA.id.toUpperCase();
    }
    if (!titleB.trim()) {
        titleB = appB.id.toUpperCase();
    }
    if (titleA < titleB) {
        return -1;
    }
    if (titleA > titleB) {
        return 1;
    }
    return 0;
};

/**
 * Transforms raw application data into a structured Application object.
 * This function maps properties from a loosely typed app data structure to a strongly typed Application object.
 *
 * @param {Partial<App>} app - The raw application data, possibly incomplete.
 * @returns {SourceApplication} A structured application object with defined properties, even if some may be empty.
 */
export const toSourceApplication = (app: Partial<App>): SourceApplication => ({
    id: app['sap.app/id'] ?? '',
    title: app['sap.app/title'] ?? '',
    ach: app['sap.app/ach'] ?? '',
    registrationIds: app['sap.fiori/registrationIds'] ?? [],
    fileType: app['fileType'] ?? '',
    bspUrl: app['url'] ?? '',
    bspName: app['repoName'] ?? '',
    cloudDevAdaptationStatus: app['sap.fiori/cloudDevAdaptationStatus']?.toString() ?? ''
});

/**
 * Checks whether the application supports manifest-first approach.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider for communicating with the system.
 * @param {string} id - The ID of the application whose manifest should be managed.
 * @param {ToolsLogger} logger - Optional logger for debugging purposes.
 * @returns {Promise<boolean>} True if supported, otherwise throws an error.
 */
export async function isAppSupported(provider: AbapServiceProvider, id: string, logger: ToolsLogger): Promise<boolean> {
    const appIndex = provider.getAppIndex();
    const isSupported = await appIndex.getIsManiFirstSupported(id);

    if (!isSupported) {
        logger?.debug(`Application '${id}' is not supported by Adaptation Project`);
        throw new Error(t('validators.appDoesNotSupportManifest'));
    }

    return true;
}

/**
 * Loads and processes application data from the ABAP service provider. This function
 * retrieves the application index from the provider and then searches for applications based on project type.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider used to retrieve application data.
 * @param {boolean} isCustomerBase - Flag indicating whether the system is customer-based. Affects application selection.
 * @param {AdaptationProjectType | undefined} projectType - The project type.
 * @returns {Promise<SourceApplication[]>} If the project type is cloudReady resolves with
 * applications for which the {@link SourceApplication.cloudDevAdaptationStatus} is `released`.
 * If the project type is onPremise we display all applications, plus applications with variant descriptor
 * in case the {@link isCustomerBase} flag is set to true. In case the {@link projectType} is NOT set
 * we return an empty array.
 */
export async function loadApps(
    provider: AbapServiceProvider,
    isCustomerBase: boolean,
    projectType?: AdaptationProjectType
): Promise<SourceApplication[]> {
    if (!projectType) {
        return [];
    }

    try {
        const appIndexService = provider.getAppIndex();

        const appIndex = (
            await Promise.all([
                appIndexService.search(
                    projectType === AdaptationProjectType.CLOUD_READY ? CLOUD_ONLY_APPS_FILTER : APPS_WITH_DESCR_FILTER
                ),
                projectType === AdaptationProjectType.ON_PREMISE && isCustomerBase
                    ? appIndexService.search(APPS_WITH_VARIANT_DESCR_FILTER)
                    : Promise.resolve([])
            ])
        ).flat();

        return appIndex.map(toSourceApplication).sort(compareByTitleOrId);
    } catch (e) {
        throw new Error(`Could not load applications: ${e.message}`);
    }
}
