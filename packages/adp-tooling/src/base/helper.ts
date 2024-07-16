import { UI5FlexLayer } from '@sap-ux/project-access';
import { getProjectNames } from './file-system';

/**
 * Check environment is running in an customer scenario.
 *
 * @param layer - UI5 Flex layer
 * @returns true if running in an customer scenario, false otherwise
 */
export function isCustomerBase(layer: UI5FlexLayer): boolean {
    return layer === 'CUSTOMER_BASE';
}
