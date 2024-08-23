import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import { LAUNCH_JSON_FILE } from '../types';
import type { Editor } from 'mem-fs-editor';
import { updateLaunchJSON } from './writer';

/**
 * Deletes existing launch config in launch.json file.
 *
 * @param rootFolder - workspace root folder.
 * @param index - index of the launch config to edit.
 * @param fs - optional, the memfs editor instance.
 * @returns memfs editor instance.
 */
export async function deleteLaunchConfig(rootFolder: string, index: number, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchJSONPath = join(rootFolder, DirName.VSCode, LAUNCH_JSON_FILE);
    if (fs.exists(launchJSONPath)) {
        // delete existing launch config
        await updateLaunchJSON(undefined, launchJSONPath, ['configurations', index], undefined, fs);
    }
    return fs;
}
