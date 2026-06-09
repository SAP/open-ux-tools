import { join } from 'node:path';
import * as util from 'node:util';
import { readFileSync } from 'node:fs';
import { exec } from 'node:child_process';

import type { Package } from '@sap-ux/project-access';

/**
 * Reads the package.json of the current package.
 *
 * Uses Node's CJS `__dirname` global at runtime (the package compiles to
 * CommonJS — see tsconfig.json). Under ts-jest's ESM test transform
 * `__dirname` is undefined and we fall back to `process.cwd()`, which
 * jest sets to the package root — so the upward walk to `package.json`
 * still lands on the right file.
 *
 * @returns {Package} Package.json of the current package.
 */
export function getPackageInfo(): Package {
    const moduleDir = typeof __dirname === 'undefined' ? process.cwd() : __dirname;
    return JSON.parse(readFileSync(join(moduleDir, '../../package.json'), 'utf-8'));
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
