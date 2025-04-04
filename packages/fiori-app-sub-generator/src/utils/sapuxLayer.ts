import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { UI5FlexLayer } from '@sap-ux/project-access';

/**
 * Determines the SAP UX layer based on isCap enabled or not.
 *
 * If the project is a CAP project, this function will return `undefined`.
 * For non-CAP projects, it checks whether internal features are enabled and returns the corresponding
 * SAP UX layer:
 * - `UI5FlexLayer.VENDOR` if internal features are enabled,
 * - `UI5FlexLayer.CUSTOMER_BASE` if they are not.
 *
 * @param {boolean} isCap - Indicates if the project is a CAP project.
 * @returns {UI5FlexLayer | undefined} - The assigned SAP UX layer or `undefined` for CAP projects.
 */
export function assignSapUxLayerValue(isCap: boolean = false): UI5FlexLayer | undefined {
    if (isCap) {
        // Skip for CAP projects
        return undefined;
    }
    return isInternalFeaturesSettingEnabled() ? 'VENDOR' : 'CUSTOMER_BASE';
}
