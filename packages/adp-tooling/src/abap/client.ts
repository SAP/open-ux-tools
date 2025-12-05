import {
    AdtCatalogService,
    UI5RtVersionService,
    type AbapServiceProvider,
    type Inbound
} from '@sap-ux/axios-extension';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { FlexUISupportedSystem } from '../types';
import { filterAndMapInboundsToManifest } from '../base/helper';
import type { ToolsLogger } from '@sap-ux/logger';

const FILTER = {
    'scheme': 'http://www.sap.com/adt/categories/ui_flex',
    'term': 'dta_folder'
};

/**
 * Fetches system supports Flex UI features.
 *
 * @param {AbapServiceProvider} provider - Instance of the ABAP provider.
 * @param {boolean} isCustomerBase - Indicates whether the adaptation layer is CUSTOMER_BASE.
 * @returns {Promise<FlexUISupportedSystem | undefined>} settings indicating support for onPremise and UI Flex capabilities.
 */
export async function getFlexUISupportedSystem(
    provider: AbapServiceProvider,
    isCustomerBase: boolean
): Promise<FlexUISupportedSystem> {
    if (!isCustomerBase) {
        return {
            isOnPremise: true,
            isUIFlex: true
        };
    }

    const response = await provider.get(AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH, {
        headers: {
            Accept: 'application/*'
        }
    });

    const isOnPremise = response.data.includes(FILTER.term);
    const isUIFlex = response.data.includes(FILTER.scheme);

    return { isOnPremise, isUIFlex };
}

/**
 * Fetches system UI5 Version from the UI5VersionService, if the request throws
 * fallback to the legacy api introduced in the UI5RtVersionService.
 *
 * @param {AbapServiceProvider} provider - Instance of the ABAP provider.
 * @param {ToolsLogger} logger - The logger instance.
 * @throws Throws exceptions only when the ADT api is used.
 * @returns {string | undefined} System UI5 version.
 */
export async function getSystemUI5Version(
    provider: AbapServiceProvider,
    logger: ToolsLogger
): Promise<string | undefined> {
    try {
        const ui5VersionService = provider.getUI5VersionService();
        return await ui5VersionService.getUI5Version();
    } catch (error) {
        logger.debug(
            `Could not fetch the system UI5 version: ${error.message}. Try to fetch the UI5 version with the adt api.`
        );
        const ui5RtVersionService = await provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);
        return ui5RtVersionService?.getUI5Version();
    }
}

/**
 * Retrieves the list of tile inbounds of the application.
 *
 * @param {string} appId - The ID of the application for which to retrieve inbounds.
 * @param {AbapServiceProvider} provider - Instance of the ABAP provider.
 * @returns {Promise<ManifestNamespace.Inbound>} list of tile inbounds of the application.
 */
export async function getBaseAppInbounds(
    appId: string,
    provider: AbapServiceProvider
): Promise<ManifestNamespace.Inbound | undefined> {
    const lrepService = provider.getLayeredRepository();
    const inbounds = (await lrepService.getSystemInfo(undefined, undefined, appId)).inbounds as Inbound[];

    if (!inbounds?.length) {
        return undefined;
    }

    return filterAndMapInboundsToManifest(inbounds);
}
