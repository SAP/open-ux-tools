import { FlexLayer } from '@sap-ux/adp-tooling';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';

/**
 * Determines and returns the appropriate FlexLayer based on internal usage.
 *
 * @returns {FlexLayer} True if internal usage; otherwise, false.
 */
export function getFlexLayer(): FlexLayer {
    const internal = isInternalFeaturesSettingEnabled();
    return internal ? FlexLayer.VENDOR : FlexLayer.CUSTOMER_BASE;
}
