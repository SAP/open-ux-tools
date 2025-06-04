import { join } from 'path';
import * as util from 'util';
import { readFileSync } from 'fs';
import { exec } from 'child_process';

import type { Package } from '@sap-ux/project-access';

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
