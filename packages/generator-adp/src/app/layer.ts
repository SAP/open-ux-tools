import { FlexLayer } from '@sap-ux/adp-tooling';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';

/**
 * Determines and returns the appropriate FlexLayer based on internal usage.
 *
 * @returns {Promise<FlexLayer>} True if internal usage; otherwise, false.
 */
export async function getFlexLayer(): Promise<FlexLayer> {
    const internal = isInternalFeaturesSettingEnabled();
    return internal ? FlexLayer.VENDOR : FlexLayer.CUSTOMER_BASE;
}
