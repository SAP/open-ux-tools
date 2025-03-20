import { t } from 'i18next';
import type { ToolsLogger } from '@sap-ux/logger';
import type { App, AppIndex } from '@sap-ux/axios-extension';

import { TargetApplication } from '../types';
import { AbapProvider } from './abap-provider';
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
 * @returns {Application} A structured application object with defined properties, even if some may be empty.
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
 * Provides services related to managing and loading applications from an ABAP provider.
 */
export class TargetApplications {
    private applications: TargetApplication[];

    /**
     * Constructs an instance of ApplicationManager.
     *
     * @param {boolean} isCustomerBase - Indicates if the current base is a customer base, which affects how applications are loaded.
     * @param {ToolsLogger} [logger] - The logger.
     */
    constructor(private abapProvider: AbapProvider, private isCustomerBase: boolean, private logger?: ToolsLogger) {}

    /**
     * Retrieves the currently loaded list of applications.
     *
     * @returns {Application[]} An array of applications.
     */
    public async getApps(): Promise<TargetApplication[]> {
        if (!this.applications) {
            this.applications = await this.loadApps();
        }
        return this.applications;
    }

    /**
     * Loads applications based on system type and user parameters, merging results from different app sources as needed.
     *
     * @returns {Application[]} list of applications.
     * @throws {Error} Throws an error if the app data cannot be loaded.
     */
    private async loadApps(): Promise<TargetApplication[]> {
        let result: AppIndex = [];

        try {
            const provider = this.abapProvider.getProvider();
            const isCloudSystem = await provider.isAbapCloud();
            const appIndex = provider.getAppIndex();

            result = await appIndex.search(isCloudSystem ? S4HANA_APPS_PARAMS : ABAP_APPS_PARAMS);

            if (!isCloudSystem && this.isCustomerBase) {
                const extraApps = await appIndex.search(ABAP_VARIANT_APPS_PARAMS);
                result = result.concat(extraApps);
            }

            return result.map(mapApps).sort(filterApps);
        } catch (e) {
            this.logger?.error(`Could not load apps: ${e.message}`);
            throw new Error(t('validators.cannotLoadApplicationsError'));
        }
    }
}
