import type { PackageInfo } from '@sap-ux/nodejs-utils';

import { promisify } from 'util';
import { exec as execAsync } from 'child_process';
import { findInstalledPackages } from '@sap-ux/nodejs-utils';

/**
 * Checks if the Fiori generator is installed.
 *
 * @param generatorVersion Required version of the generator.
 * @throws Error if the generator is not installed or does not meet the version requirement.
 */
export async function checkIfGeneratorInstalled(generatorVersion = '1.18.5'): Promise<void> {
    const generatorName = '@sap/generator-fiori';
    const packages: PackageInfo[] = await findInstalledPackages(generatorName, { minVersion: generatorVersion });
    if (packages?.length < 1) {
        throw new Error(
            `Fiori generator not found. Please install the Fiori generator >=${generatorVersion} with 'npm install -g ${generatorName}' and retry this call`
        );
    }
}

export const runCmd = promisify(execAsync);
