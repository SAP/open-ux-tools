import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import { LAUNCH_JSON_FILE } from '../types';
import type { FioriOptions, LaunchJSON, LaunchConfig } from '../types';
import type { Editor } from 'mem-fs-editor';
import { generateNewFioriLaunchConfig } from './utils';
import { parse } from 'jsonc-parser';
import { updateLaunchJSON } from './writer';

/**
 * Enhance or create the launch.json file with new launch config.
 *
 * @param rootFolder - workspace root folder.
 * @param fioriOptions - options for the new launch config.
 * @param fs - optional, the memfs editor instance.
 * @returns memfs editor instance.
 */
// export async function createLaunchConfig(rootFolder: string, fioriOptions: FioriOptions, fs?: Editor): Promise<Editor> {
//     if (!fs) {
//         fs = create(createStorage());
//     }
//     const launchJSONPath = join(rootFolder, DirName.VSCode, LAUNCH_JSON_FILE);
//     if (fs.exists(launchJSONPath)) {
//         // launch.json exists, enhance existing file with new config
//         const launchConfig = generateNewFioriLaunchConfig(rootFolder, fioriOptions);
//         const launchJsonString = fs.read(launchJSONPath);
//         const launchJson = parse(launchJsonString) as LaunchJSON;
//         await updateLaunchJSON(
//             launchConfig,
//             launchJSONPath,
//             ['configurations', launchJson.configurations.length + 1],
//             {
//                 isArrayInsertion: true
//             },
//             fs
//         );
//     } else {
//         // launch.json is missing, new file with new config
//         const configurations = generateNewFioriLaunchConfig(rootFolder, fioriOptions);
//         const newLaunchJSONContent = { version: '0.2.0', configurations: [configurations] };
//         fs.write(launchJSONPath, JSON.stringify(newLaunchJSONContent, null, 4));
//     }
//     return fs;
// }

async function updateLaunchConfig(
    fs: Editor, 
    launchJSONPath: string, 
    fioriOptions: FioriOptions, 
    launchConfig: object
) {
    const launchJsonString = fs.read(launchJSONPath);
    const launchJson = parse(launchJsonString) as LaunchJSON;
    const configsToAdd = fioriOptions.debugFileContents?.configurations || [launchConfig];
    for (const config of configsToAdd) {
        await updateLaunchJSON(
            config,
            launchJSONPath,
            ['configurations', launchJson.configurations.length + 1],
            { isArrayInsertion: true },
            fs
        );
    }
}

async function createNewLaunchConfig(
    fs: Editor, 
    launchJSONPath: string, 
    fioriOptions: FioriOptions, 
    launchConfig: object
) {
    const configurations = fioriOptions.debugFileContents?.configurations || [launchConfig] as LaunchConfig[];
    const newLaunchJSONContent: LaunchJSON = { version: '0.2.0', configurations };

    fs.write(launchJSONPath, JSON.stringify(newLaunchJSONContent, null, 4));
}


export async function createLaunchConfig(rootFolder: string, fioriOptions: FioriOptions, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchJSONPath = join(rootFolder, DirName.VSCode, LAUNCH_JSON_FILE);
    const launchConfig = generateNewFioriLaunchConfig(rootFolder, fioriOptions);
    if (fs.exists(launchJSONPath)) {
        await updateLaunchConfig(fs, launchJSONPath, fioriOptions, launchConfig);
    } else {
        await createNewLaunchConfig(fs, launchJSONPath, fioriOptions, launchConfig);
    }
    return fs;
}