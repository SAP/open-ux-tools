import { join } from 'path';
import * as util from 'util';
import { readFileSync } from 'fs';
import { exec } from 'child_process';
import type { IChildLogger } from '@vscode-logging/logger';

import type { Package } from '@sap-ux/project-access';

import type { AdpGeneratorOptions } from '../app';

/**
 * Reads the package.json of the current package.
 *
 * @returns {Package} Package.json of the current package.
 */
export function getPackageInfo(): Package {
    return JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
}

/**
 * Installs dependencies in the project directory.
 *
 * @param {string} projectPath - The project directory.
 */
export async function installDependencies(projectPath: string): Promise<void> {
    const execAsync = util.promisify(exec);

    try {
        await execAsync(`cd ${projectPath} && npm i`);
    } catch (error) {
        throw new Error('Installation of dependencies failed.');
    }
}

/**
 * Sets the header title in the AppWizard UI, if the `setHeaderTitle` method is available.
 * This helps users identify the generator and its version in the Yeoman UI interface.
 *
 * @param {AdpGeneratorOptions} opts - The generator options, potentially including the AppWizard instance.
 * @param {IChildLogger} logger - Logger instance used for logging any errors that occur during execution.
 */
export function setHeaderTitle(opts: AdpGeneratorOptions, logger: IChildLogger): void {
    try {
        if (typeof opts?.appWizard?.setHeaderTitle === 'function') {
            const { name = '', version = '', displayName = '' } = getPackageInfo();
            if (name && version) {
                opts.appWizard.setHeaderTitle((displayName as string) || name, `${name}@${version}`);
            }
        }
    } catch (e) {
        logger.error(`An error occurred while trying to set '@sap-ux/generator-adp' header: ${e.message}`);
    }
}
