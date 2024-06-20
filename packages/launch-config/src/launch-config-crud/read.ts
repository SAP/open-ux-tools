import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { DirName } from '@sap-ux/project-access';
import { join } from 'path';
import type { LaunchConfig, LaunchConfigInfo, LaunchJSON } from '../types';
import { launchConfigFile } from './common';
import { parse } from 'jsonc-parser';
import type { Editor } from 'mem-fs-editor';

/**
 * Returns the launch.json file for a workspace root folder. If it doesn't exist, returns undefined.
 *
 * @param rootFolder - workspace root folder.
 * @param fs - optional, the memfs editor instance.
 * @returns paths to the launch config file.
 */
export async function getLaunchConfigFile(rootFolder: string, fs?: Editor): Promise<string | undefined> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchConfigPath = join(rootFolder, DirName.VSCode, launchConfigFile);
    return fs.exists(launchConfigPath) ? launchConfigPath : undefined;
}

/**
 * Get the list of launch.json files for the given root folders.
 *
 * @param rootFolders - list of root folders in workspace.
 * @param fs - optional, the memfs editor instance.
 * @returns list of launch.json files.
 */
export async function getLaunchConfigFiles(rootFolders: string | string[], fs?: Editor): Promise<string[]> {
    if (!fs) {
        fs = create(createStorage());
    }
    const roots = Array.isArray(rootFolders) ? rootFolders : [rootFolders];
    const launchConfigFiles: string[] = [];
    for (const rootFolder of roots) {
        const launchConfigPath = await getLaunchConfigFile(rootFolder, fs);
        if (typeof launchConfigPath === 'string') {
            launchConfigFiles.push(launchConfigPath);
        }
    }
    return launchConfigFiles;
}

/**
 * Gets launch configurations by file from the project folder.
 *
 * @param rootFolder - Single path to the root.
 * @param fs - optional, the memfs editor instance.
 * @returns list of launch configs.
 */
export async function getLaunchConfigs(rootFolder: string, fs?: Editor): Promise<LaunchConfig[] | undefined> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchJsonPath = await getLaunchConfigFile(rootFolder);
    try {
        if (launchJsonPath) {
            const launchJsonString = fs.read(launchJsonPath);
            const launchJson = parse(launchJsonString);
            return launchJson.configurations;
        }
        return undefined;
    } catch (err) {
        throw new Error(err);
    }
}

/**
 * Gets all launch configurations by file from the current workspace (root folders need to be passed).
 *
 * @param rootFolder - Single path to root or list of root folders.
 * @param fs - optional, the memfs editor instance.
 * @returns list of launch configs.
 */
export async function getAllLaunchConfigs(rootFolder: string | string[], fs?: Editor): Promise<LaunchConfigInfo[]> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchConfigList: LaunchConfigInfo[] = [];
    const roots = Array.isArray(rootFolder) ? rootFolder : [rootFolder];
    const configFiles = await getLaunchConfigFiles(roots, fs);

    for (const filePath of configFiles) {
        const launchJsonString = fs.read(filePath);
        const config = parse(launchJsonString) as LaunchJSON;

        if (Array.isArray(config.configurations)) {
            launchConfigList.push({ filePath, launchConfigs: config.configurations });
        }
    }
    return launchConfigList;
}

/**
 * Gets launch config from launch config list by name.
 *
 * @param launchConfigPath - path to the launch.json file.
 * @param name - name of the launch config.
 * @param fs - optional, the memfs editor instance.
 * @returns launch config.
 */
export async function getLaunchConfigByName(
    launchConfigPath: string,
    name: string,
    fs?: Editor
): Promise<LaunchConfig> {
    if (!fs) {
        fs = create(createStorage());
    }
    try {
        const config = parse(fs.read(launchConfigPath));
        const launchConfig = config.configurations.find((c: LaunchConfig) => c.name === name);
        if (!launchConfig) {
            throw Error(`No config '${name}'`);
        }
        return launchConfig;
    } catch (error) {
        console.error(`Could not find launch config '${name}' in '${launchConfigPath}'`, error);
        throw error;
    }
}
