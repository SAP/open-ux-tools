import { adtSourceTemplateId } from './constants';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { FileName, DirName, type Manifest } from '@sap-ux/project-access';
import { t } from './i18n';
import RepoAppDownloadLogger from './logger';
import type { QfaJsonConfig } from '../app/types';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { getUI5Versions } from '@sap-ux/ui5-info';

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
 * @param {string} manifesFilePath - Manifest file path.
 * @param {Editor} fs - The file system editor.
 * @returns {Manifest} The validated manifest object.
 */
export function readManifest(manifesFilePath: string, fs: Editor): Manifest {
    if (!fs.exists(manifesFilePath)) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.manifestFileNotFound'));
    }
    const manifest = fs.readJSON(manifesFilePath) as unknown as Manifest;
    if (!manifest) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.readManifestFailed'));
    }
    if (!manifest?.['sap.app']) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.sapAppNotDefined'));
    }
    if (manifest?.['sap.app']?.sourceTemplate?.id !== adtSourceTemplateId) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.sourceTemplateNotSupported'));
    }
    return manifest;
}

/**
 * Validates and updates the UI5 version in the manifest.
 *
 * - If the minUI5Version in the manifest is not found in the list of released UI5 versions,
 *   it updates the manifest with the closest released version.
 * - If internal features are enabled, it sets the minUI5Version to '${sap.ui5.dist.version}'.
 *
 * @param {string} manifestFilePath - The manifest file path.
 * @param fs
 * @returns {Promise<Manifest>} - The updated manifest object.
 * @throws {Error} - Throws an error if the manifest structure is invalid or no fallback version is available.
 */
export async function validateAndUpdateManifestUI5Version(manifestFilePath: string, fs: Editor): Promise<void> {
    const manifestJson = readManifest(manifestFilePath, fs);
    if (!manifestJson['sap.ui5']?.dependencies) {
        throw new Error(t('error.readManifestErrors.invalidManifestStructureError'));
    }

    const manifestUi5Version = manifestJson['sap.ui5']?.dependencies?.minUI5Version;
    const availableUI5Versions = await getUI5Versions({ includeMaintained: true });

    // Check if the manifest version exists in the list of released versions
    const ui5VersionAvailable = availableUI5Versions.find(
        (ui5Version: { version: string }) => ui5Version.version === manifestUi5Version
    );

    if (ui5VersionAvailable) {
        // Return the manifest as it is if the version is valid
        // No changes needed
    } else if (isInternalFeaturesSettingEnabled()) {
        // Handle internal features setting
        manifestJson['sap.ui5'].dependencies.minUI5Version = '${sap.ui5.dist.version}';
    } else {
        // Handle fallback to the closest released version
        const closestAvailableUi5Version = availableUI5Versions[0]?.version;
        manifestJson['sap.ui5'].dependencies.minUI5Version = closestAvailableUi5Version;
    }
    // update manifest at extracted path
    fs.writeJSON(manifestFilePath, manifestJson, undefined, 2);
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
                fs.copy(extractedFilePath, webappFilePath);
            } else {
                RepoAppDownloadLogger.logger?.warn(t('warn.extractedFileNotFound', { extractedFilePath }));
            }
        }
    } catch (error) {
        RepoAppDownloadLogger.logger?.error(t('error.replaceWebappFilesError', { error }));
    }
}
