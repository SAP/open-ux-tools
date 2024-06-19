import { promises as fs } from 'fs';
import { DirName } from '@sap-ux/project-access';
import { join } from 'path';
import type { LaunchConfig, LaunchConfigInfo } from '../types';
import { launchConfigFile } from './common';
import { parse } from 'jsonc-parser';

/**
 * Checks if the provided file exists in the file system.
 *
 * @param path - the file path to check
 * @returns - true if the file exists; false otherwise.
 */
export async function fileExists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Returns the launch.json file for a workspace root folder. If it doesn't exist, returns undefined.
 *
 * @param rootFolder - workspace root folder.
 * @returns paths to the launch config file.
 */
export async function getLaunchConfigFile(rootFolder: string): Promise<string | undefined> {
    const launchConfigPath = join(rootFolder, DirName.VSCode, launchConfigFile);
    const exists = await fileExists(launchConfigPath);
    if (exists) {
        return launchConfigPath;
    } else {
        return undefined;
    }
    // return (await fileExists(launchConfigPath)) ? launchConfigPath : undefined;
}

/**
 * Get the list of launch.json files for the given root folders.
 *
 * @param rootFolders - list of root folders in workspace.
 * @returns list of launch.json files.
 */
export async function getLaunchConfigFiles(rootFolders: string | string[]): Promise<string[]> {
    const roots = Array.isArray(rootFolders) ? rootFolders : [rootFolders];
    const launchConfigs: string[] = [];
    for (const rootFolder of roots) {
        const launchConfigPath = await getLaunchConfigFile(rootFolder);
        if (typeof launchConfigPath === 'string') {
            launchConfigs.push(launchConfigPath);
        }
    }
    return launchConfigs;
}

/**
 * Gets launch configurations by file from the project folder.
 *
 * @param rootFolder - Single path to the root.
 * @returns list of launch configs.
 */
export async function getLaunchConfigs(rootFolder: string): Promise<LaunchConfig[] | undefined> {
    const launchJsonPath = await getLaunchConfigFile(rootFolder);
    try {
        if (launchJsonPath) {
            const launchJsonString = await fs.readFile(launchJsonPath, { encoding: 'utf8' });
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
 * @returns list of launch configs.
 */
export async function getAllLaunchConfigs(rootFolder: string | string[]): Promise<LaunchConfigInfo[]> {
    const launchConfigList: LaunchConfigInfo[] = [];
    const roots = Array.isArray(rootFolder) ? rootFolder : [rootFolder];
    const configFiles = await getLaunchConfigFiles(roots);

    for (const filePath of configFiles) {
        const launchJsonString = await fs.readFile(filePath, { encoding: 'utf8' });
        const config = parse(launchJsonString);

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
 * @returns launch config.
 */
export async function getLaunchConfigByName(launchConfigPath: string, name: string): Promise<LaunchConfig> {
    try {
        const config = await parse(await fs.readFile(launchConfigPath, { encoding: 'utf8' }));
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
