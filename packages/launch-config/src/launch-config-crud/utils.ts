import { basename, join } from 'path';
import type { ODataVersion } from '@sap-ux/project-access';
import { FileName } from '@sap-ux/project-access';
import type { FioriOptions, LaunchConfig, LaunchConfigEnv } from '../types';
import { Arguments, FIORI_TOOLS_LAUNCH_CONFIG_HANDLER_ID } from '../types';
import { default as yargsParser } from 'yargs-parser';

/**
 * Returns the string array of 'args' required in the launch config.
 *
 * @param options - the externally exposed launch config options.
 * @returns launch config options.
 */
function getArgs(options: FioriOptions): string[] | undefined {
    const args = [];
    if (options.startFile) {
        const open = Arguments.Open;
        args.push(open, options.startFile);
    }

    if (options.useMockData && !options.ui5Local) {
        const config = Arguments.Config;
        args.push(config, FileName.Ui5MockYaml);
    }

    if (options.ui5Local) {
        const config = Arguments.Config;
        args.push(config, FileName.Ui5LocalYaml);

        if (options.ui5LocalVersion) {
            args.push(Arguments.FrameworkVersion, options.ui5LocalVersion);
        }
    }

    return args.length > 0 ? args : undefined;
}

/**
 * Returns index number from argument in array of arguments.
 *
 * @param args - array of argument strings.
 * @param arg - argument to find.
 * @returns launch config options.
 */
export function getIndexOfArgument(args: Array<string>, arg: string): number {
    const index = (element: string): boolean => element.includes(arg);
    // return -1 if argument is not in arguments array
    return args.findIndex(index);
}

/**
 * Merges the new and the existing cli arguments of a run configuration.
 *
 * @param newArgs new cli arguments specified in the run config wizard.
 * @param oldArgs existing cli arguments of a run configuration.
 * @returns merged launch config arguments.
 */
export function mergeArgs(newArgs: string[] | undefined, oldArgs: string[] | undefined): string[] {
    let mergedArgs: string[] = [];

    if (newArgs && oldArgs) {
        mergedArgs = mergedArgs.concat(newArgs);
        const parsedOldArgs = parseArguments(oldArgs);
        mergedArgs = mergedArgs.concat(parsedOldArgs['_'] as string[]);

        return mergedArgs;
    } else {
        return mergedArgs;
    }
}

/**
 * Returns the launch config object.
 *
 * @param name - name of the launch config.
 * @param cwd - working directory of the application to run with launch config.
 * @param runtimeArgs - arguments passed to the runtime executable.
 * @param args - JSON array of command-line arguments to pass to the application.
 * @param env - environment variables for the application.
 * @returns launch config object.
 */
function getLaunchConfig(
    name: string,
    cwd: string,
    runtimeArgs: string[],
    args: string[] | undefined,
    env: LaunchConfigEnv
): LaunchConfig {
    return {
        name,
        cwd,
        runtimeArgs,
        type: 'node',
        request: 'launch',
        runtimeExecutable: 'npx',
        args, // default arguments
        windows: {
            runtimeExecutable: `npx.cmd`
        },
        console: 'internalConsole',
        internalConsoleOptions: 'openOnSessionStart',
        outputCapture: 'std',
        env
    };
}

/**
 * Returns project root from Launch Configuration.
 *
 * @param workspaceRoot - workspace root folder.
 * @param cwd - Launch Configuration working directory folder.
 * @param env - Launch Configuration environment variable where runnableId is.
 * @returns project root.
 */
function getProjectRootFromLaunchConfig(workspaceRoot: string, cwd: string, env?: LaunchConfigEnv): string {
    // firstly check if there is env variable for project root
    if (env?.['run.config']) {
        return JSON.parse(env['run.config']).runnableId;
    }
    // case when workspaceRoot is in opened project
    if (!cwd || basename(workspaceRoot) === basename(cwd)) {
        return workspaceRoot;
    } else {
        return join(workspaceRoot, basename(cwd));
    }
}

/**
 * Returns Fiori Options from Launch Configuration object.
 *
 * @param launchConfig - Launch Configuration.
 * @param launchJSONRootPath - workspace root folder for Launch Configuration where .vscode/launch.json is.
 * @param oDataVersion - OData version of the application V2/V4.
 * @returns Fiori Options of the launch config.
 */
export function getFioriOptions(
    launchConfig: LaunchConfig,
    launchJSONRootPath: string,
    oDataVersion: ODataVersion
): FioriOptions {
    const projectRoot = getProjectRootFromLaunchConfig(launchJSONRootPath, launchConfig.cwd, launchConfig.env);
    let startFile;
    let isMockDataEnabled = false;
    let ui5Version;
    let ui5VersionUri;
    let ui5Local = false;
    let ui5LocalVersion;
    let backendConfigs;
    let urlParameters;
    // Do not display configurations which have different type than node
    let visible = launchConfig.type === 'node';
    if (launchConfig.env) {
        ui5Version = launchConfig.env.FIORI_TOOLS_UI5_VERSION;
        ui5VersionUri = launchConfig.env.FIORI_TOOLS_UI5_URI;
        urlParameters = launchConfig.env.FIORI_TOOLS_URL_PARAMS;

        if (launchConfig.env.FIORI_TOOLS_BACKEND_CONFIG) {
            backendConfigs = JSON.parse(launchConfig.env.FIORI_TOOLS_BACKEND_CONFIG);
        }
    }
    if (launchConfig.args && launchConfig.args.length > 0) {
        const parsedArguments = parseArguments(launchConfig.args);
        if (parsedArguments.open) {
            startFile = parsedArguments.open;
        }
        if (parsedArguments.config === FileName.Ui5MockYaml) {
            isMockDataEnabled = true;
        }
        if (parsedArguments.config === FileName.Ui5LocalYaml) {
            isMockDataEnabled = true;
            ui5Local = true;
            if (parsedArguments['framework-version']) {
                ui5LocalVersion = parsedArguments['framework-version'];
            }
        }
        const stringArguments = launchConfig.args.toString().toLowerCase();
        // filter configurations containing input:UI5MinVersion, this will be supported later
        visible = visible || stringArguments.indexOf('${input:') === -1;
    }
    return {
        name: launchConfig.name,
        projectRoot,
        oDataVersion,
        useMockData: isMockDataEnabled,
        ui5Version,
        ui5VersionUri,
        ui5Local,
        ui5LocalVersion,
        startFile,
        backendConfigs,
        urlParameters,
        visible
    };
}

/**
 * Generates a new launch config from passed Fiori options.
 *
 * @param rootFolder - workspace root folder.
 * @param options - the variable part of the launch config.
 * @returns launch config.
 */
export function generateNewFioriLaunchConfig(rootFolder: string, options: FioriOptions): LaunchConfig {
    const name = options.name;
    const projectRoot = options.projectRoot;
    let env = {
        'run.config': JSON.stringify({
            handlerId: FIORI_TOOLS_LAUNCH_CONFIG_HANDLER_ID,
            runnableId: projectRoot
        }),
        ...(options.backendConfigs && { FIORI_TOOLS_BACKEND_CONFIG: JSON.stringify(options.backendConfigs) }),
        ...(options.urlParameters && { FIORI_TOOLS_URL_PARAMS: options.urlParameters })
    };

    if (!options.ui5Local) {
        env = Object.assign(env, {
            FIORI_TOOLS_UI5_VERSION: options.ui5Version,
            FIORI_TOOLS_UI5_URI: options.ui5VersionUri
        });
    }
    // replace common path of the workspace and application path with "${workspaceFolder}"
    const cwd = projectRoot.replace(rootFolder, '${workspaceFolder}');
    // runtimeArgs for applications that supports fiori cli
    const runtimeArgs = ['fiori', 'run'];
    const args = getArgs(options);

    return getLaunchConfig(name, cwd, runtimeArgs, args, env);
}

/**
 * Parses the list of cli arguments.
 *
 * @param args list of cli arguments in array.
 * @returns parsed arguments.
 */
export function parseArguments(args: string[]): yargsParser.Arguments {
    return yargsParser(args, {
        alias: {
            open: ['o'],
            config: ['c']
        },
        string: ['config', 'open', 'framework-version'],
        configuration: {
            'strip-aliased': true,
            'camel-case-expansion': false,
            'unknown-options-as-args': true,
            'parse-numbers': false
        }
    });
}
