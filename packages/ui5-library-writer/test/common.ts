import { dirname, join } from 'path';
import { exec as execCP } from 'child_process';
import { promisify } from 'util';
import type { UI5LibConfig } from '../src/types';
import type { Editor } from 'mem-fs-editor';

import { gte } from 'semver';

export const ui5LtsVersion_1_71 = '1.71.0';
export const ui5LtsVersion_1_120 = '1.120.0';

/**
 * Compares two UI5 versions to determine if the first is greater than or equal to the second.
 *
 * @param {string} ui5VersionA - The first UI5 version to compare.
 * @param {string} ui5VersionB - The second UI5 version to compare.
 * @returns {boolean} - True if the first version is greater than or equal to the second, false otherwise.
 */
export function compareUI5VersionGte(ui5VersionA: string, ui5VersionB: string): boolean {
    if (ui5VersionA === '') {
        // latest version
        return true;
    } else {
        return gte(ui5VersionA, ui5VersionB, { loose: true });
    }
}

const exec = promisify(execCP);

export const testOutputDir = join(__dirname, '/test-output');

export const debug = prepareDebug();

export function prepareDebug(): { enabled: boolean; debugFull: boolean } {
    const debug = !!process.env['UX_DEBUG'];
    const debugFull = !!process.env['UX_DEBUG_FULL'];
    if (debug) {
        console.log(testOutputDir);
    }
    return { enabled: debug, debugFull };
}

export const projectChecks = async (rootPath: string, config: UI5LibConfig, debugFull = false): Promise<void> => {
    // Do additional checks on generated projects
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    let npmResult;
    try {
        if (debugFull) {
            if (config.typescript) {
                // Do npm install
                npmResult = await exec(`${npm} install`, { cwd: rootPath });

                console.log('stdout:', npmResult.stdout);
                console.log('stderr:', npmResult.stderr);

                // run checks on the project

                // Check TS Types
                npmResult = await exec(`${npm} run ts-typecheck`, { cwd: rootPath });
                console.log('stdout:', npmResult.stdout);
                console.log('stderr:', npmResult.stderr);
                // Check Eslint
                npmResult = await exec(`${npm} run lint`, { cwd: rootPath });
                console.log('stdout:', npmResult.stdout);
                console.log('stderr:', npmResult.stderr);
            }

            if (config.frameworkVersion && compareUI5VersionGte(config.frameworkVersion, ui5LtsVersion_1_120)) {
                // UI5 linter for UI5 1.120.0 and above
                npmResult = await exec(`${npx} --yes @ui5/linter@latest`, { cwd: rootPath });
                console.log('stdout:', npmResult.stdout);
                console.log('stderr:', npmResult.stderr);
            }
        }
    } catch (error) {
        console.log('stdout:', error?.stdout);
        console.log('stderr:', error?.stderr);
        expect(error).toBeUndefined();
    }
};

export const updatePackageJSONDependencyToUseLocalPath = async (rootPath: string, fs: Editor): Promise<void> => {
    const packagePath = join(rootPath, 'package.json');
    const packageJson = fs.readJSON(packagePath) as any;
    if (packageJson?.devDependencies?.['@sap-ux/eslint-plugin-fiori-tools']) {
        packageJson.devDependencies['@sap-ux/eslint-plugin-fiori-tools'] = dirname(
            require.resolve('@sap-ux/eslint-plugin-fiori-tools/package.json')
        );
    }
    fs.writeJSON(packagePath, packageJson);
};
