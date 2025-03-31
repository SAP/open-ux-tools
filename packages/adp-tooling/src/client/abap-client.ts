import { type AbapServiceProvider, AdtCatalogService, UI5RtVersionService } from '@sap-ux/axios-extension';
import type { FlexUISupportedSystem } from '../types';

/**
 * Fetches system supports Flex UI features.
 *
 * @param provider
 * @param isCustomerBase
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
    const FILTER = {
        'scheme': 'http://www.sap.com/adt/categories/ui_flex',
        'term': 'dta_folder'
    };
    const acceptHeaders = {
        headers: {
            Accept: 'application/*'
        }
    };
    const response = await provider.get(AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH, acceptHeaders);

    return { isOnPremise: response.data.includes(FILTER.term), isUIFlex: response.data.includes(FILTER.scheme) };
}

/**
 * Fetches system UI5 Version from UI5RtVersionService.
 *
 * @param provider
 * @returns {string | undefined} system UI5 version
 */
export async function getSystemUI5Version(provider: AbapServiceProvider): Promise<string | undefined> {
    const service = await provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);
    const version = await service?.getUI5Version();

    return version;
}
