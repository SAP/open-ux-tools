import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import { createFioriLaunchConfig, launchConfigFile } from './common';
import type { FioriOptions } from '../types';
import type { Editor } from 'mem-fs-editor';

/**
 * Creates a new launch.json file. If exists, does nothing.
 *
 * @param rootFolder - workspace root folder.
 * @param fioriOptions - optional, fiori options of config to add.
 * @param fs - optional, the memfs editor instance.
 * @returns parsed arguments.
 */
export async function createLaunchConfigFile(
    rootFolder: string,
    fioriOptions?: FioriOptions,
    fs?: Editor
): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
    const configurations = fioriOptions ? [createFioriLaunchConfig(rootFolder, fioriOptions)] : [];
    const launchConfigDirectory = join(rootFolder, DirName.VSCode);
    const launchConfigFilePath = join(launchConfigDirectory, launchConfigFile);
    await fs.write(launchConfigFilePath, JSON.stringify({ version: '0.2.0', configurations }, null, 4));
}
