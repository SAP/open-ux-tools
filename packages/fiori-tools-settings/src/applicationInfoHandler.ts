import { homedir } from 'os';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';

export const appInfoFilePath = join(homedir(), '.fioritools', 'appInfo.json');
const defaultAppInfoContents = {
    latestGeneratedFiles: []
};

interface AppInfoSettings {
    latestGeneratedFiles: string[];
}
/**
 * Reads and parses a JSON file.
 *
 * @param {string} filePath - The path to the JSON file.
 * @param fs
 * @returns {object} - The parsed JSON object.
 */
function readJSONFile(filePath: string, fs: Editor): AppInfoSettings {
    if (fs.exists(filePath)) {
        const content = fs.read(filePath);
        return JSON.parse(content);
    }
    return defaultAppInfoContents;
}

/**
 * Adds a new file path to the latestGeneratedFiles array in the appInfo.json file.
 * If the file does not exist, it creates it.
 *
 * @param {string} path - The file path to add.
 * @param fs - The mem-fs editor instance.
 */
export function writeApplicationInfoSettings(path: string, fs?: Editor) {
    fs = fs ?? create(createStorage());
    const appInfoContents: AppInfoSettings = readJSONFile(appInfoFilePath, fs);
    appInfoContents.latestGeneratedFiles.push(path);
    fs.write(appInfoFilePath, JSON.stringify(appInfoContents, null, 2));
}

/**
 * Deletes the appInfo.json file.
 *
 * @param fs - The mem-fs editor instance.
 */
export function deleteAppInfoSettings(fs?: Editor) {
    fs = fs ?? create(createStorage());
    if (fs.exists(appInfoFilePath)) {
        try {
            fs.delete(appInfoFilePath);
        } catch (err) {
            throw new Error(`Error in deleting AppInfo.json file, ${err}`);
        }
    }
}

/**
 * Loads the first file path from the latestGeneratedFiles array in the appInfo.json file,
 * removes it from the array, updates the file, and executes a VS Code command to load application info page for the generated project.
 *
 * @param executeCommand
 * @param fs
 */
export function loadApplicationInfoFromSettings(executeCommand: (filePath: string) => void, fs?: Editor) {
    fs = fs ?? create(createStorage());
    const appInfoContents = readJSONFile(appInfoFilePath, fs);
    if (appInfoContents && appInfoContents.latestGeneratedFiles.length > 0) {
        // get the file path to display app info of project generated
        const filePath = appInfoContents.latestGeneratedFiles.shift();
        if (filePath) {
            executeCommand(filePath);
        }
        deleteAppInfoSettings();
    }
}
