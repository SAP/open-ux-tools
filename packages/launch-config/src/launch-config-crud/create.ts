import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join, basename } from 'path';
import { DirName } from '@sap-ux/project-access';
import { LAUNCH_JSON_FILE } from '../types';
import type { FioriOptions, LaunchJSON, UpdateWorkspaceFolderOptions, DebugOptions, LaunchConfig } from '../types';
import type { Editor } from 'mem-fs-editor';
import { generateNewFioriLaunchConfig } from './utils';
import { updateLaunchJSON } from './writer';
import { parse } from 'jsonc-parser';
import { handleWorkspaceConfig } from '../debug-config/workspaceManager';
import { configureLaunchJsonFile } from '../debug-config/config';
import type { Logger } from '@sap-ux/logger';
import { t } from '../i18n';

/**
 * Writes the `launch.json` file with the specified configurations. If the file already exists, it will be overwritten.
 *
 * @param {Editor} fs - The file system editor used to write the `launch.json` file.
 * @param {string} launchJSONPath - The full path to the `launch.json` file.
 * @param {LaunchConfig[]} configurations - An array of launch configurations to be included in the `launch.json` file.
 * @returns {void}
 */
function writeLaunchJsonFile(fs: Editor, launchJSONPath: string, configurations: LaunchConfig[]): void {
    const newLaunchJSONContent = { version: '0.2.0', configurations };
    fs.write(launchJSONPath, JSON.stringify(newLaunchJSONContent, null, 4));
}

/**
 * Handles the case where there are no debug options provided. It either enhances an existing `launch.json`
 * file with a new launch configuration or creates a new `launch.json` file with the initial configuration.
 *
 * @param {string} rootFolder - The root directory where the `launch.json` file is located or will be created.
 * @param {FioriOptions} fioriOptions - The options used to generate the new launch configuration for the `launch.json` file.
 * @param {Editor} fs - The file system editor used to read and write the `launch.json` file.
 * @returns {Promise<Editor>} - A promise that resolves with the file system editor after the `launch.json` file has been
 *     updated or created.
 */
async function handleNoDebugOptions(rootFolder: string, fioriOptions: FioriOptions, fs: Editor): Promise<Editor> {
    const launchJsonWritePath = join(rootFolder, DirName.VSCode, LAUNCH_JSON_FILE);
    if (fs.exists(launchJsonWritePath)) {
        // launch.json exists, enhance existing file with new config
        const launchConfig = generateNewFioriLaunchConfig(rootFolder, fioriOptions);
        const launchJsonString = fs.read(launchJsonWritePath);
        const launchJson = parse(launchJsonString) as LaunchJSON;
        await updateLaunchJSON(
            launchConfig,
            launchJsonWritePath,
            ['configurations', launchJson.configurations.length + 1],
            {
                isArrayInsertion: true
            },
            fs
        );
        return fs;
    }
    // launch.json is missing, new file with new config
    const configurations = [generateNewFioriLaunchConfig(rootFolder, fioriOptions)];
    writeLaunchJsonFile(fs, launchJsonWritePath, configurations);
    return fs;
}

/**
 * Updates or replaces the `launch.json` file depending on whether the file should be replaced
 * or enhanced with additional configurations. If `replaceWithNew` is true, the entire file
 * content is replaced with the new configurations. Otherwise, the configurations are added
 * to the existing `launch.json`.
 *
 * @param {Editor} fs - The file system editor to read and write the `launch.json` file.
 * @param {string} launchJSONPath - The path to the existing `launch.json` file.
 * @param {LaunchConfig[]} configurations - An array of new launch configurations to be added or replaced.
 * @param {boolean} replaceWithNew - A flag indicating whether to replace the existing `launch.json`
 *     with new configurations (`true`) or append to the existing ones (`false`).
 * @returns {Promise<void>} - A promise that resolves once the `launch.json` file has been updated or replaced.
 */
async function handleExistingLaunchJson(
    fs: Editor,
    launchJSONPath: string,
    configurations: LaunchConfig[],
    replaceWithNew: boolean = false
): Promise<void> {
    const launchJsonString = fs.read(launchJSONPath);
    const launchJson = parse(launchJsonString) as LaunchJSON;
    if (replaceWithNew) {
        // replaceWithNew is needed in cases where launch config exists in
        // `.vscode` but isn't added to the workspace. If `replaceWithNew` is `true`, it indicates that the app is not
        // in the workspace, so the entire `launch.json` and replaced since launch config is then generated in app folder.
        writeLaunchJsonFile(fs, launchJSONPath, configurations);
    } else {
        for (const config of configurations) {
            await updateLaunchJSON(
                config,
                launchJSONPath,
                ['configurations', launchJson.configurations.length + 1],
                {
                    isArrayInsertion: true
                },
                fs
            );
        }
    }
}

/**
 * Updates the workspace folders in VSCode if the update options are provided.
 *
 * @param {UpdateWorkspaceFolderOptions} updateWorkspaceFolders - The options for updating workspace folders.
 */
export function updateWorkspaceFoldersIfNeeded(updateWorkspaceFolders?: UpdateWorkspaceFolderOptions): void {
    if (updateWorkspaceFolders) {
        const { uri, vscode, projectName } = updateWorkspaceFolders;
        if (uri && vscode) {
            const currentWorkspaceFolders = vscode.workspace.workspaceFolders || [];
            vscode.workspace.updateWorkspaceFolders(currentWorkspaceFolders.length, undefined, {
                name: projectName,
                uri
            });
        }
    }
}

/**
 * Handles the creation and configuration of the `launch.json` file based on debug options.
 * This function processes workspace configuration, updates the `launch.json` file if it exists,
 * and creates it if it does not. Additionally, it updates workspace folders if applicable.
 *
 * @param rootFolder - root folder.
 * @param {Editor} fs - The file system editor to read and write the `launch.json` file.
 * @param {DebugOptions} debugOptions - Debug configuration options that dictate how the `launch.json`
 *     should be generated and what commands should be logged.
 * @param {boolean} enableVSCodeReload - A flag indicating whether the workspace should be reloaded in VS Code.
 * @param {Logger} logger - Logger instance for logging information or warnings.
 * @returns {Promise<Editor>} - Returns the file system editor after potentially modifying the workspace
 *     and updating or creating the `launch.json` file.
 */
async function handleDebugOptions(
    rootFolder: string,
    fs: Editor,
    debugOptions: DebugOptions,
    enableVSCodeReload: boolean = true,
    logger?: Logger
): Promise<Editor> {
    const { launchJsonPath, workspaceFolderUri, cwd, appNotInWorkspace } = handleWorkspaceConfig(
        rootFolder,
        debugOptions
    );
    const configurations = configureLaunchJsonFile(rootFolder, cwd, debugOptions).configurations;

    // If the `addStartCmd` option is set to `true`, the `npm start` command is used to start the server.
    const npmCommand = debugOptions.addStartCmd ? 'start' : 'run start-mock';
    logger?.info(
        t('info.startServerMessage', {
            folder: basename(rootFolder),
            npmCommand
        })
    );
    const launchJsonWritePath = join(launchJsonPath, DirName.VSCode, LAUNCH_JSON_FILE);
    if (fs.exists(launchJsonWritePath)) {
        await handleExistingLaunchJson(fs, launchJsonWritePath, configurations, appNotInWorkspace);
    } else {
        writeLaunchJsonFile(fs, launchJsonWritePath, configurations);
    }

    // Conditionally update workspace folders based on the enableVSCodeReload flag
    if (enableVSCodeReload) {
        // The `workspaceFolderUri` is a URI obtained from VS Code that specifies the path to the workspace folder.
        // This URI is populated when a reload of the workspace is required. It allows us to identify and update
        // the workspace folder correctly within VS Code.
        const updateWorkspaceFolders = workspaceFolderUri
        ? ({
            uri: workspaceFolderUri,
            projectName: basename(rootFolder),
            vscode: debugOptions.vscode
        } as UpdateWorkspaceFolderOptions)
        : undefined;
        updateWorkspaceFoldersIfNeeded(updateWorkspaceFolders);
    }
    return fs;
}

/**
 * Enhance or create the launch.json file with new launch config.
 *
 * @param rootFolder - workspace root folder.
 * @param fioriOptions - options for the new launch config.
 * @param fs - optional, the memfs editor instance.
 * @param logger - optional, the logger instance.
 * @returns memfs editor instance.
 */
export async function createLaunchConfig(
    rootFolder: string,
    fioriOptions: FioriOptions,
    fs?: Editor,
    logger?: Logger
): Promise<Editor> {
    fs = fs ?? create(createStorage());
    const debugOptions = fioriOptions.debugOptions;
    if (!debugOptions) {
        return await handleNoDebugOptions(rootFolder, fioriOptions, fs);
    }
    if (!debugOptions.vscode) {
        return fs;
    }
    return await handleDebugOptions(rootFolder, fs, debugOptions, fioriOptions.enableVSCodeReload, logger);
}
