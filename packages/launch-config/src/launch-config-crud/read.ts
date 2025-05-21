import { DirName } from '@sap-ux/project-access';
import { join } from 'path';
import type { LaunchConfig, LaunchConfigInfo, LaunchJSON } from '../types';
import { LAUNCH_JSON_FILE } from '../types';
import { parse } from 'jsonc-parser';
import type { Editor } from 'mem-fs-editor';
import { promises as fs } from 'fs';
import type { Logger } from '@sap-ux/logger';

/**
 * Returns path to the launch.json file (if exists) for a given root folder.
 *
 * @param rootFolder - workspace root folder.
 * @param memFs - optional, the memfs editor instance.
 * @returns {string | undefined} path to the launch config file.
 */
export async function getLaunchJSONFilePath(rootFolder: string, memFs?: Editor): Promise<string | undefined> {
    const launchConfigPath = join(rootFolder, DirName.VSCode, LAUNCH_JSON_FILE);
    if (memFs) {
        return memFs.exists(launchConfigPath) ? launchConfigPath : undefined;
    } else {
        try {
            await fs.access(launchConfigPath);
            return launchConfigPath;
        } catch (error) {
            return undefined;
        }
    }
}

/**
 * Returns the list of launch.json paths for a given root folders.
 *
 * @param rootFolders - list of root folders in workspace.
 * @param memFs - optional, the memfs editor instance.
 * @returns {string[]} list of launch.json files.
 */
export async function getLaunchJSONFilePaths(rootFolders: string | string[], memFs?: Editor): Promise<string[]> {
    const roots = Array.isArray(rootFolders) ? rootFolders : [rootFolders];
    const launchConfigFiles: string[] = [];
    for (const rootFolder of roots) {
        const launchConfigPath = await getLaunchJSONFilePath(rootFolder, memFs);
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
 * @param memFs - optional, the memfs editor instance.
 * @returns {LaunchConfig[] | undefined} list of launch configs.
 */
export async function getLaunchConfigs(rootFolder: string, memFs?: Editor): Promise<LaunchConfig[] | undefined> {
    const launchJsonPath = await getLaunchJSONFilePath(rootFolder, memFs);
    let launchJsonString: string;
    let launchJson: LaunchJSON | undefined;
    try {
        if (launchJsonPath) {
            if (memFs) {
                launchJsonString = memFs.read(launchJsonPath);
                launchJson = parse(launchJsonString);
            } else {
                launchJsonString = await fs.readFile(launchJsonPath, { encoding: 'utf8' });
                launchJson = parse(launchJsonString);
            }
            return launchJson?.configurations;
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
 * @param memFs - optional, the memfs editor instance.
 * @returns {LaunchConfigInfo[]} list of launch configs.
 */
export async function getAllLaunchConfigs(rootFolder: string | string[], memFs?: Editor): Promise<LaunchConfigInfo[]> {
    const launchConfigList: LaunchConfigInfo[] = [];
    const roots = Array.isArray(rootFolder) ? rootFolder : [rootFolder];
    const configFiles = await getLaunchJSONFilePaths(roots, memFs);

    if (memFs) {
        for (const filePath of configFiles) {
            const launchJsonString = memFs.read(filePath);
            const config = parse(launchJsonString) as LaunchJSON;

            if (Array.isArray(config.configurations)) {
                launchConfigList.push({ filePath, launchConfigs: config.configurations });
            }
        }
    } else {
        for (const filePath of configFiles) {
            const launchJsonString = await fs.readFile(filePath, { encoding: 'utf8' });
            const config = parse(launchJsonString) as LaunchJSON;

            if (Array.isArray(config.configurations)) {
                launchConfigList.push({ filePath, launchConfigs: config.configurations });
            }
        }
    }
    return launchConfigList;
}

/**
 * Returns the launch configuration from a given launch configurations path by name.
 *
 * @param launchConfigPath - path to the launch.json file.
 * @param name - name of the launch config.
 * @param options - optional options.
 * @param options.memFs - optional, the memfs editor instance.
 * @param options.logger - optional, the logger instance.
 * @returns {LaunchConfig} launch config.
 */
export async function getLaunchConfigByName(
    launchConfigPath: string,
    name: string,
    options?: { memFs?: Editor; logger?: Logger }
): Promise<LaunchConfig> {
    let launchJsonString;
    let launchJson;
    const memFs = options?.memFs;
    const logger = options?.logger;
    try {
        if (memFs) {
            launchJsonString = memFs.read(launchConfigPath);
            launchJson = parse(launchJsonString);
        } else {
            launchJsonString = await fs.readFile(launchConfigPath, { encoding: 'utf8' });
            launchJson = parse(launchJsonString);
        }
        const launchConfig = launchJson.configurations.find((c: LaunchConfig) => c.name === name);
        if (!launchConfig) {
            throw Error(`No config '${name}'`);
        }
        return launchConfig;
    } catch (error) {
        logger?.error(`Could not find launch config '${name}' in '${launchConfigPath}'`);
        throw error;
    }
}
