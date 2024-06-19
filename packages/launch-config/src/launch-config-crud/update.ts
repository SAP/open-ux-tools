import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { createFioriLaunchConfig, parseArguments } from './common';
import type { FioriOptions, LaunchConfig, LaunchJSON } from '../types';
import { getLaunchConfigFile } from './read';
import { createLaunchConfigFile } from './create';
import type { JSONPath, ModificationOptions, Node } from 'jsonc-parser';
import { applyEdits, findNodeAtLocation, modify, parse, parseTree } from 'jsonc-parser';
import type { Editor } from 'mem-fs-editor';

export type configType = object | string | number | undefined;

/**
 * Adds, modifies or deletes 'launch.json'.
 *
 * @param content content to be added to the JSON file at location specified by JSONPath. If undefined, property will be deleted.
 * @param filePath path to the json file.
 * @param jsonPath The {@linkcode JSONPath} of the value to change. The path represents either to the document root, a property or an array item.
 * @param options Options {@linkcode ModificationOptions} used by {@linkcode modify} when computing the modification edit operations. Default formattingOptions are used if not provided.
 * @param fs - optional, the memfs editor instance.
 * @returns void.
 */
export async function updateLaunchJSON(
    content: object | string | number | undefined,
    filePath: string,
    jsonPath: JSONPath,
    options: ModificationOptions = {},
    fs?: Editor
): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
    const jsonString = fs.read(filePath);
    if (!options.formattingOptions) {
        options.formattingOptions = {
            tabSize: 4,
            insertSpaces: true
        };
    }
    // make edits and apply them
    const edits = modify(jsonString, jsonPath, content, options);
    const updated = applyEdits(jsonString, edits);
    // write changes to file
    fs.write(filePath, updated);
}

/**
 * Adds a new launch configuration to launch.json.
 *
 * @param launchConfigPath path to the launch.json file.
 * @param launchConfig launch config to be added to the launch.json.
 * @param fs - optional, the memfs editor instance.
 * @returns void.
 */
async function addLaunchConfig(launchConfigPath: string, launchConfig: LaunchConfig, fs?: Editor): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchJsonString = fs.read(launchConfigPath);
    const launchJson = parse(launchJsonString) as LaunchJSON;
    await updateLaunchJSON(
        launchConfig,
        launchConfigPath,
        ['configurations', launchJson.configurations.length + 1],
        {
            isArrayInsertion: true
        },
        fs
    );
}

/**
 * Add a launch config to .vscode/launch.json file. Create the file if it doesn't exist.
 *
 * @param rootFolder - the workspace root folder.
 * @param options - options to create launch config.
 * @param fs - optional, the memfs editor instance.
 * @returns void.
 */
export async function addFioriElementsLaunchConfig(
    rootFolder: string,
    options: FioriOptions,
    fs?: Editor
): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchConfig = await getLaunchConfigFile(rootFolder, fs);
    if (launchConfig) {
        const fioriLaunchConfig = createFioriLaunchConfig(rootFolder, options);
        await addLaunchConfig(launchConfig, fioriLaunchConfig, fs);
    } else {
        await createLaunchConfigFile(rootFolder, options, fs);
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
        mergedArgs = mergedArgs.concat(parsedOldArgs['_'] as string[]);

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
 * @param callback - function to be executed on the object property.
 * @param initialPath - intial {@linkcode JSONPath} of the object to be traversed.
 * @param fs - optional, the memfs editor instance.
 * @returns void.
 */
export async function traverseAndModifyObject(
    obj: any,
    filePath: string,
    originalJSON: Node | undefined,
    callback: (
        config: configType,
        filePath: string,
        jsonPath: JSONPath,
        options?: ModificationOptions,
        fs?: Editor
    ) => Promise<void>,
    initialPath: JSONPath = [],
    fs?: Editor
): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
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
 * @param fs - optional, the memfs editor instance.
 * @returns void.
 */
async function processArray(
    arr: any[],
    filePath: string,
    originalJSON: Node | undefined,
    callback: (
        config: configType,
        filePath: string,
        jsonPath: JSONPath,
        options?: ModificationOptions,
        fs?: Editor
    ) => Promise<void>,
    currentPath: JSONPath,
    originalLength: number,
    fs?: Editor
): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
    const maxLength = Math.max(arr.length, originalLength);
    for (let i = 0, j = maxLength; i < maxLength; i++) {
        if (typeof arr[i] === 'object') {
            await traverseAndModifyObject(arr[i], filePath, originalJSON, callback, [...currentPath, i]);
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
 * @param fs - optional, the memfs editor instance.
 * @returns void.
 */
async function processObject(
    obj: any,
    filePath: string,
    originalJSON: Node | undefined,
    callback: (
        config: configType,
        filePath: string,
        jsonPath: JSONPath,
        options?: ModificationOptions,
        fs?: Editor
    ) => Promise<void>,
    currentPath: JSONPath,
    originalLength: number,
    node: Node | undefined,
    fs?: Editor
): Promise<void> {
    const length = Object.keys(obj).length;
    if (length >= originalLength) {
        await traverseAndModifyObject(obj, filePath, originalJSON, callback, currentPath, fs);
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
 * Updates then launch config in .vscode/launch.json file. If options are passed then updates otherwise - deletes.
 *
 * @param rootFolder - the project root folder.
 * @param index - index of the launch config.
 * @param options - optional if update is required, options to update to.
 * @param fs - optional, the memfs editor instance.
 * @returns void.
 */
export async function updateFioriElementsLaunchConfig(
    rootFolder: string,
    index: number,
    options?: FioriOptions,
    fs?: Editor
): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchConfigPath = await getLaunchConfigFile(rootFolder, fs);
    if (launchConfigPath) {
        const jsonString = fs.read(launchConfigPath);
        const launchJson = parse(jsonString) as LaunchJSON;
        if (options && jsonString) {
            // update
            const jsonTree = parseTree(jsonString);
            const fioriLaunchConfig = createFioriLaunchConfig(rootFolder, options);
            const oldArgs = launchJson.configurations[index].args;
            fioriLaunchConfig.args = mergeArgs(fioriLaunchConfig.args, oldArgs);
            await traverseAndModifyObject(
                fioriLaunchConfig,
                launchConfigPath,
                jsonTree,
                updateLaunchJSON,
                ['configurations', index],
                fs
            );
        } else {
            // delete
            await updateLaunchJSON(undefined, launchConfigPath, ['configurations', index], undefined, fs);
        }
    }
}
