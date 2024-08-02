import { join } from 'path';
import { existsSync } from 'fs';
import type { Editor } from 'mem-fs-editor';
import { getAppType, getWebappPath } from '@sap-ux/project-access';
import { type DescriptorVariantContent, getVariant, isCFEnvironment } from '@sap-ux/adp-tooling';

/**
 * Validate base path of app, throw error if file is missing.
 *
 * @param basePath - base path of the app, where package.json and ui5.yaml resides
 * @param ui5YamlPath - optional path to ui5.yaml file
 */
export async function validateBasePath(basePath: string, ui5YamlPath?: string): Promise<void> {
    const packageJsonPath = join(basePath, 'package.json');
    if (!existsSync(packageJsonPath)) {
        throw Error(`Required file '${packageJsonPath}' does not exist.`);
    }
    ui5YamlPath ??= join(basePath, 'ui5.yaml');
    const webappPath = await getWebappPath(basePath);
    if (!existsSync(ui5YamlPath) && !existsSync(webappPath)) {
        throw Error(`There must be either a folder '${webappPath}' or a config file '${ui5YamlPath}'`);
    }
}

/**
 * Return if an instance of mem-fs editor recorded any deletion.
 *
 * @param fs - the memfs editor instance
 * @returns - true if fs contains deletions; false otherwise
 */
export function hasFileDeletes(fs: Editor): boolean {
    const changedFiles = fs.dump() || {};
    return !!Object.keys(changedFiles).find((fileName) => changedFiles[fileName].state === 'deleted');
}

/**
 * Validate if adaptation project is supported for command, throws an error if not supported.
 *
 * @param basePath - path to the adaptation project
 */
export async function validateAdpProject(basePath: string): Promise<void> {
    if ((await getAppType(basePath)) !== 'Fiori Adaptation') {
        throw new Error('This command can only be used for an adaptation project');
    }

    if (isCFEnvironment(basePath)) {
        throw new Error('This command is not supported for CF projects.');
    }
}

/**
 * Validate if adaptation project is cloud, throws an error if not.
 *
 * @param basePath - path to the adaptation project
 */
export function validateCloudAdpProject(basePath: string): void {
    const manifest = getVariant(basePath);
    if (
        !manifest?.content?.some(
            (change: DescriptorVariantContent) => change.changeType === 'appdescr_app_removeAllInboundsExceptOne'
        )
    ) {
        throw new Error('This command can only be used for Cloud Adaptation Project.');
    }
}
