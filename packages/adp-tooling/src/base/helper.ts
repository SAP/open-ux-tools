import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { DescriptorVariant } from '../types';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, sep } from 'path';
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
export function isCustomerBase(layer: UI5FlexLayer): boolean {
    return layer === 'CUSTOMER_BASE' ? true : false;
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

/**
 * Check if the file exists.
 *
 * @param {string} filePath - The path to the file.
 * @returns {boolean} true if the file exists, false otherwise
 */
export function checkFileExists(filePath: string): boolean {
    return existsSync(filePath);
}

/**
 * Check if a file already exists in a directory.
 *
 * @param {string} filePath - The path to the file.
 * @param {string} checkDirectory - The directory to check.
 * @returns {boolean} true if the file exists in the directory, false otherwise
 */
export function checkDuplicateFile(filePath: string, checkDirectory: string): boolean {
    const fileName = filePath.split(sep).pop();
    if (!existsSync(checkDirectory)) {
        return false;
    }
    const files = readdirSync(checkDirectory);
    return !!files.find((file) => file === fileName);
}
