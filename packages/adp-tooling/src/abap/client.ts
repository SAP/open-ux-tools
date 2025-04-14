import { type AbapServiceProvider, AdtCatalogService, UI5RtVersionService } from '@sap-ux/axios-extension';

import type { FlexUISupportedSystem } from '../types';

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
