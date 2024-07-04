import { getWebappPath } from '@sap-ux/project-access';
import { existsSync } from 'fs';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { getAppType } from '@sap-ux/project-access';
import { isCFEnvironment } from '@sap-ux/adp-tooling';

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
 * Validate if Adaptation Project is supported for command, throws an error if not supported.
 *
 * @param basePath - path to the Adaptation Project
 */
export async function validateAdpProject(basePath: string): Promise<void> {
    if ((await getAppType(basePath)) !== 'Fiori Adaptation') {
        throw new Error('This command can only be used for an Adaptation Project');
    }
    if (isCFEnvironment(basePath)) {
        throw new Error('This command is not supported for CF projects.');
    }
}
