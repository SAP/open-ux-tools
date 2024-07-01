import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import { UI5FlexLayer } from '@sap-ux/project-access';
import { DescriptorVariant } from '../types';

/**
 * Check environment is running in an internal scenario.
 *
 * @returns true if running in an internal scenario, false otherwise
 */
export function isInternalUsage(layer: UI5FlexLayer): boolean {
    return layer === 'VENDOR';
}

/**
 * Check if the project is a CF project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @returns {boolean} true if the project is a CF project, false otherwise
 */
export function isCFEnvironment(basePath: string): boolean {
    const configJsonPath = join(basePath, '.adp', 'config.json');
    if (existsSync(configJsonPath)) {
        const config = JSON.parse(readFileSync(configJsonPath, 'utf-8'));
        if (config.environment === 'CF') {
            return true;
        }
    }
    return false;
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
