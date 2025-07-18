import { homedir } from 'os';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';

export const appInfoFilePath = join(homedir(), '.fioritools', 'appInfo.json');
export const defaultAppInfoContents = {
    latestGeneratedFiles: []
};

interface AppInfoSettings {
    latestGeneratedFiles: string[];
}

/**
 * Returns a mem-fs editor instance. If an instance is not provided, a new one is created.
 *
 * @param {Editor} [fs] - An optional mem-fs editor instance.
 * @returns {Editor} - The mem-fs editor instance.
 */
function getFsInstance(fs?: Editor): Editor {
    return fs ?? create(createStorage());
}

/**
 * Reads and parses a JSON file.
 * If the file exists, this function reads its content, parses the JSON, and returns the resulting object.
 * If the file does not exist, it returns the default application information settings.
 *
 * @param {string} filePath - The path to the JSON file.
 * @param {Editor} fs - The mem-fs editor instance used for file system operations.
 * @returns {AppInfoSettings} - The parsed JSON object, or the default settings if the file does not exist.
 */
function readJSONFile(filePath: string, fs: Editor): AppInfoSettings {
    return fs.exists(filePath) ? JSON.parse(fs.read(filePath)) : defaultAppInfoContents;
}

/**
 * Adds a new file path to the `latestGeneratedFiles` array in the `appInfo.json` file.
 * If the file does not exist, it creates it. This function ensures that the provided file path is included
 * in the list of generated files for future reference.
 *
 * @param {string} path - The file path to add to the `latestGeneratedFiles` array.
 * @param {Editor} [fs] - The optional mem-fs editor instance. If not provided, a new instance is created.
 */
export function writeApplicationInfoSettings(path: string, fs?: Editor) {
    fs = getFsInstance(fs);
    const appInfoContents: AppInfoSettings = readJSONFile(appInfoFilePath, fs);
    appInfoContents.latestGeneratedFiles.push(path);
    fs.write(appInfoFilePath, JSON.stringify(appInfoContents, null, 2));
    fs.commit((err) => {
        console.log('Error in writting to AppInfo.json file', err);
    });
}

/**
 * Deletes the `appInfo.json` file if it exists.
 * This function checks if the file exists and attempts to delete it. If an error occurs during deletion,
 * it throws a new error with a descriptive message.
 *
 * @param {Editor} [fs] - The optional mem-fs editor instance. If not provided, a new instance is created.
 * @throws {Error} Throws an error if there is a problem deleting the file.
 */
export function deleteAppInfoSettings(fs?: Editor) {
    fs = getFsInstance(fs);
    if (fs.exists(appInfoFilePath)) {
        try {
            fs.delete(appInfoFilePath);
            fs.commit((err) => {
                console.log('Failed to commit the deletion of the AppInfo.json file: ', err);
            });
        } catch (err) {
            throw new Error(`Error deleting appInfo.json file: ${err}`);
        }
    }
}

/**
 * Loads the file path from the `latestGeneratedFiles` array in the `appInfo.json` file,
 * removes it from the array, updates the file, and executes a VS Code command to load
 * the application info page for the generated project.
 *
 * This function ensures that a VS Code command is executed with the file path of the most recently
 * generated file. If no file paths are available or if `executeCommand` is not provided, the function
 * will skip the command execution. After processing, the `appInfo.json` file is deleted.
 *
 * @param {Function} [executeCommand] - An optional callback function to execute a VS Code command.
 * The function will be called with the file path from the `latestGeneratedFiles` array.
 * If not provided, the command execution step will be skipped.
 * @param {Editor} [fs] - The optional mem-fs editor instance. If not provided, a new instance is created.
 * @example
 * loadApplicationInfoFromSettings(filePath => {
 *     // Perform VS Code command with the file path
 *     vscode.commands.executeCommand('fake.extension.loadInfo', filePath);
 * });
 */
export function loadApplicationInfoFromSettings(executeCommand?: (filePath: string) => void, fs?: Editor): void {
    fs = getFsInstance(fs);
    const appInfoContents: AppInfoSettings = readJSONFile(appInfoFilePath, fs);
    if (appInfoContents.latestGeneratedFiles.length > 0) {
        const filePath = appInfoContents.latestGeneratedFiles.shift();
        if (executeCommand && filePath) {
            executeCommand(filePath);
        }
        deleteAppInfoSettings(fs);
    }
}
