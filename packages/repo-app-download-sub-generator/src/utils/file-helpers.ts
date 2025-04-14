import { adtSourceTemplateId } from './constants';
import type { Editor } from 'mem-fs-editor';
import { type Manifest } from '@sap-ux/project-access';
import { t } from './i18n';
import RepoAppDownloadLogger from './logger';
import type { QfaJsonConfig } from '../app/types';

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
