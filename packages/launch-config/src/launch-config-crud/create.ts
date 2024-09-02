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
import { getFioriToolsDirectory } from '@sap-ux/store';
import type { Logger } from '@sap-ux/logger';
import { DatasourceType } from '@sap-ux/odata-service-inquirer';
import { t } from '../i18n';
import fs from 'fs';

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
 * @param log - The logger instance.
 */
export function writeApplicationInfoSettings(path: string, log?: Logger): void {
    const appInfoFilePath: string = getFioriToolsDirectory();
    console.log('appInfoFilePath', appInfoFilePath);
    const appInfoContents = fs.existsSync(appInfoFilePath)
        ? JSON.parse(fs.readFileSync(appInfoFilePath, 'utf-8'))
        : { latestGeneratedFiles: [] };
    console.log('appInfoContents', appInfoContents);
    appInfoContents.latestGeneratedFiles.push(path);
    try {
        fs.writeFileSync(appInfoFilePath, JSON.stringify(appInfoContents, null, 2));
    } catch (error) {
        log?.error(t('errorAppInfoFile', { error: error }));
    }
}

/**
 * Updates the workspace folders in VSCode if the update options are provided.
 *
 * @param {UpdateWorkspaceFolderOptions} updateWorkspaceFolders - The options for updating workspace folders.
 * @param {string} rootFolderPath - The root folder path of the project.
 * @param log - The logger instance.
 */
export function updateWorkspaceFoldersIfNeeded(
    updateWorkspaceFolders: UpdateWorkspaceFolderOptions | undefined,
    rootFolderPath: string,
    log?: Logger
): void {
    if (updateWorkspaceFolders) {
        const { uri, vscode, projectName } = updateWorkspaceFolders;
        writeApplicationInfoSettings(rootFolderPath, log);

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
 * @param log - The logger instance.
 */
export function createOrUpdateLaunchConfigJSON(
    rootFolderPath: string,
    launchJsonFile?: LaunchJSON,
    updateWorkspaceFolders?: UpdateWorkspaceFolderOptions,
    log?: Logger
): void {
    try {
        const launchJSONPath = join(rootFolderPath, DirName.VSCode, LAUNCH_JSON_FILE);
        if (fs.existsSync(launchJSONPath)) {
            const existingLaunchConfig = parse(fs.readFileSync(launchJSONPath, 'utf-8')) as LaunchJSON;
            const updatedConfigurations = existingLaunchConfig.configurations.concat(
                launchJsonFile?.configurations ?? []
            );
            fs.writeFileSync(
                launchJSONPath,
                JSON.stringify({ ...existingLaunchConfig, configurations: updatedConfigurations }, null, 4)
            );
        } else {
            const dotVscodePath = join(rootFolderPath, DirName.VSCode);
            fs.mkdirSync(dotVscodePath, { recursive: true });
            const path = join(dotVscodePath, 'launch.json');
            fs.writeFileSync(path, JSON.stringify(launchJsonFile ?? {}, null, 4), 'utf8');
        }
    } catch (error) {
        log?.error(t('errorLaunchFile', { error: error }));
    }
    updateWorkspaceFoldersIfNeeded(updateWorkspaceFolders, rootFolderPath, log);
}

/**
 * Generates and creates launch configuration for the project based on debug options.
 *
 * @param {DebugOptions} options - The options for configuring the debug setup.
 * @param log - The logger instance.
 */
export function configureLaunchConfig(options: DebugOptions, log?: Logger): void {
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

    createOrUpdateLaunchConfigJSON(launchJsonPath, launchJsonFile, updateWorkspaceFolders, log);

    const npmCommand = datasourceType === DatasourceType.metadataFile ? 'run start-mock' : 'start';
    const projectName = basename(projectPath);
    log?.info(
        t('startServerMessage', {
            folder: projectName,
            npmCommand
        })
    );
}
