import { promises as fs } from 'fs';
import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import { createFioriLaunchConfig, launchConfigFile } from './common';
import type { FioriOptions } from '../types';
import { fileExists } from './read';

/**
 * Creates a new launch.json file. If exists, does nothing.
 *
 * @param rootFolder - workspace root folder.
 * @param fioriOptions - optional, fiori options of config to add
 * @returns parsed arguments.
 */
export async function createLaunchConfigFile(rootFolder: string, fioriOptions?: FioriOptions): Promise<void> {
    const configurations = fioriOptions ? [createFioriLaunchConfig(rootFolder, fioriOptions)] : [];
    const launchConfigDirectory = join(rootFolder, DirName.VSCode);
    if (!(await fileExists(launchConfigDirectory))) {
        await fs.mkdir(launchConfigDirectory);
    }
    const launchConfigFilePath = join(launchConfigDirectory, launchConfigFile);
    if (!(await fileExists(launchConfigFilePath))) {
        await fs.writeFile(launchConfigFilePath, JSON.stringify({ version: '0.2.0', configurations }, null, 4));
    }
}
