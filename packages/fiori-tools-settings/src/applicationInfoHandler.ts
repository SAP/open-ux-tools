import { create, type Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import { create as createMemStore } from 'mem-fs';
import { homedir } from 'node:os';

export const appInfoFilePath = join(homedir(), '.sap', 'app_studio_preview_manager', 'appInfo.json');

export interface AppInfoSettings {
    latestGeneratedFiles: string[];
}

/**
 * Initializes or retrieves the mem-fs editor instance.
 *
 * @param {Editor} [fs] - An optional mem-fs editor instance to reuse. If not provided, a new one is created.
 * @returns {Editor} The mem-fs editor instance.
 */
function getFsInstance(fs?: Editor): Editor {
    return fs ?? create(createMemStore());
}

/**
 * Writes an empty array to the `latestGeneratedFiles` property in the `appInfo.json` file.
 *
 * This function is intended to reset the list of generated files to an empty state. It uses the provided
 * `fs` (mem-fs editor) instance to perform the write operation. If no `fs` instance is provided, it will
 * use a new one via `getFsInstance`.
 *
 * After writing, the `fs.commit` method is called to persist changes.
 *
 * @param {Editor} [fs] - The optional mem-fs editor instance. If not provided, a new instance is created.
 * @example
 * initAppInfoSettings(); // Resets latestGeneratedFiles to an empty array
 */
export function initAppInfoSettings(fs?: Editor): void {
    fs = getFsInstance(fs);
    fs.writeJSON(appInfoFilePath, { latestGeneratedFiles: [] });
    fs.commit((err: Error | null) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        }
    });
}

/**
 * Appends a file path to the `latestGeneratedFiles` array in the `appInfo.json` settings file.
 *
 * This function reads the current `appInfo.json`, appends the provided file path to the
 * `latestGeneratedFiles` array, and writes the updated data back. It uses the provided
 * `fs` (mem-fs editor) instance for all read/write operations.
 *
 * If the `appInfo.json` file does not exist or is empty, the function will create a new one
 * with the file path as the first entry.
 *
 * @param {string} filePath - The file path to append to the `latestGeneratedFiles` array.
 * @param {Editor} [fs] - The optional mem-fs editor instance. If not provided, a new instance is created.
 * @example
 * addGeneratedFiles('/path/to/generated/app'); // Adds the path to appInfo.json
 */
export function addGeneratedFiles(filePath: string, fs?: Editor): void {
    fs = getFsInstance(fs);
    const appInfoContents: AppInfoSettings = fs.readJSON(appInfoFilePath) as unknown as AppInfoSettings;
    if (appInfoContents.latestGeneratedFiles) {
        appInfoContents.latestGeneratedFiles.push(filePath);
    } else {
        appInfoContents.latestGeneratedFiles = [filePath];
    }
    fs.writeJSON(appInfoFilePath, appInfoContents);
    fs.commit((err: Error | null) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        }
    });
}

/**
 * @deprecated Use `addGeneratedFiles` instead. This is maintained for backward compatibility.
 */
export const writeApplicationInfoSettings = addGeneratedFiles;

/**
 * Loads the file path from the `latestGeneratedFiles` array in the `appInfo.json` file,
 * removes it from the array, updates the file, and executes a VS Code command to load
 * the application info page for the generated project.
 *
 * This function ensures that a VS Code command is executed with the file path of the most recently
 * generated file. If no file paths are available or if `executeCommand` is not provided, the function
 * will skip the command execution. After processing, the `appInfo.json` file is deleted.
 *
 * The `autoOpen` parameter controls whether to automatically open the Application Info Page. If set to
 * false, the command execution is skipped entirely.
 *
 * @param {Function} [executeCommand] - An optional callback function to execute a VS Code command.
 * The function will be called with the file path from the `latestGeneratedFiles` array.
 * If not provided, the command execution step will be skipped.
 * @param {Editor} [fs] - The optional mem-fs editor instance. If not provided, a new instance is created.
 * @param {boolean} [autoOpen=true] - Whether to auto-open the Application Info Page.
 * Defaults to true for backward compatibility (existing behavior before this parameter was added).
 * If false, the command execution will be skipped even if a file path is available.
 * @example
 * loadApplicationInfoFromSettings(
 *     filePath => vscode.commands.executeCommand('fake.extension.loadInfo', filePath),
 *     undefined,
 *     true
 * );
 */
export function loadApplicationInfoFromSettings(
    executeCommand?: (filePath: string) => void,
    fs?: Editor,
    autoOpen: boolean = true // Defaults to true for backward compatibility
): void {
    fs = getFsInstance(fs);
    const appInfoContents: AppInfoSettings = fs.readJSON(appInfoFilePath) as unknown as AppInfoSettings;
    if (appInfoContents.latestGeneratedFiles && appInfoContents.latestGeneratedFiles.length > 0) {
        const filePath = appInfoContents.latestGeneratedFiles.shift();

        if (executeCommand && filePath && autoOpen) {
            executeCommand(filePath);
        }
        deleteAppInfoSettings(fs);
    }
}

/**
 * Deletes the `appInfo.json` settings file from the filesystem.
 *
 * This function uses the provided `fs` (mem-fs editor) instance to delete the file located at
 * `appInfoFilePath`. After deletion, the `fs.commit` method is called to persist the change.
 *
 * If no `fs` instance is provided, a new one is created via `getFsInstance`.
 *
 * @param {Editor} [fs] - The optional mem-fs editor instance. If not provided, a new instance is created.
 * @example
 * deleteAppInfoSettings(); // Deletes the appInfo.json file
 */
function deleteAppInfoSettings(fs?: Editor): void {
    fs = getFsInstance(fs);
    fs.delete(appInfoFilePath);
    fs.commit((err: Error | null) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        }
    });
}
