import {
    AdtCatalogService,
    UI5RtVersionService,
    type AbapServiceProvider,
    type Inbound
} from '@sap-ux/axios-extension';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { FlexUISupportedSystem } from '../types';
import { filterAndMapInboundsToManifest } from '../base/helper';

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
 * Fetches system UI5 Version from UI5RtVersionService.
 *
 * @param {AbapServiceProvider} provider - Instance of the ABAP provider.
 * @returns {string | undefined} System UI5 version.
 */
export async function getSystemUI5Version(provider: AbapServiceProvider): Promise<string | undefined> {
    const service = await provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);
    return service?.getUI5Version();
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
