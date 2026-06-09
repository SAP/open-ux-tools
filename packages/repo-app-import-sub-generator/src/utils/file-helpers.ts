import type { Editor } from 'mem-fs-editor';
import { type Manifest } from '@sap-ux/project-access';
import { t } from './i18n';
import RepoAppDownloadLogger from './logger';
import type { QfaJsonConfig } from '../app/types';
import { join } from 'node:path';
import { PromptState } from '../prompts/prompt-state';

/**
 *
 * @param filePath - Path to the JSON file
 * @param fs - File system editor instance
 * @returns - Parsed JSON object
 */
export function makeValidJson(filePath: string, fs: Editor): QfaJsonConfig {
    try {
        // Read the file contents
        const fileContents = fs.read(filePath);
        const validJson: QfaJsonConfig = JSON.parse(fileContents);
        return validJson;
    } catch (error) {
        throw new Error(t('error.errorProcessingJsonFile', { error }));
    }
}

/**
 * Reads and validates the `manifest.json` file.
 *
 * @param {string} manifestFilePath - Manifest file path.
 * @param {Editor} fs - The file system editor.
 * @returns {Manifest} The validated manifest object.
 */
export function readManifest(manifestFilePath: string, fs: Editor): Manifest {
    if (!fs.exists(manifestFilePath)) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.manifestFileNotFound'));
    }
    const manifest = fs.readJSON(manifestFilePath) as unknown as Manifest;
    if (!manifest) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.readManifestFailed'));
    }
    if (!manifest?.['sap.app']) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.sapAppNotDefined'));
    }
    return manifest;
}

/**
 * Removes debug, preload, and source map files from the extracted project path.
 * For -dbg.js files, copies the unminified content to the corresponding .js file first.
 * These files are build artefacts that cause issues with the UI5 CLI build if left in place.
 *
 * @param {string} extractedProjectPath - The path where the app files are extracted.
 * @param {Editor} fs - The file system editor.
 */
export function cleanupDebugFiles(extractedProjectPath: string, fs: Editor): void {
    PromptState.admZip?.getEntries().forEach((entry) => {
        const name = entry.entryName;
        if (name.endsWith('-dbg.js')) {
            const extractedDebugPath = join(extractedProjectPath, name.replace('-dbg.js', '.js'));
            const debugPath = join(extractedProjectPath, name);
            fs.write(extractedDebugPath, entry.getData().toString('utf8'));
            fs.delete(debugPath);
            RepoAppDownloadLogger.logger?.debug(
                `cleanupDebugFiles: Copied "${debugPath}" -> "${extractedDebugPath}" and removed debug file`
            );
        } else if (name.endsWith('-preload.js') || name.endsWith('.js.map')) {
            const filePath = join(extractedProjectPath, name);
            if (fs.exists(filePath)) {
                fs.delete(filePath);
                RepoAppDownloadLogger.logger?.debug(`cleanupDebugFiles: Removed file: "${filePath}"`);
            }
        }
    });
}

/**
 * Writes a minimal package.json to the project path if one does not already exist.
 *
 * @param {string} projectPath - The project root path.
 * @param {string} appId - The application ID used as the package name.
 * @param {Editor} fs - The file system editor.
 */
export function addPackageJsonIfNotFound(projectPath: string, appId: string, fs: Editor): void {
    const packageJsonPath = join(projectPath, 'package.json');
    if (!fs.exists(packageJsonPath)) {
        fs.writeJSON(packageJsonPath, { name: appId });
    }
}
