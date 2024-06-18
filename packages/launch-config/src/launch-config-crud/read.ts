import { promises as fs } from 'fs';
import { DirName } from '@sap-ux/project-access';
import { existsSync } from 'fs';
import { join } from 'path';
import type { LaunchConfig, LaunchConfigInfo } from '../types';
import { launchConfigFile } from './common';
import { parse } from 'jsonc-parser';

/**
 * Returns the launch.json file for a workspace root folder. If it doesn't exist, returns undefined.
 *
 * @param rootFolder - workspace root folder.
 * @returns paths to the launch config file.
 */
export function getLaunchConfigFile(rootFolder: string): string | undefined {
    const launchConfigPath = join(rootFolder, DirName.VSCode, launchConfigFile);
    return existsSync(launchConfigPath) ? launchConfigPath : undefined;
}

/**
 * Get the list of launch.json files for the given root folders.
 *
 * @param rootFolders - list of root folders in workspace.
 * @returns list of launch.json files.
 */
export function getLaunchConfigFiles(rootFolders: string | string[]): string[] {
    const roots = Array.isArray(rootFolders) ? rootFolders : [rootFolders];
    const launchConfigs: string[] = [];
    for (const rootFolder of roots) {
        const launchConfigPath = getLaunchConfigFile(rootFolder);
        if (typeof launchConfigPath === 'string') {
            launchConfigs.push(launchConfigPath);
        }
    }
    return launchConfigs;
}

/**
 * Gets launch configurations by file from the project folder.
 *
 * @param rootFolder - Single path to root.
 * @returns list of launch configs.
 */
export async function getLaunchConfigs(rootFolder: string): Promise<LaunchConfig[] | undefined> {
    const launchJsonPath = getLaunchConfigFile(rootFolder);
    try {
        if (launchJsonPath) {
            return parse(await fs.readFile(launchJsonPath, { encoding: 'utf8' }));
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
    const configFiles = getLaunchConfigFiles(roots);

    for (const filePath of configFiles) {
        const config = parse(await fs.readFile(filePath, { encoding: 'utf8' }));

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
        const launchConfig = config.configurations.find((c) => c.name === name);
        if (!launchConfig) {
            throw Error(`No config '${name}'`);
        }
        return launchConfig;
    } catch (error) {
        console.error(`Could not find launch config '${name}' in '${launchConfigPath}'`, error);
        throw error;
    }
}
