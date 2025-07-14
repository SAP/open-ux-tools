import type { Editor } from 'mem-fs-editor';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, isAbsolute, relative, basename, dirname } from 'path';
import { getWebappPath, FileName, readUi5Yaml, type ManifestNamespace } from '@sap-ux/project-access';
import type { UI5Config } from '@sap-ux/ui5-config';
import type { InboundContent, Inbound } from '@sap-ux/axios-extension';

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
 * @param {DescriptorVariant} variant - The descriptor variant object to check for FLP configuration changes.
 * @returns {Promise<boolean>} Returns `true` if FLP configuration changes exist, otherwise `false`.
 */
export function flpConfigurationExists(variant: DescriptorVariant): boolean {
    return variant.content?.some(
        ({ changeType }) => changeType === 'appdescr_app_changeInbound' || changeType === 'appdescr_app_addNewInbound'
    );
}

/**
 * Checks whether TypeScript is supported in the project by verifying the existence of `tsconfig.json`.
 *
 * @param basePath - The base path of the project.
 * @param fs - An optional `mem-fs-editor` instance to check for the file's existence.
 * @returns `true` if `tsconfig.json` exists, otherwise `false`.
 */
export function isTypescriptSupported(basePath: string, fs?: Editor): boolean {
    const path = join(basePath, 'tsconfig.json');
    return fs ? fs.exists(path) : existsSync(path);
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

/**
 * Transforms an array of inbound objects from the SystemInfo API format into a ManifestNamespace.Inbound object.
 *
 * @param {Inbound[]} inbounds - The array of inbound objects to transform.
 * @returns {ManifestNamespace.Inbound | undefined} The transformed inbounds or undefined if input is empty.
 */
export function filterAndMapInboundsToManifest(inbounds: Inbound[]): ManifestNamespace.Inbound | undefined {
    if (!inbounds || inbounds.length === 0) {
        return undefined;
    }
    const filteredInbounds = inbounds.reduce((acc: { [key: string]: InboundContent }, inbound) => {
        // Skip if hideLauncher is true
        if (!inbound?.content || inbound.content.hideLauncher === true) {
            return acc;
        }
        const { semanticObject, action } = inbound.content;
        if (semanticObject && action) {
            const key = `${semanticObject}-${action}`;
            acc[key] = inbound.content;
        }
        return acc;
    }, {} as { [key: string]: InboundContent });

    return Object.keys(filteredInbounds).length === 0 ? undefined : filteredInbounds;
}
