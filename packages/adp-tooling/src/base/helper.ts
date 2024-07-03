import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { DescriptorVariant, AdpPreviewConfig } from '../types';
import type { ToolsLogger } from '@sap-ux/logger';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { getManifest } from './abap';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, sep, isAbsolute } from 'path';
import { UI5Config } from '@sap-ux/ui5-config';
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

/**
 * Returns the Adaptation Project configuration, throws an error if not found.
 *
 * @param {string} basePath - The path to the Adaptation Project.
 * @param {string} yamlPath - The path to yaml configuration file.
 * @returns {Promise<AdpPreviewConfig>} the adp configuration
 */
export async function getAdpConfig(basePath: string, yamlPath: string): Promise<AdpPreviewConfig> {
    const ui5ConfigPath = isAbsolute(yamlPath) ? yamlPath : join(basePath, yamlPath);
    const ui5Conf = await UI5Config.newInstance(readFileSync(ui5ConfigPath, 'utf-8'));
    const customMiddlerware =
        ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('fiori-tools-preview') ??
        ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('preview-middleware');
    const adp = customMiddlerware?.configuration?.adp;
    if (!adp) {
        throw new Error('No system configuration found in ui5.yaml');
    }
    return adp;
}

type DataSources = Record<string, ManifestNamespace.DataSource>;

/**
 * Returns the Adaptation Project configuration, throws an error if not found.
 *
 * @param {string} reference - The base application id.
 * @param {AdpPreviewConfig} adpConfig - The Adaptation Project configuration.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<DataSources>} data sources from base application manifest
 */
export async function getManifestDataSources(
    reference: string,
    adpConfig: AdpPreviewConfig,
    logger: ToolsLogger
): Promise<DataSources> {
    const manifest = await getManifest(reference, adpConfig, logger);
    const dataSources = manifest['sap.app'].dataSources;
    if (!dataSources) {
        throw new Error('No data sources found in the manifest');
    }
    return dataSources;
}
