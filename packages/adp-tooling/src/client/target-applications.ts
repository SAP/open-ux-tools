import type { AbapServiceProvider, App, AppIndex } from '@sap-ux/axios-extension';

import type { TargetApplication } from '../types';
import { ABAP_APPS_PARAMS, ABAP_VARIANT_APPS_PARAMS, S4HANA_APPS_PARAMS } from '../base/constants';

/**
 * Compares two applications for sorting, using the title and falling back to the ID if titles are missing or equal.
 * This function ensures that applications are sorted alphabetically by their title or ID in a case-insensitive manner.
 *
 * @param {TargetApplication} appA - The first application to compare.
 * @param {TargetApplication} appB - The second application to compare.
 * @returns {number} A number indicating the sort order.
 */
export const filterApps = (appA: TargetApplication, appB: TargetApplication): number => {
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
 * @returns {TargetApplication} A structured application object with defined properties, even if some may be empty.
 */
export const mapApps = (app: Partial<App>): TargetApplication => ({
    id: app['sap.app/id'] ?? '',
    title: app['sap.app/title'] ?? '',
    ach: app['sap.app/ach'] ?? '',
    registrationIds: app['sap.fiori/registrationIds'] ?? [],
    fileType: app['fileType'] ?? '',
    bspUrl: app['url'] ?? '',
    bspName: app['repoName'] ?? ''
});

/**
 * Loads and processes application data from the ABAP service provider.
 *
 * This function retrieves the application index from the provider and then searches for applications based on system type.
 * If the system is not a cloud system and the base is customer-specific, additional variant applications are fetched and merged.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider used to retrieve application data.
 * @param {boolean} isCustomerBase - Flag indicating whether the system is customer-based. Affects application selection.
 * @returns {Promise<TargetApplication[]>} A promise that resolves to a sorted list of applications.
 */
export async function loadApps(provider: AbapServiceProvider, isCustomerBase: boolean): Promise<TargetApplication[]> {
    let result: AppIndex = [];

    try {
        const isCloudSystem = await provider.isAbapCloud();
        const appIndex = provider.getAppIndex();

        result = await appIndex.search(isCloudSystem ? S4HANA_APPS_PARAMS : ABAP_APPS_PARAMS);

        if (!isCloudSystem && isCustomerBase) {
            const extraApps = await appIndex.search(ABAP_VARIANT_APPS_PARAMS);
            result = result.concat(extraApps);
        }

        return result.map(mapApps).sort(filterApps);
    } catch (e) {
        throw new Error(`Could not load applications: ${e.message}`);
    }
}
