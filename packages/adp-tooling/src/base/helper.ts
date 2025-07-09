import type { Editor } from 'mem-fs-editor';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, isAbsolute, relative, basename, dirname } from 'path';
import { getWebappPath, FileName, readUi5Yaml, type ManifestNamespace } from '@sap-ux/project-access';
import type { UI5Config, FioriToolsProxyConfig } from '@sap-ux/ui5-config';
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
 * Reads the UI5 YAML configuration and returns the parsed `UI5Config` instance.
 *
 * @param {string} basePath - Adaptation project root
 * @param {string} yamlPath - Relative or absolute path to the ui5.yaml file
 * @returns {Promise<UI5Config>} The `UI5Config` object.
 */
export async function readUi5Config(basePath: string, yamlPath: string): Promise<UI5Config> {
    const ui5ConfigPath = isAbsolute(yamlPath) ? yamlPath : join(basePath, yamlPath);
    return readUi5Yaml(dirname(ui5ConfigPath), basename(ui5ConfigPath));
}

/**
 * Extracts the `adp` preview configuration from a UI5 YAML config (if present).
 *
 * @param {UI5Config} ui5Conf Parsed UI5 configuration
 * @returns The `AdpPreviewConfig` object if found, otherwise `undefined`.
 */
export function extractAdpConfig(ui5Conf: UI5Config): AdpPreviewConfig | undefined {
    const customMiddleware =
        ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('fiori-tools-preview') ??
        ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('preview-middleware');
    return customMiddleware?.configuration?.adp;
}

/**
 * Extracts the `fiori-tools-proxy` middleware configuration from the parsed ui5.yaml.
 *
 * @param {UI5Config} ui5Conf Parsed UI5 configuration
 * @returns The `FioriToolsProxyConfig` object if found, otherwise `undefined`.
 */
export function extractProxyConfig(ui5Conf: UI5Config): FioriToolsProxyConfig | undefined {
    const proxyMw = ui5Conf.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
    return proxyMw?.configuration;
}

/**
 * Reads ui5.yaml and returns the proxy middleware configuration if present.
 * Throws when not found so callers can handle the error consistently.
 *
 * @param {string} basePath  Adaptation project root
 * @param {string} yamlPath  Relative or absolute path to the ui5.yaml file
 * @returns The `FioriToolsProxyConfig` object if found, otherwise `undefined`.
 */
export async function getProxyConfig(basePath: string, yamlPath: string): Promise<FioriToolsProxyConfig> {
    const ui5Conf = await readUi5Config(basePath, yamlPath);
    const proxyCfg = extractProxyConfig(ui5Conf);
    if (!proxyCfg) {
        throw new Error('No fiori-tools-proxy middleware configuration found.');
    }
    return proxyCfg;
}

/**
 * Convenience wrapper that reads the ui5.yaml and directly returns the ADP preview configuration.
 * Throws if the configuration cannot be found.
 *
 * @param basePath  Adaptation project root
 * @param yamlPath  Relative or absolute path to the ui5.yaml file
 * @returns The `AdpPreviewConfig` object if found, otherwise `undefined`.
 */
export async function getAdpConfig(basePath: string, yamlPath: string): Promise<AdpPreviewConfig> {
    try {
        const ui5Conf = await readUi5Config(basePath, yamlPath);
        const adp = extractAdpConfig(ui5Conf);
        if (!adp) {
            throw new Error('Could not extract ADP configuration from ui5.yaml');
        }
        return adp;
    } catch (error) {
        const ui5ConfigPath = isAbsolute(yamlPath) ? yamlPath : join(basePath, yamlPath);
        throw new Error(`No system configuration found in ${basename(ui5ConfigPath)}`);
    }
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
        // Skip if hideLauncher is not false
        if (!inbound?.content || inbound.content.hideLauncher !== false) {
            return acc;
        }
        const { semanticObject, action, signature } = inbound.content;
        if (semanticObject && action) {
            const key = `${semanticObject}-${action}`;

            // Temporary filtration of parameters to avoid issues with merged manifest until release of ABAP Platform Cloud 2508
            if (signature?.parameters) {
                filterIboundsParameters(signature);
            }

            acc[key] = inbound.content;
        }
        return acc;
    }, {} as { [key: string]: InboundContent });

    return Object.keys(filteredInbounds).length === 0 ? undefined : filteredInbounds;
}

/**
 * Filters parameters of the inbound signature to remove invalid or incomplete entries.
 *
 * @param {ManifestNamespace.SignatureDef} inboundSinature - The inbound signature definition to filter.
 */
function filterIboundsParameters(inboundSinature: ManifestNamespace.SignatureDef): void {
    Object.keys(inboundSinature.parameters).forEach((paramKey) => {
        const param = inboundSinature.parameters[paramKey];
        if (param.defaultValue && (!param.defaultValue.format || !param.defaultValue.value)) {
            delete inboundSinature.parameters[paramKey];
            return;
        }
        if (param.filter && !param.filter.format) {
            delete inboundSinature.parameters[paramKey].filter;
        }
        if (param.launcherValue) {
            Object.keys(param.launcherValue).forEach((launcherKey) => {
                if (launcherKey !== 'value') {
                    delete (param.launcherValue as { [key: string]: unknown })[launcherKey];
                }
            });
        }
    });
}
