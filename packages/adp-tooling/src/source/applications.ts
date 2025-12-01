import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider, App } from '@sap-ux/axios-extension';

import { t } from '../i18n';
import type { SourceApplication } from '../types';
import { ABAP_APPS_PARAMS, ABAP_VARIANT_APPS_PARAMS, S4HANA_APPS_PARAMS } from '../base/constants';

/**
 * Compares two applications for sorting, using the title and falling back to the ID if titles are missing or equal.
 * This function ensures that applications are sorted alphabetically by their title or ID in a case-insensitive manner.
 *
 * @param {SourceApplication} appA - The first application to compare.
 * @param {SourceApplication} appB - The second application to compare.
 * @returns {number} A number indicating the sort order.
 */
export const sortByTitleOrId = (appA: SourceApplication, appB: SourceApplication): number => {
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
 * Loads and processes application data from the ABAP service provider.
 *
 * This function retrieves the application index from the provider and then searches for applications based on system type.
 * If the system is not a cloud system and the base is customer-specific, additional variant applications are fetched and merged.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider used to retrieve application data.
 * @param {boolean} isCustomerBase - Flag indicating whether the system is customer-based. Affects application selection.
 * @returns {Promise<SourceApplication[]>} A promise that resolves to a sorted list of applications.
 */
export async function loadApps(provider: AbapServiceProvider, isCustomerBase: boolean): Promise<SourceApplication[]> {
    try {
        const isCloudSystem = await provider.isAbapCloud();
        const appIndexService = provider.getAppIndex();

        const appIndex = (
            await Promise.all([
                appIndexService.search(isCloudSystem ? S4HANA_APPS_PARAMS : ABAP_APPS_PARAMS),
                !isCloudSystem && isCustomerBase
                    ? appIndexService.search(ABAP_VARIANT_APPS_PARAMS)
                    : Promise.resolve([])
            ])
        ).flat();

        return appIndex.map(toSourceApplication).sort(sortByTitleOrId);
    } catch (e) {
        throw new Error(`Could not load applications: ${e.message}`);
    }
}
