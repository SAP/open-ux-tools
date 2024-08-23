import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join, basename } from 'path';
import { DirName } from '@sap-ux/project-access';
import { LAUNCH_JSON_FILE } from '../types';
import type { FioriOptions, LaunchJSON, UpdateWorkspaceFolderOptions, DebugOptions } from '../types';
import type { Editor } from 'mem-fs-editor';
import { generateNewFioriLaunchConfig } from './utils';
import { updateLaunchJSON } from './writer';
import { parse } from 'jsonc-parser';
import { handleWorkspaceConfig } from '../debug-config/workspaceManager';
import { configureLaunchJsonFile } from '../debug-config/config';
import { homedir } from 'os';
import type { Logger } from '@sap-ux/logger';
import { DatasourceType } from '@sap-ux/odata-service-inquirer';
import { t } from '../i18n';

/**
 * Enhance or create the launch.json file with new launch config.
 *
 * @param rootFolder - workspace root folder.
 * @param fioriOptions - options for the new launch config.
 * @param fs - optional, the memfs editor instance.
 * @returns memfs editor instance.
 */
export async function createLaunchConfig(rootFolder: string, fioriOptions: FioriOptions, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const launchJSONPath = join(rootFolder, DirName.VSCode, LAUNCH_JSON_FILE);
    if (fs.exists(launchJSONPath)) {
        // launch.json exists, enhance existing file with new config
        const launchConfig = generateNewFioriLaunchConfig(rootFolder, fioriOptions);
        const launchJsonString = fs.read(launchJSONPath);
        const launchJson = parse(launchJsonString) as LaunchJSON;
        await updateLaunchJSON(
            launchConfig,
            launchJSONPath,
            ['configurations', launchJson.configurations.length + 1],
            {
                isArrayInsertion: true
            },
            fs
        );
    } else {
        // launch.json is missing, new file with new config
        const configurations = generateNewFioriLaunchConfig(rootFolder, fioriOptions);
        const newLaunchJSONContent = { version: '0.2.0', configurations: [configurations] };
        fs.write(launchJSONPath, JSON.stringify(newLaunchJSONContent, null, 4));
    }
    return fs;
}

/**
 * Writes the application info settings to the appInfo.json file.
 * Adds the specified path to the latestGeneratedFiles array.
 *
 * @param {string} path - The project file path to add.
 * @param {Editor} editor - The file system editor instance.
 * @param log - The logger instance.
 */
export function writeApplicationInfoSettings(path: string, editor: Editor, log?: Logger): void {
    const appInfoFilePath = join(homedir(), '.fioritools', 'appInfo.json');
    const appInfoContents = editor.exists(appInfoFilePath)
        ? JSON.parse(editor.read(appInfoFilePath))
        : { latestGeneratedFiles: [] };

    appInfoContents.latestGeneratedFiles.push(path);
    try {
        editor.write(appInfoFilePath, JSON.stringify(appInfoContents, null, 2));
    } catch (error) {
        log?.error(t('errorAppInfoFile', { error: error }));
    }
}

/**
 * Updates the workspace folders in VSCode if the update options are provided.
 *
 * @param {UpdateWorkspaceFolderOptions} updateWorkspaceFolders - The options for updating workspace folders.
 * @param {string} rootFolderPath - The root folder path of the project.
 * @param {Editor} editor - The file system editor instance.
 * @param log - The logger instance.
 */
export function updateWorkspaceFoldersIfNeeded(
    updateWorkspaceFolders: UpdateWorkspaceFolderOptions | undefined,
    rootFolderPath: string,
    editor: Editor,
    log?: Logger
): void {
    if (updateWorkspaceFolders) {
        const { uri, vscode, projectName } = updateWorkspaceFolders;
        writeApplicationInfoSettings(rootFolderPath, editor, log);

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
 * Creates or updates the launch.json file with the provided configurations.
 *
 * @param {string} rootFolderPath - The root folder path of the project.
 * @param {LaunchJSON} launchJsonFile - The launch.json configuration to write.
 * @param {UpdateWorkspaceFolderOptions} [updateWorkspaceFolders] - Optional workspace folder update options.
 * @param {Editor} [fs] - Optional file system editor instance.
 * @param log - The logger instance.
 * @returns {Editor} The file system editor instance.
 */
export function createOrUpdateLaunchConfigJSON(
    rootFolderPath: string,
    launchJsonFile?: LaunchJSON,
    updateWorkspaceFolders?: UpdateWorkspaceFolderOptions,
    fs?: Editor,
    log?: Logger
): Editor {
    const editor = fs ?? create(createStorage());
    const launchJSONPath = join(rootFolderPath, DirName.VSCode, LAUNCH_JSON_FILE);
    try {
        if (editor.exists(launchJSONPath)) {
            const existingLaunchConfig = parse(editor.read(launchJSONPath)) as LaunchJSON;
            const updatedConfigurations = existingLaunchConfig.configurations.concat(
                launchJsonFile?.configurations ?? []
            );
            editor.write(
                launchJSONPath,
                JSON.stringify({ ...existingLaunchConfig, configurations: updatedConfigurations }, null, 4)
            );
        } else {
            editor.write(launchJSONPath, JSON.stringify(launchJsonFile ?? {}, null, 4));
        }
    } catch (error) {
        log?.error(t('errorLaunchFile', { error: error }));
    }
    updateWorkspaceFoldersIfNeeded(updateWorkspaceFolders, rootFolderPath, editor, log);
    return editor;
}

/**
 * Generates and creates launch configuration for the project based on service and project details.
 *
 * @param {DebugOptions} options - The options for configuring the debug setup.
 * @param {Editor} fs - The file system editor instance.
 * @param log - The logger instance.
 */
export function configureLaunchConfig(options: DebugOptions, fs?: Editor, log?: Logger): void {
    const { datasourceType, projectPath, vscode } = options;
    if (datasourceType === DatasourceType.capProject) {
        log?.info(t('startApp', { npmStart: '`npm start`', cdsRun: '`cds run --in-memory`' }));
        return;
    }
    if (!vscode) {
        return;
    }
    const { launchJsonPath, workspaceFolderUri, cwd } = handleWorkspaceConfig(options);
    // construct launch.json file
    const launchJsonFile = configureLaunchJsonFile(cwd, options);
    // update workspace folders if workspaceFolderUri is available
    const updateWorkspaceFolders = workspaceFolderUri
        ? {
              uri: workspaceFolderUri,
              projectName: basename(options.projectPath),
              vscode
          }
        : undefined;

    createOrUpdateLaunchConfigJSON(launchJsonPath, launchJsonFile, updateWorkspaceFolders, fs, log);

    const npmCommand = datasourceType === DatasourceType.metadataFile ? 'run start-mock' : 'start';
    const projectName = basename(projectPath);
    log?.info(
        t('startServerMessage', {
            folder: projectName,
            npmCommand
        })
    );
}
