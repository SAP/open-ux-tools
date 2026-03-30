import type { AbapServiceProvider, App } from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../i18n';
import type { SourceApplication } from '../types';
import { SupportedProject } from './systems';

type UI5AppFilter = {
    fields: string;
    readonly ['sap.ui/technology']?: 'UI5';
    readonly ['sap.app/type']: 'application';
} & Record<string, string>;

const ONPREM_APP_FIELDS_LIST = [
    'sap.app/id',
    'sap.app/ach',
    'sap.fiori/registrationIds',
    'sap.app/title',
    'url',
    'fileType',
    'repoName'
];

const ONPREM_APP_FIELDS_STR = ONPREM_APP_FIELDS_LIST.join(',');
const CLOUD_APP_FIELDS_STR = [...ONPREM_APP_FIELDS_LIST, 'sap.fiori/cloudDevAdaptationStatus'].join(',');

const APPS_WITH_DESCR_FILTER: UI5AppFilter = {
    fields: ONPREM_APP_FIELDS_STR,
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'application',
    'fileType': 'appdescr'
};

const APPS_WITH_VARIANT_DESCR_FILTER: UI5AppFilter = {
    fields: ONPREM_APP_FIELDS_STR,
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'application',
    'fileType': 'appdescr_variant',
    'originLayer': 'VENDOR'
};

const CLOUD_ONLY_APPS_FILTER: UI5AppFilter = {
    fields: CLOUD_APP_FIELDS_STR,
    'sap.app/type': 'application',
    'sap.fiori/cloudDevAdaptationStatus': 'released'
};

/**
 * Compares two applications for sorting, using the title and falling back to the ID if titles are missing or equal.
 * This function ensures that applications are sorted alphabetically by their title or ID in a case-insensitive manner.
 *
 * @param {SourceApplication} appA - The first application to compare.
 * @param {SourceApplication} appB - The second application to compare.
 * @returns {number} A number indicating the sort order.
 */
const compareByTitleOrId = (appA: SourceApplication, appB: SourceApplication): number => {
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
const toSourceApplication = (app: Partial<App>): SourceApplication => ({
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
 * @param {SupportedProject | undefined} supportedProject - The supported ADP projects by the system.
 * @returns {Promise<SourceApplication[]>} If the project type is cloudReady resolves with
 * applications for which the {@link SourceApplication.cloudDevAdaptationStatus} is `released`.
 * If the project type is onPremise we display all applications, plus applications with variant descriptor
 * in case the {@link isCustomerBase} flag is set to true. In case the {@link supportedProject} is NOT set
 * we return an empty array.
 */
export async function loadApps(
    provider: AbapServiceProvider,
    isCustomerBase: boolean,
    supportedProject?: SupportedProject
): Promise<SourceApplication[]> {
    if (!supportedProject) {
        return [];
    }

    try {
        const appIndexService = provider.getAppIndex();

        const appIndex = (
            await Promise.all(
                getAppFilters(isCustomerBase, supportedProject).map((filter) => appIndexService.search(filter))
            )
        ).flat();

        return appIndex.map(toSourceApplication).sort(compareByTitleOrId);
    } catch (error) {
        throw new Error(`Could not load applications: ${error.message}`);
    }
}

/**
 * Helper method used to create the application filters required by the app index service.
 *
 * @param {boolean} isCustomerBase Indicates whether the system is customer-based or not.
 * @param {SupportedProject} supportedProject The supported ADP projects by the system.
 * @returns {UI5AppFilter[]} The array of filters dermined by the supported ADP projects from the system.
 */
function getAppFilters(isCustomerBase: boolean, supportedProject: SupportedProject): UI5AppFilter[] {
    if (supportedProject === SupportedProject.CLOUD_READY) {
        return [CLOUD_ONLY_APPS_FILTER];
    }

    const displayAllAppsFilters = [APPS_WITH_DESCR_FILTER, ...(isCustomerBase ? [APPS_WITH_VARIANT_DESCR_FILTER] : [])];

    if (supportedProject === SupportedProject.CLOUD_READY_AND_ON_PREM) {
        // In case of a mixed system we want to also include the cloudDevAdaptationStatus property
        // for each application result in the list. The property is available as a column for all apps
        // due to the nature of the system - mixed, so we are safe no error 400 will occur like
        // with older onPremise only systems for which the column is missing. For non cloud app the
        // property cloudDevAdaptationStatus has value an empty string for a cloud app - 'released'.
        return displayAllAppsFilters.map((filter) => ({ ...filter, fields: CLOUD_APP_FIELDS_STR }));
    }

    return displayAllAppsFilters;
}
