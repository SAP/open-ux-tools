import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { DescriptorVariant } from '../types';

/**
 * Check environment is running in an internal scenario.
 *
 * @param layer - UI5 Flex layer
 * @returns true if running in an internal scenario, false otherwise
 */
export function isCustomerBase(layer: UI5FlexLayer): boolean {
    return layer === 'CUSTOMER_BASE';
}

/**
 * Get the app descriptor variant.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @returns {DescriptorVariant} The app descriptor variant.
 */
export function getVariant(basePath: string): DescriptorVariant {
    return JSON.parse(readFileSync(join(basePath, 'webapp', 'manifest.appdescr_variant'), 'utf-8'));
}
