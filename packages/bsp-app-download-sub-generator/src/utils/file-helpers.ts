import { adtSourceTemplateId } from './constants';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { FileName, DirName, type Manifest } from '@sap-ux/project-access';
import { t } from './i18n';
import BspAppDownloadLogger from './logger';
import type { QfaJsonConfig } from '../app/types';

/**
 * Reads and validates the `manifest.json` file.
 *
 * @param {string} extractedProjectPath - The path to the extracted project.
 * @param {Editor} fs - The file system editor.
 * @returns {Manifest} The validated manifest object.
 */
export function readManifest(extractedProjectPath: string, fs: Editor): Manifest {
    const manifestPath = join(extractedProjectPath, FileName.Manifest);
    if (!fs.exists(manifestPath)) {
        BspAppDownloadLogger.logger?.error(t('error.readManifestErrors.manifestFileNotFound'));
    }
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    if (!manifest) {
        BspAppDownloadLogger.logger?.error(t('error.readManifestErrors.readManifestFailed'));
    }
    if (!manifest?.['sap.app']) {
        BspAppDownloadLogger.logger?.error(t('error.readManifestErrors.sapAppNotDefined'));
    }
    if (manifest?.['sap.app']?.sourceTemplate?.id !== adtSourceTemplateId) {
        BspAppDownloadLogger.logger?.error(t('error.readManifestErrors.sourceTemplateNotSupported'));
    }
    return manifest;
}

/**
 * Replaces the specified files in the `webapp` directory with the corresponding files from the `extractedPath`.
 *
 * @param {string} projectPath - The path to the downloaded App.
 * @param {string} extractedPath - The path from which files will be copied.
 * @param {Editor} fs - The file system editor instance to modify files in memory.
 */
export async function replaceWebappFiles(projectPath: string, extractedPath: string, fs: Editor): Promise<void> {
    try {
        const webappPath = join(projectPath, DirName.Webapp);
        // Define the paths of the files to be replaced
        const filesToReplace = [
            { webappFile: FileName.Manifest, extractedFile: FileName.Manifest },
            { webappFile: join('i18n', 'i18n.properties'), extractedFile: join('i18n', 'i18n.properties') },
            { webappFile: 'index.html', extractedFile: 'index.html' },
            { webappFile: 'Component.js', extractedFile: 'component.js' }
        ];
        // Loop through each file and perform the replacement
        for (const { webappFile, extractedFile } of filesToReplace) {
            const webappFilePath = join(webappPath, webappFile);
            const extractedFilePath = join(extractedPath, extractedFile);

            // Check if the extracted file exists before replacing
            if (fs.exists(extractedFilePath)) {
                if (webappFile === FileName.Manifest) {
                    // Pretify manifest.json file
                    const manifestContent = fs.read(extractedFilePath);
                    const prettifiedContent = JSON.stringify(JSON.parse(manifestContent), null, 2);
                    fs.write(webappFilePath, prettifiedContent);
                } else {
                    fs.copy(extractedFilePath, webappFilePath);
                }
            } else {
                BspAppDownloadLogger.logger?.warn(t('warn.extractedFileNotFound', { extractedFilePath }));
            }
        }
    } catch (error) {
        BspAppDownloadLogger.logger?.error(t('error.replaceWebappFilesError', { error }));
    }
}

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
        // Replace property names without quotes with quoted property names
        const validJsonString = fileContents.replace(/(\w+):/g, '"$1":');
        // Parse to ensure it's valid JSON
        const validJson: QfaJsonConfig = JSON.parse(validJsonString);
        return validJson;
    } catch (error) {
        throw new Error(t('error.errorProcessingJsonFile', { error }));
    }
}
