import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { PromptState } from '../prompts/prompt-state';
import { t } from './i18n';
import RepoAppDownloadLogger from '../utils/logger';
import { qfaJsonFileName } from './constants';

/**
 * Checks whether the ZIP archive contains an entry named qfa.json
 * and verifies that a file named qfa.json exists  in the archive.
 *
 * @returns {boolean} true qfa.json file exists, otherwise false.
 */
export function hasQfaJson(): boolean {
    const qfaEntries = PromptState.admZip?.getEntries().filter((entry) => entry.entryName === qfaJsonFileName);
    return qfaEntries?.length === 1;
}

/**
 * Extracts a ZIP archive to a temporary directory.
 *
 * @param {string} extractedProjectPath - The path where the archive should be extracted.
 * @param {Buffer} archive - The ZIP archive buffer.
 * @param {Editor} fs - The file system editor.
 */
export async function extractZip(extractedProjectPath: string, archive: Buffer, fs: Editor): Promise<void> {
    try {
        PromptState.admZip?.getEntries().forEach(function (zipEntry) {
            if (!zipEntry.isDirectory) {
                // Extract the file content
                const fileContent = zipEntry.getData().toString('utf8');
                // Load the file content into mem-fs for use in the temporary extracted project directory
                fs.write(join(extractedProjectPath, zipEntry.entryName), fileContent);
            }
        });
    } catch (error) {
        RepoAppDownloadLogger.logger?.error(t('error.appDownloadErrors.zipExtractionError', { error: error.message }));
    }
}

/**
 * Downloads application files from the ABAP repository.
 *
 * @param {string} repoName - The repository name of the application.
 */
export async function downloadApp(repoName: string): Promise<void> {
    const serviceProvider = PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider;
    const downloadedAppPackage = await serviceProvider.getUi5AbapRepository().downloadFiles(repoName);
    // store downloaded package in prompt state
    PromptState.downloadedAppPackage = downloadedAppPackage;
}
