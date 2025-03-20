import { isAppStudio } from '@sap-ux/btp-utils';
import { FlexLayer } from '@sap-ux/adp-tooling';
import { isFeatureEnabled } from '@sap-devx/feature-toggle-node';

/**
 * Determines whether the generator is being run in an internal context.
 *
 * @returns {Promise<boolean>} True if internal usage; otherwise, false.
 */
export async function isInternalUsage(): Promise<boolean> {
    if (isAppStudio()) {
        return isFeatureEnabled('adaptation-project', 'internal');
    }
    return false;
}

/**
 * Determines and returns the appropriate FlexLayer based on internal usage.
 *
 * @returns {Promise<FlexLayer>} True if internal usage; otherwise, false.
 */
export async function getFlexLayer(): Promise<FlexLayer> {
    const internal = await isInternalUsage();
    return internal ? FlexLayer.VENDOR : FlexLayer.CUSTOMER_BASE;
}
