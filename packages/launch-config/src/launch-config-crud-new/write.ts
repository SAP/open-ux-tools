import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import { LAUNCH_JSON_FILE } from '../types';
import type { FioriOptions, LaunchJSON } from '../types';
import type { Editor } from 'mem-fs-editor';
import { generateNewFioriLaunchConfig } from './utils';
import type { JSONPath, ModificationOptions } from 'jsonc-parser';
import { applyEdits, modify, parse } from 'jsonc-parser';

/**
 * Enhance or create the launch.json file with launch config.
 *
 * @param rootFolder - workspace root folder.
 * @param fioriOptions - options for the new launch config.
 * @param fs - optional, the memfs editor instance.
 * @returns void.
 */
export async function enhanceLaunchJSON(rootFolder: string, fioriOptions: FioriOptions, fs?: Editor): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
    let launchJSONContent;
    const launchJSONPath = join(rootFolder, DirName.VSCode, LAUNCH_JSON_FILE);
    if (fs.exists(launchJSONPath)) {
        // launch.json exists, enhance existing file with new config or update/delete existing
        const launchConfig = generateNewFioriLaunchConfig(rootFolder, fioriOptions);
        const launchJsonString = fs.read(launchJSONPath);
        const launchJson = parse(launchJsonString) as LaunchJSON;
        launchJSONContent = await updateLaunchJSON(
            launchConfig,
            launchJSONPath,
            ['configurations', launchJson.configurations.length + 1],
            {
                isArrayInsertion: true
            },
            fs
        );
    } else {
        // launch.json is missing, new file with new config
        const configurations = generateNewFioriLaunchConfig(rootFolder, fioriOptions);
        launchJSONContent = { version: '0.2.0', configurations: [configurations] };
    }
    fs.write(launchJSONPath, JSON.stringify(launchJSONContent, null, 4));
}

/**
 * Modifies and returns modified content in 'launch.json'.
 *
 * @param content content to be added to the JSON file at location specified by JSONPath. If undefined, property will be deleted.
 * @param filePath path to the json file.
 * @param jsonPath The {@linkcode JSONPath} of the value to change. The path represents either to the document root, a property or an array item.
 * @param options Options {@linkcode ModificationOptions} used by {@linkcode modify} when computing the modification edit operations. Default formattingOptions are used if not provided.
 * @param fs - optional, the memfs editor instance.
 * @returns modified launch.json object.
 */
export async function updateLaunchJSON(
    content: object | string | number | undefined,
    filePath: string,
    jsonPath: JSONPath,
    options: ModificationOptions = {},
    fs?: Editor
): Promise<LaunchJSON> {
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
    return parse(updated);
}
