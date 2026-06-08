import { dirname, join } from 'node:path';
import * as util from 'node:util';
import { readFileSync } from 'node:fs';
import { exec } from 'node:child_process';

import type { Package } from '@sap-ux/project-access';

/**
 * Resolves the directory of this source/compiled file in a way that works
 * under both the published CommonJS build (where `__dirname` is provided by
 * Node) and ts-jest's ESM test transform (where it isn't, so we fall back
 * to the source path derived from `__filename`).
 *
 * @returns {string} Absolute directory path of this module at runtime.
 */
function resolveModuleDir(): string {
    if (typeof __dirname !== 'undefined') {
        return __dirname;
    }
    if (typeof __filename !== 'undefined') {
        return dirname(__filename);
    }
    return process.cwd();
}

/**
 * Reads the package.json of the current package.
 *
 * @returns {Package} Package.json of the current package.
 */
export function getPackageInfo(): Package {
    return JSON.parse(readFileSync(join(resolveModuleDir(), '../../package.json'), 'utf-8'));
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
