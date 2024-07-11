import type { Package } from '@sap-ux/project-access';
import { FileName } from '@sap-ux/project-access';
import { join } from 'path';
import type { LaunchConfig, LaunchConfigEnv } from '../types';
import { Arguments } from '../types';
import { getIndexOfArgument } from './utils';
import { parse } from 'jsonc-parser';
import type { Editor } from 'mem-fs-editor';
import { promises as fs } from 'fs';

const RUN_SCRIPT = 'run-script';

/**
 * Moves arguments from older launch configurations (like '--ui5 1.1.1' and '--ui5Uri uri.com') to environment variables.
 *
 * @param launchConfig - launch config.
 * @returns parsed arguments.
 */
function moveOldArgsToEnv(launchConfig: LaunchConfig): LaunchConfig {
    if (launchConfig.args) {
        // old format --ui5Uri https://ui5.sap.com --ui5 1.90.7
        const ui5Index = getIndexOfArgument(launchConfig.args, '--ui5');
        if (ui5Index !== -1) {
            const ui5ArgParts = launchConfig.args[ui5Index].split(' ');
            const ui5 = ui5ArgParts.indexOf('--ui5');
            const ui5Uri = ui5ArgParts.indexOf('--ui5Uri');
            if (ui5 !== -1 && ui5Uri !== -1) {
                launchConfig.env['FIORI_TOOLS_UI5_VERSION'] = ui5ArgParts[ui5 + 1];
                launchConfig.env['FIORI_TOOLS_UI5_URI'] = ui5ArgParts[ui5Uri + 1];
                launchConfig.args.splice(ui5Index, 1);
            }
        }
        // old format [--backendConfig, [{path:'', url:''}] ]
        const backendIndex = getIndexOfArgument(launchConfig.args, '--backendConfig');
        if (backendIndex !== -1) {
            launchConfig.env['FIORI_TOOLS_BACKEND_CONFIG'] = launchConfig.args[backendIndex + 1];
            // delete prefix and value itself
            launchConfig.args.splice(backendIndex, 2);
        }
        // remove unnecessary -- prefix that was used before in arguments definition
        const prefixIndex = getIndexOfArgument(launchConfig.args, '--');
        if (prefixIndex !== -1) {
            launchConfig.args.splice(prefixIndex, 1);
        }
    }
    return launchConfig;
}

/**
 * Adds the '--open' and '--config' arguments to the args section of a launch configuration.
 *
 * @param scriptArgs list of cli arguments
 * @returns arguments in args section.
 */
function addArgs(scriptArgs: string[]) {
    const args: string[] = [];
    const openIndex =
        scriptArgs.indexOf(Arguments.Open) !== -1 ? scriptArgs.indexOf(Arguments.Open) : scriptArgs.indexOf('-o');
    const configIndex =
        scriptArgs.indexOf(Arguments.Config) !== -1 ? scriptArgs.indexOf(Arguments.Config) : scriptArgs.indexOf('-c');
    if (openIndex !== -1) {
        args.push(Arguments.Open, scriptArgs[openIndex + 1]);
    }
    if (configIndex !== -1) {
        args.push(Arguments.Config, scriptArgs[configIndex + 1]);
    }

    return args;
}

/**
 * Converts start scripts from older launch configurations to 'fiori run'.
 *
 * @param launchConfig launch config.
 * @param scripts scrips configuration.
 * @param runScriptName name of the start script.
 * @returns updated launch config.
 */
function convertRunScriptToFioriRun(launchConfig: LaunchConfig, scripts: object, runScriptName?: string): LaunchConfig {
    launchConfig.runtimeArgs = ['fiori', 'run'];
    // parse package.json and try to find start file for fiori run command
    Object.entries(scripts).forEach(([key, value]) => {
        // read script from package.json scripts
        if (key === runScriptName) {
            const scriptParts = value.split(/\s+/);
            if (scriptParts.includes('fiori') && scriptParts.includes('run')) {
                launchConfig.args = addArgs(scriptParts);
            }
        }
    });
    if (launchConfig.runtimeExecutable === 'npm' && launchConfig.windows?.runtimeExecutable === 'npm.cmd') {
        launchConfig.runtimeExecutable = 'npx';
        launchConfig.windows.runtimeExecutable = 'npx.cmd';
    }
    if (launchConfig.windows?.args) {
        // we do not use windows specific args in fiori run
        delete launchConfig.windows.args;
    }
    return launchConfig;
}

/**
 * Returns true if launch config uses run scripts.
 *
 * @param runtimeArgs - launch config runtime arguments.
 * @returns whether launch configuration uses 'run-script'.
 */
function isRunScriptUsed(runtimeArgs: string[]): boolean {
    return runtimeArgs?.includes(RUN_SCRIPT);
}

/**
 * Returns the project root from env[run.config], otherwise undefined.
 *
 * @param envConfig env section of the run configuration.
 * @returns project root.
 */
function getProjectRootFromEnv(envConfig: LaunchConfigEnv): string | undefined {
    if (envConfig) {
        if (envConfig['run.config']) {
            return JSON.parse(envConfig['run.config']).runnableId;
        }
    }
    return undefined;
}

/**
 * Modifies (if possible) existing launch config that uses 'run script' to use fiori run cli.
 *
 * @param launchConfig - existing launch config.
 * @param projectRoot - project root.
 * @param memFs - optional, the memfs editor instance.
 * @returns modified launch config.
 */
export async function convertOldLaunchConfigToFioriRun(
    launchConfig: LaunchConfig,
    projectRoot?: string,
    memFs?: Editor
): Promise<LaunchConfig> {
    // we only convert configs that uses run-script
    if (isRunScriptUsed(launchConfig.runtimeArgs)) {
        const runScriptName = launchConfig.runtimeArgs[1];
        // read projec root from parameter or else from actual launch config
        const projectRootPath = projectRoot ?? getProjectRootFromEnv(launchConfig.env);
        // check if there is already args defined for UI5 and backend config
        moveOldArgsToEnv(launchConfig);
        if (projectRootPath) {
            const pckJsonPath = join(projectRootPath, FileName.Package);
            let packageJsonString;
            if (memFs) {
                packageJsonString = memFs.read(pckJsonPath);
            } else {
                packageJsonString = await fs.readFile(pckJsonPath, { encoding: 'utf8' });
            }
            const packageJson = parse(packageJsonString) as Package;
            const scripts = packageJson.scripts;
            if (scripts) {
                convertRunScriptToFioriRun(launchConfig, scripts, runScriptName);
            }
        }
    }
    return launchConfig;
}
