import { readFile, readJSONWithComments, updateJSONWithComments } from '@sap/ux-project-access';
import { createFioriLaunchConfig, parseArguments } from './common';
import type { LaunchConfig } from '../types';
import type { FioriOptions } from '@sap/ux-launch-config-types';
import { getLaunchConfigFile } from './read';
import { createLaunchConfigFile } from './create';
import type { JSONPath, Node } from 'jsonc-parser';
import { findNodeAtLocation, parseTree } from 'jsonc-parser';

export type configType = object | string | number | undefined;

/**
 * Adds a new launch configuration to launch.json.
 *
 * @param launchConfigPath path to the launch.json file.
 * @param launchConfig launch config to be added to the launch.json.
 * @returns void.
 */
async function addLaunchConfig(launchConfigPath: string, launchConfig: LaunchConfig): Promise<void> {
    const launchJson = await readJSONWithComments<{ configurations: LaunchConfig[] }>(launchConfigPath);
    await updateJSONWithComments(
        launchConfig,
        launchConfigPath,
        ['configurations', launchJson.configurations.length + 1],
        { isArrayInsertion: true }
    );
}

/**
 * Add a launch config to .vscode/launch.json file. Create the file if it doesn't exist.
 *
 * @param rootFolder - the workspace root folder.
 * @param options - options to create launch config.
 * @returns void.
 */
export async function addFioriElementsLaunchConfig(rootFolder: string, options: FioriOptions): Promise<void> {
    const launchConfig = getLaunchConfigFile(rootFolder);
    if (launchConfig) {
        const fioriLaunchConfig = createFioriLaunchConfig(rootFolder, options);
        await addLaunchConfig(launchConfig, fioriLaunchConfig);
    } else {
        await createLaunchConfigFile(rootFolder, options);
    }
}

/**
 * Merges the new and the existing cli arguments of a run configuration.
 *
 * @param newArgs new cli arguments specified in the run config wizard.
 * @param oldArgs existing cli arguments of a run configuration.
 * @returns merged launch config arguments.
 */
function mergeArgs(newArgs: string[] | undefined, oldArgs: string[] | undefined): string[] {
    let mergedArgs: string[] = [];

    if (newArgs && oldArgs) {
        mergedArgs = mergedArgs.concat(newArgs);
        const parsedOldArgs = parseArguments(oldArgs);
        mergedArgs = mergedArgs.concat(parsedOldArgs['_']);

        return mergedArgs;
    } else {
        return mergedArgs;
    }
}

/**
 * Traverses each element of an object and executes callback function on it.
 *
 * @param obj - the new JSON object to replace original JSON.
 * @param filePath - path to the JSON file.
 * @param originalJSON - the original JSON {@linkcode Node} before modification.
 * @param callback - function to be executed on the object property, similar to {@linkcode updateJSONWithComments}.
 * @param initialPath - intial {@linkcode JSONPath} of the object to be traversed.
 * @returns void.
 */
export async function traverseAndModifyObject(
    obj: any,
    filePath: string,
    originalJSON: Node | undefined,
    callback: (config: configType, filePath: string, jsonPath: JSONPath) => Promise<void>,
    initialPath: JSONPath = []
): Promise<void> {
    for (const key in obj) {
        // Build the current JSONPath by appending the current key
        const currentPath = [...initialPath, key];
        const node = originalJSON && findNodeAtLocation(originalJSON, currentPath);
        const originalLength = node?.children?.length as number;

        if (Array.isArray(obj[key])) {
            await processArray(obj[key], filePath, originalJSON, callback, currentPath, originalLength);
        } else if (typeof obj[key] === 'object') {
            await processObject(obj[key], filePath, originalJSON, callback, currentPath, originalLength, node);
        } else {
            await callback(obj[key], filePath, [...currentPath]);
        }
    }
}

/**
 * Processes each element of an array of objects and executes callback function on it.
 *
 * @param arr - array of objects.
 * @param filePath - path to the JSON file.
 * @param originalJSON - the original JSON {@linkcode Node} before modification.
 * @param callback - function to be executed on the object property, similar to {@linkcode updateJSONWithComments}.
 * @param currentPath - intial {@linkcode JSONPath} of the object to be traversed.
 * @param originalLength - original lench of the array.
 * @returns void.
 */
async function processArray(
    arr: any[],
    filePath: string,
    originalJSON: Node | undefined,
    callback: (config: configType, filePath: string, jsonPath: JSONPath) => Promise<void>,
    currentPath: JSONPath,
    originalLength: number
): Promise<void> {
    const maxLength = Math.max(arr.length, originalLength);
    for (let i = 0, j = maxLength; i < maxLength; i++) {
        if (typeof arr[i] === 'object') {
            await traverseAndModifyObject(arr[i], filePath, originalJSON, callback, [...currentPath, i]);
        } else {
            if (arr.length >= originalLength || arr[i]) {
                await callback(arr[i], filePath, [...currentPath, i]);
            } else {
                // deletion of a property
                await callback(undefined, filePath, [...currentPath, --j]);
            }
        }
    }
}

/**
 * Processes each object in object of objects and executes callback function on it.
 *
 * @param obj - object of objects.
 * @param filePath - path to the JSON file.
 * @param originalJSON - the original JSON {@linkcode Node} before modification.
 * @param callback - function to be executed on the object property, similar to {@linkcode updateJSONWithComments}.
 * @param currentPath - intial {@linkcode JSONPath} of the object to be traversed.
 * @param originalLength - intial {@linkcode JSONPath} of the object to be traversed.
 * @param node - object node.
 * @returns void.
 */
async function processObject(
    obj: any,
    filePath: string,
    originalJSON: Node | undefined,
    callback: (config: configType, filePath: string, jsonPath: JSONPath) => Promise<void>,
    currentPath: JSONPath,
    originalLength: number,
    node: Node | undefined
): Promise<void> {
    const length = Object.keys(obj).length;
    if (length >= originalLength) {
        await traverseAndModifyObject(obj, filePath, originalJSON, callback, currentPath);
    } else {
        for (let i = 0; i < originalLength; i++) {
            const value = node && node.children![i].children![0].value;
            if (!obj[value]) {
                // deletion of a property
                await callback(undefined, filePath, [...currentPath, value]);
            }
        }
    }
}

/**
 * Updates then launch config in .vscode/launch.json file. If options are passed then updates otherwise - deletes.
 *
 * @param rootFolder - the project root folder.
 * @param index - index of the launch config.
 * @param options - optional if update is required, options to update to.
 * @returns void.
 */
export async function updateFioriElementsLaunchConfig(
    rootFolder: string,
    index: number,
    options?: FioriOptions
): Promise<void> {
    const launchConfigPath = getLaunchConfigFile(rootFolder);
    if (launchConfigPath) {
        const launchJson = await readJSONWithComments<{ configurations: LaunchConfig[] }>(launchConfigPath);
        const jsonString = await readFile(launchConfigPath);
        if (options && jsonString) {
            // update
            const jsonTree = parseTree(jsonString);
            const fioriLaunchConfig = createFioriLaunchConfig(rootFolder, options);
            const oldArgs = launchJson.configurations[index].args;
            fioriLaunchConfig.args = mergeArgs(fioriLaunchConfig.args, oldArgs);
            await traverseAndModifyObject(fioriLaunchConfig, launchConfigPath, jsonTree, updateJSONWithComments, [
                'configurations',
                index
            ]);
        } else {
            // delete
            await updateJSONWithComments(undefined, launchConfigPath, ['configurations', index]);
        }
    }
}
