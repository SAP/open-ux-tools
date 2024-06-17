import { join } from 'path';
import { DirName, createDirectory, fileExists, updateFile } from '@sap-ux/project-access';
import type { FioriOptions } from '@sap/ux-launch-config-types';
import { createFioriLaunchConfig, launchConfigFile } from './common';

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
        await createDirectory(launchConfigDirectory);
    }
    const launchConfigFilePath = join(launchConfigDirectory, launchConfigFile);
    if (!(await fileExists(launchConfigFilePath))) {
        await updateFile(
            launchConfigFilePath,
            JSON.stringify(
                {
                    version: '0.2.0',
                    configurations
                },
                null,
                4
            )
        );
    }
}
