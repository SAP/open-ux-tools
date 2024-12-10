import type { Editor } from 'mem-fs-editor';
import { readdirSync, readFileSync } from 'fs';
import { join, isAbsolute, relative } from 'path';

import { UI5Config } from '@sap-ux/ui5-config';

import type { DescriptorVariant, AdpPreviewConfig } from '../types';

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
 * Writes the updated variant content to the manifest.appdescr_variant file.
 *
 * @param {string} basePath - The base path of the project.
 * @param {DescriptorVariant} variant - The descriptor variant object.
 * @param {Editor} fs - The mem-fs editor instance.
 */
export function updateVariant(basePath: string, variant: DescriptorVariant, fs: Editor) {
    fs.writeJSON(join(basePath, 'webapp', 'manifest.appdescr_variant'), variant);
}

/**
 * Checks if FLP configuration changes exist in the manifest.appdescr_variant.
 *
 * This function determines whether there are changes of type `appdescr_app_changeInbound`
 * or `appdescr_app_addNewInbound` present in the content of the descriptor variant.
 *
 * @param {string} basePath - The base path of the project where the manifest.appdescr_variant is located.
 * @returns {boolean} Returns `true` if FLP configuration changes exist, otherwise `false`.
 * @throws {Error} Throws an error if the variant could not be retrieved.
 */
export function flpConfigurationExists(basePath: string): boolean {
    try {
        const variant = getVariant(basePath);
        return variant.content?.some(
            ({ changeType }) =>
                changeType === 'appdescr_app_changeInbound' || changeType === 'appdescr_app_addNewInbound'
        );
    } catch (error) {
        throw new Error(`Failed to check if FLP configuration exists: ${(error as Error).message}`);
    }
}

/**
 * Returns the adaptation project configuration, throws an error if not found.
 *
 * @param {string} basePath - The path to the adaptation project.
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

/**
 * Get all files in the webapp folder.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @returns {Array<{ relativePath: string; content: string }>} The files in the webapp folder.
 */
export function getWebappFiles(basePath: string): { relativePath: string; content: string }[] {
    const dir = join(basePath, 'webapp');
    const files: { relativePath: string; content: string }[] = [];

    const getFilesRecursivelySync = (directory: string): void => {
        const dirents = readdirSync(directory, { withFileTypes: true });
        for (const dirent of dirents) {
            const fullPath = join(directory, dirent.name);
            if (dirent.isFile()) {
                const content = readFileSync(fullPath, 'utf-8');
                const relativePath = relative(dir, fullPath);
                files.push({ relativePath, content });
            } else if (dirent.isDirectory()) {
                getFilesRecursivelySync(fullPath);
            }
        }
    };

    getFilesRecursivelySync(dir);
    return files;
}
