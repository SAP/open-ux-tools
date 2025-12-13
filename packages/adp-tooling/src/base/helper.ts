import type { Editor } from 'mem-fs-editor';
import type { ReaderCollection } from '@ui5/fs';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, isAbsolute, relative, basename, dirname } from 'node:path';

import type { UI5Config } from '@sap-ux/ui5-config';
import { type InboundContent, type Inbound, AdaptationProjectType } from '@sap-ux/axios-extension';
import { getWebappPath, FileName, readUi5Yaml, type ManifestNamespace, type Manifest } from '@sap-ux/project-access';

import type { DescriptorVariant, AdpPreviewConfig, UI5YamlCustomTaskConfiguration } from '../types';

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
 * Extracts the CF build task from the UI5 configuration.
 *
 * @param {UI5Config} ui5Conf - The UI5 configuration.
 * @returns {UI5YamlCustomTaskConfiguration} The CF build task.
 */
export function extractCfBuildTask(ui5Conf: UI5Config): UI5YamlCustomTaskConfiguration {
    const buildTask =
        ui5Conf.findCustomTask<UI5YamlCustomTaskConfiguration>('app-variant-bundler-build')?.configuration;

    if (!buildTask) {
        throw new Error('No CF ADP project found');
    }

    return buildTask;
}

/**
 * Read the manifest from the build output folder.
 *
 * @param {string} cfBuildPath - The path to the build output folder.
 * @returns {Manifest} The manifest.
 */
export function readManifestFromBuildPath(cfBuildPath: string): Manifest {
    const distPath = join(process.cwd(), cfBuildPath);
    const manifestPath = join(distPath, 'manifest.json');
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
}

/**
 * Load and parse the app variant descriptor.
 *
 * @param {ReaderCollection} rootProject - The root project.
 * @returns {Promise<DescriptorVariant>} The parsed descriptor variant.
 */
export async function loadAppVariant(rootProject: ReaderCollection): Promise<DescriptorVariant> {
    const appVariant = await rootProject.byPath('/manifest.appdescr_variant');
    if (!appVariant) {
        throw new Error('ADP configured but no manifest.appdescr_variant found.');
    }
    try {
        const content = await appVariant.getString();
        if (!content || content.trim() === '') {
            throw new Error('ADP configured but manifest.appdescr_variant file is empty.');
        }
        return JSON.parse(content) as DescriptorVariant;
    } catch (e) {
        throw new Error(`Failed to parse manifest.appdescr_variant: ${e.message}`);
    }
}

/**
 * Convenience wrapper that reads the ui5.yaml and directly returns the ADP preview configuration.
 * Throws if the configuration cannot be found.
 *
 * @param basePath  Adaptation project root
 * @param yamlPath  Relative or absolute path to the ui5.yaml file
 * @returns The `AdpPreviewConfig` object if found, otherwise throws an error.
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
 * Returns the project type for an existing Adaptation project based on the information
 * inside the ui5.yaml. If the builder key is presented inside the yaml then we are
 * in a cloudReady project otherwise - onPremise.
 *
 * @param {string} basePath - The path to the adaptation project root folder.
 * @param {string} yamlPath - The path to the ui5.yaml file.
 * @returns {Promise<AdaptationProjectType | undefined>} The project type or undefined.
 */
export async function getExistingProjectType(
    basePath: string,
    yamlPath: string
): Promise<AdaptationProjectType | undefined> {
    try {
        const ui5Yaml = await getAdpConfig(basePath, yamlPath);
        return ui5Yaml.builder ? AdaptationProjectType.CLOUD_READY : AdaptationProjectType.ON_PREMISE;
    } catch (error) {
        return undefined;
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
