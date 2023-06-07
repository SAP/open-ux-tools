import { join } from 'path';
import { exec as execCP } from 'child_process';
import { promisify } from 'util';
import type { UI5LibConfig } from '../src/types';

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
    if (debugFull && config.typescript) {
        // Do additonal checks on generated projects
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        let npmResult;
        try {
            // Do npm install
            npmResult = await exec(`${npm} install`, { cwd: rootPath });

            console.log('stdout:', npmResult.stdout);
            console.log('stderr:', npmResult.stderr);

            // run checks on the project
            if (config.typescript) {
                // Check TS Types
                npmResult = await exec(`${npm} run ts-typecheck`, { cwd: rootPath });
                console.log('stdout:', npmResult.stdout);
                console.log('stderr:', npmResult.stderr);
                // Check Eslint
                npmResult = await exec(`${npm} run lint`, { cwd: rootPath });
                console.log('stdout:', npmResult.stdout);
                console.log('stderr:', npmResult.stderr);
            }
        } catch (error) {
            console.log('stdout:', error?.stdout);
            console.log('stderr:', error?.stderr);
            expect(error).toBeUndefined();
        }
    }
};
