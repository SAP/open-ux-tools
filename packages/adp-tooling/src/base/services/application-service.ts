import { t } from 'i18next';
import type { ToolsLogger } from '@sap-ux/logger';
import type { App, AppIndex } from '@sap-ux/axios-extension';

import type { Application } from '../../types';
import type { ProviderService } from './abap-provider-service';
import { ABAP_APPS_PARAMS, ABAP_VARIANT_APPS_PARAMS, S4HANA_APPS_PARAMS } from '../constants';

interface Choice {
    name: string;
    value: Application;
}

/**
 * Compares two applications for sorting, using the title and falling back to the ID if titles are missing or equal.
 * This function ensures that applications are sorted alphabetically by their title or ID in a case-insensitive manner.
 *
 * @param {Application} appA - The first application to compare.
 * @param {Application} appB - The second application to compare.
 * @returns {number} A number indicating the sort order.
 */
export const filterApps = (appA: Application, appB: Application): number => {
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
export const mapApps = (app: Partial<App>): Application => ({
    id: app['sap.app/id'] ?? '',
    title: app['sap.app/title'] ?? '',
    ach: app['sap.app/ach'] ?? '',
    registrationIds: app['sap.fiori/registrationIds'] ?? [],
    fileType: app['fileType'] ?? '',
    bspUrl: app['url'] ?? '',
    bspName: app['repoName'] ?? ''
});

/**
 * Creates a list of choices from a list of applications, formatted for display or selection in a UI.
 * Each choice consists of an application's title (or ID if no title), followed by its registration IDs and ACH, formatted for easy reading.
 *
 * @param {Application[]} apps - An array of applications to be transformed into display choices.
 * @returns {Choice[]} An array of objects each containing a value (the full application object) and a name (a formatted string).
 */
export const getApplicationChoices = (apps: Application[]): Choice[] => {
    return Array.isArray(apps)
        ? apps.map((app) => {
              const name = app.title
                  ? `${app.title} (${app.id}, ${app.registrationIds}, ${app.ach})`
                  : `${app.id} (${app.registrationIds}, ${app.ach})`;
              return {
                  value: app,
                  name: name.replace('(, )', '').replace(', , ', ', ').replace(', )', ')').replace('(, ', '(')
              };
          })
        : apps;
};

/**
 * Provides services related to managing and loading applications from an ABAP provider.
 */
export class ApplicationService {
    private applications: Application[] = [];

    /**
     * Constructs an instance of ApplicationService.
     *
     * @param {ProviderService} providerService - The ABAP provider service.
     * @param {boolean} isCustomerBase - Indicates if the current base is a customer base, which affects how applications are loaded.
     * @param {ToolsLogger} [logger] - The logger.
     */
    constructor(
        private providerService: ProviderService,
        private isCustomerBase: boolean,
        private logger?: ToolsLogger
    ) {}

    /**
     * Clears the stored list of applications.
     */
    public resetApps(): void {
        this.applications = [];
    }

    /**
     * Retrieves the currently loaded list of applications.
     *
     * @returns {Application[]} An array of applications.
     */
    public getApps(): Application[] {
        return this.applications;
    }

    /**
     * Loads applications based on system type and user parameters, merging results from different app sources as needed.
     *
     * @param {boolean} isCloudSystem - Determines if the system is a cloud system, affecting which parameters to use for app searching.
     * @throws {Error} Throws an error if the app data cannot be loaded.
     */
    public async loadApps(isCloudSystem: boolean): Promise<Application[]> {
        let result: AppIndex = [];

        const provider = this.providerService.getProvider();
        const appIndex = provider.getAppIndex();

        try {
            result = await appIndex.search(isCloudSystem ? S4HANA_APPS_PARAMS : ABAP_APPS_PARAMS);

            if (!isCloudSystem && this.isCustomerBase) {
                const extraApps = await appIndex.search(ABAP_VARIANT_APPS_PARAMS);
                result = result.concat(extraApps);
            }

            this.applications = result.map(mapApps).sort(filterApps);
            return this.applications;
        } catch (e) {
            this.logger?.error(`Could not load apps: ${e.message}`);
            throw new Error(t('validators.cannotLoadApplicationsError'));
        }
    }
}
