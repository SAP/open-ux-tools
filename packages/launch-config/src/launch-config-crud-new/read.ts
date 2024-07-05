import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { DirName } from '@sap-ux/project-access';
import { join } from 'path';
import type { LaunchConfig, LaunchConfigInfo, LaunchJSON } from '../types';
import { LAUNCH_JSON_FILE } from '../types';
import { parse } from 'jsonc-parser';
import type { Editor } from 'mem-fs-editor';

/**
 * Returns path to the launch.json file (if exists) for a given root folder.
 *
 * @param rootFolder - workspace root folder.
 * @param fs - the memfs editor instance.
 * @returns paths to the launch config file.
 */
export async function getLaunchJSONFilePath(rootFolder: string, fs: Editor): Promise<string | undefined> {
    const launchConfigPath = join(rootFolder, DirName.VSCode, LAUNCH_JSON_FILE);
    return fs.exists(launchConfigPath) ? launchConfigPath : undefined;
}

/**
 * Returns the list of launch.json paths for a given root folders.
 *
 * @param rootFolders - list of root folders in workspace.
 * @param fs - the memfs editor instance.
 * @returns list of launch.json files.
 */
export async function getLaunchJSONFilePaths(rootFolders: string | string[], fs: Editor): Promise<string[]> {
    const roots = Array.isArray(rootFolders) ? rootFolders : [rootFolders];
    const launchConfigFiles: string[] = [];
    for (const rootFolder of roots) {
        const launchConfigPath = await getLaunchJSONFilePath(rootFolder, fs);
        if (typeof launchConfigPath === 'string') {
            launchConfigFiles.push(launchConfigPath);
        }
    }
    return launchConfigFiles;
}

/**
 * Returns launch configurations from a given root folder.
 *
 * @param rootFolder - Single path to the root.
 * @param fs - the memfs editor instance.
 * @returns list of launch configs.
 */
export async function getLaunchConfigs(rootFolder: string, fs: Editor): Promise<LaunchConfig[] | undefined> {
    const launchJsonPath = await getLaunchJSONFilePath(rootFolder, fs);
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
 * Returns all launch configurations by file from a given root folders.
 *
 * @param rootFolder - Single path to root or list of root folders.
 * @param fs - the memfs editor instance.
 * @returns list of launch configs.
 */
export async function getAllLaunchConfigs(rootFolder: string | string[], fs: Editor): Promise<LaunchConfigInfo[]> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchConfigList: LaunchConfigInfo[] = [];
    const roots = Array.isArray(rootFolder) ? rootFolder : [rootFolder];
    const configFiles = await getLaunchJSONFilePaths(roots, fs);

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
 * Returns the launch configuration from a given launch configurations path by name.
 *
 * @param launchConfigPath - path to the launch.json file.
 * @param name - name of the launch config.
 * @param fs - the memfs editor instance.
 * @returns launch config.
 */
export async function getLaunchConfigByName(launchConfigPath: string, name: string, fs: Editor): Promise<LaunchConfig> {
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
