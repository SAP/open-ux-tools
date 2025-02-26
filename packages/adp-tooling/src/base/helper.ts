import type { Editor } from 'mem-fs-editor';
import { readdirSync, readFileSync } from 'fs';
import { join, isAbsolute, relative, basename, dirname } from 'path';
import { getWebappPath, FileName, readUi5Yaml } from '@sap-ux/project-access';
import type { UI5Config } from '@sap-ux/ui5-config';
import type { DescriptorVariant, AdpPreviewConfig } from '../types';

/**
 * Get the app descriptor variant.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {Editor} fs - The mem-fs editor instance.
 * @returns {Promise<DescriptorVariant>} The app descriptor variant.
 */
export async function getVariant(basePath: string, fs?: Editor): Promise<DescriptorVariant> {
    const webappPath = await getWebappPath(basePath);
    if (fs) {
        return fs.readJSON(join(webappPath, FileName.ManifestAppDescrVar)) as unknown as DescriptorVariant;
    }
    return JSON.parse(readFileSync(join(webappPath, FileName.ManifestAppDescrVar), 'utf-8'));
}

/**
 * Writes the updated variant content to the manifest.appdescr_variant file.
 *
 * @param {string} basePath - The base path of the project.
 * @param {DescriptorVariant} variant - The descriptor variant object.
 * @param {Editor} fs - The mem-fs editor instance.
 */
export async function updateVariant(basePath: string, variant: DescriptorVariant, fs: Editor): Promise<void> {
    fs.writeJSON(join(await getWebappPath(basePath), FileName.ManifestAppDescrVar), variant);
}

/**
 * Checks if FLP configuration changes exist in the manifest.appdescr_variant.
 *
 * This function determines whether there are changes of type `appdescr_app_changeInbound`
 * or `appdescr_app_addNewInbound` present in the content of the descriptor variant.
 *
 * @param {string} basePath - The base path of the project where the manifest.appdescr_variant is located.
 * @returns {Promise<boolean>} Returns `true` if FLP configuration changes exist, otherwise `false`.
 * @throws {Error} Throws an error if the variant could not be retrieved.
 */
export async function flpConfigurationExists(basePath: string): Promise<boolean> {
    try {
        const variant = await getVariant(basePath);
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
    let ui5Conf: UI5Config;
    let adp: AdpPreviewConfig | undefined;
    try {
        ui5Conf = await readUi5Yaml(dirname(ui5ConfigPath), basename(ui5ConfigPath));
        const customMiddleware =
            ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('fiori-tools-preview') ??
            ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('preview-middleware');
        adp = customMiddleware?.configuration?.adp;
    } catch (error) {
        // do nothing here
    }
    if (!adp) {
        throw new Error(`No system configuration found in ${basename(ui5ConfigPath)}`);
    }
    return adp;
}

/**
 * Get all files in the webapp folder.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @returns {Promise<{ relativePath: string; content: string }[]>} The files in the webapp folder.
 */
export async function getWebappFiles(basePath: string): Promise<{ relativePath: string; content: string }[]> {
    const dir = await getWebappPath(basePath);
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
