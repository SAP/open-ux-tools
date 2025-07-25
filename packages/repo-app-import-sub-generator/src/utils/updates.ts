import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { FileName, DirName } from '@sap-ux/project-access';
import type { Manifest } from '@sap-ux/project-access';
import { t } from './i18n';
import RepoAppDownloadLogger from './logger';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { getUI5Versions } from '@sap-ux/ui5-info';
import { readManifest } from './file-helpers';
import { fioriAppSourcetemplateId } from './constants';

/**
 * Validates and updates the UI5 version in the manifest.
 *
 * - If the minUI5Version in the manifest is not found in the list of released UI5 versions,
 *   it updates the manifest with the closest released version.
 * - If internal features are enabled, it sets the minUI5Version to '${sap.ui5.dist.version}'.
 *
 * @param {string} manifestFilePath - The manifest file path.
 * @param {Editor} fs - The file system editor instance.
 * @returns {Promise<Manifest>} - The updated manifest object.
 * @throws {Error} - Throws an error if the manifest structure is invalid or no fallback version is available.
 */
export async function validateAndUpdateManifestUI5Version(manifestFilePath: string, fs: Editor): Promise<void> {
    const manifestJson = readManifest(manifestFilePath, fs);
    if (!manifestJson?.['sap.ui5']?.dependencies || !manifestJson?.['sap.app']?.sourceTemplate) {
        // Check if the manifest structure is valid) {
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
    manifestJson['sap.app'].sourceTemplate.id = fioriAppSourcetemplateId;
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
                if (extractedFile === FileName.Manifest) {
                    // Use datasource and model from the generated manifest
                    const extractedManifestJSON: Manifest = fs.readJSON(extractedFilePath) as unknown as Manifest;
                    const generatedManifestJSON: Manifest = fs.readJSON(webappFilePath) as unknown as Manifest;
                    if (generatedManifestJSON?.['sap.app']?.dataSources && extractedManifestJSON?.['sap.app']) {
                        extractedManifestJSON['sap.app'].dataSources = generatedManifestJSON['sap.app'].dataSources;
                    }
                    if (generatedManifestJSON?.['sap.ui5']?.models && extractedManifestJSON?.['sap.ui5']) {
                        extractedManifestJSON['sap.ui5'].models = generatedManifestJSON['sap.ui5']?.models;
                    }
                    // Set only css: [] to avoid deprecated 'sap.ui5/resources/js' linter errors.
                    if (
                        generatedManifestJSON?.['sap.ui5']?.resources &&
                        extractedManifestJSON?.['sap.ui5']?.resources
                    ) {
                        extractedManifestJSON['sap.ui5'].resources = generatedManifestJSON?.['sap.ui5'].resources;
                    }
                    fs.writeJSON(webappFilePath, extractedManifestJSON, undefined, 2);
                } else {
                    fs.copy(extractedFilePath, webappFilePath);
                }
            } else {
                RepoAppDownloadLogger.logger?.warn(t('warn.extractedFileNotFound', { extractedFilePath }));
            }
        }
    } catch (error) {
        RepoAppDownloadLogger.logger?.error(t('error.replaceWebappFilesError', { error }));
    }
}
