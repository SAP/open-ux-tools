import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { DescriptorVariant } from '../types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
/**
 * Checks if the input is a non-empty string.
 *
 * @param input - input to check
 * @returns true if the input is a non-empty string
 */
export function isNotEmptyString(input: string | undefined): boolean {
    return typeof input === 'string' && input.trim().length > 0;
}

/**
 * Checks if the input is a valid SAP client.
 *
 * @param input - input to check
 * @returns true if the input is a valid SAP client
 */
export function isValidSapClient(input: string | undefined): boolean {
    return !input || (input.length < 4 && !!new RegExp(/^\d*$/).exec(input));
}

/**
 * Check environment is running in an internal scenario.
 *
 * @param layer - UI5 Flex layer
 * @returns true if running in an internal scenario, false otherwise
 */
export function isInternalUsage(layer: UI5FlexLayer): boolean {
    return layer === 'VENDOR' ? true : false;
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
