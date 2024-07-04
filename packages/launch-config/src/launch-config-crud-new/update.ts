import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { FioriOptions, LaunchJSON } from '../types';
import { LAUNCH_JSON_FILE } from '../types';
import type { JSONPath, ModificationOptions, Node } from 'jsonc-parser';
import { findNodeAtLocation, parse, parseTree } from 'jsonc-parser';
import type { Editor } from 'mem-fs-editor';
import { generateNewFioriLaunchConfig, mergeArgs } from './utils';
import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import { updateLaunchJSON } from './writer';

export type configType = object | string | number | undefined;

type UpdateCallback = (
    config: configType,
    filePath: string,
    jsonPath: JSONPath,
    options?: ModificationOptions,
    fs?: Editor
) => Promise<void>;

/**
 * Traverses each element of an object and executes callback function on it.
 *
 * @param obj - the new JSON object to replace original JSON.
 * @param filePath - path to the JSON file.
 * @param originalJSON - the original JSON {@linkcode Node} before modification.
 * @param callback - function to be executed on the object property.
 * @param fs - the memfs editor instance.
 * @param initialPath - intial {@linkcode JSONPath} of the object to be traversed.
 * @returns void.
 */
export async function traverseAndModifyObject(
    obj: any,
    filePath: string,
    originalJSON: Node | undefined,
    callback: UpdateCallback,
    fs: Editor,
    initialPath: JSONPath = []
): Promise<void> {
    for (const key in obj) {
        // Build the current JSONPath by appending the current key
        const currentPath = [...initialPath, key];
        const node = originalJSON && findNodeAtLocation(originalJSON, currentPath);
        const originalLength = node?.children?.length as number;

        if (Array.isArray(obj[key])) {
            await processArray(obj[key], filePath, originalJSON, callback, currentPath, originalLength, fs);
        } else if (typeof obj[key] === 'object') {
            await processObject(obj[key], filePath, originalJSON, callback, currentPath, originalLength, node, fs);
        } else {
            await callback(obj[key], filePath, [...currentPath], undefined, fs);
        }
    }
}

/**
 * Processes each element of an array of objects and executes callback function on it.
 *
 * @param arr - array of objects.
 * @param filePath - path to the JSON file.
 * @param originalJSON - the original JSON {@linkcode Node} before modification.
 * @param callback - function to be executed on the object property.
 * @param currentPath - intial {@linkcode JSONPath} of the object to be traversed.
 * @param originalLength - original lench of the array.
 * @param fs - the memfs editor instance.
 * @returns void.
 */
async function processArray(
    arr: any[],
    filePath: string,
    originalJSON: Node | undefined,
    callback: UpdateCallback,
    currentPath: JSONPath,
    originalLength: number,
    fs: Editor
): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
    const maxLength = Math.max(arr.length, originalLength);
    for (let i = 0, j = maxLength; i < maxLength; i++) {
        if (typeof arr[i] === 'object') {
            await traverseAndModifyObject(arr[i], filePath, originalJSON, callback, fs, [...currentPath, i]);
        } else if (arr.length >= originalLength || arr[i]) {
            await callback(arr[i], filePath, [...currentPath, i], undefined, fs);
        } else {
            // deletion of a property
            await callback(undefined, filePath, [...currentPath, --j], undefined, fs);
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
 * @param fs - the memfs editor instance.
 * @returns void.
 */
async function processObject(
    obj: any,
    filePath: string,
    originalJSON: Node | undefined,
    callback: UpdateCallback,
    currentPath: JSONPath,
    originalLength: number,
    node: Node | undefined,
    fs: Editor
): Promise<void> {
    const length = Object.keys(obj).length;
    if (length >= originalLength) {
        await traverseAndModifyObject(obj, filePath, originalJSON, callback, fs, currentPath);
    } else {
        for (let i = 0; i < originalLength; i++) {
            const value = node?.children![i].children![0].value;
            if (!obj[value]) {
                // deletion of a property
                await callback(undefined, filePath, [...currentPath, value], undefined, fs);
            }
        }
    }
}

/**
 * Update existing launch config in launch.json file.
 *
 * @param rootFolder - workspace root folder.
 * @param fioriOptions - options for the new launch config.
 * @param index - index of the launch config to edit.
 * @param fs - optional, the memfs editor instance.
 * @returns memfs editor instance.
 */
export async function updateLaunchConfig(
    rootFolder: string,
    fioriOptions: FioriOptions,
    index: number,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchJSONPath = join(rootFolder, DirName.VSCode, LAUNCH_JSON_FILE);
    if (fs.exists(launchJSONPath)) {
        // edit existing launch config
        const launchJSONString = fs.read(launchJSONPath);
        const launchJSON = parse(launchJSONString) as LaunchJSON;
        const launchJSONTree = parseTree(launchJSONString);
        const launchConfig = generateNewFioriLaunchConfig(rootFolder, fioriOptions);
        const oldArgs = launchJSON.configurations[index].args;
        launchConfig.args = mergeArgs(launchConfig.args, oldArgs);
        await traverseAndModifyObject(launchConfig, launchJSONPath, launchJSONTree, updateLaunchJSON, fs, [
            'configurations',
            index
        ]);
    }
    return fs;
}
