import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import AdmZip from 'adm-zip';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { PromptState } from '../prompts/prompt-state';
import { t } from './i18n';
import BspAppDownloadLogger from '../utils/logger';

/**
 * Extracts a ZIP archive to a temporary directory.
 *
 * @param {string} extractedProjectPath - The path where the archive should be extracted.
 * @param {Buffer} archive - The ZIP archive buffer.
 * @param {Editor} fs - The file system editor.
 */
async function extractZip(extractedProjectPath: string, archive: Buffer, fs: Editor): Promise<void> {
    try {
        const zip = new AdmZip(archive);
        zip.getEntries().forEach(function (zipEntry) {
            if (!zipEntry.isDirectory) {
                // Extract the file content
                const fileContent = zipEntry.getData().toString('utf8');
                // Load the file content into mem-fs for use in the temporary extracted project directory
                fs.write(join(extractedProjectPath, zipEntry.entryName), fileContent);
            }
        });
    } catch (error) {
        BspAppDownloadLogger.logger?.error(t('error.appDownloadErrors.zipExtractionError', { error: error.message }));
    }
}

/**
 * Downloads application files from the ABAP repository.
 *
 * @param {string} repoName - The repository name of the application.
 * @param {string} extractedProjectPath - The path where the application should be extracted.
 * @param {Editor} fs - The file system editor.
 */
export async function downloadApp(repoName: string, extractedProjectPath: string, fs: Editor): Promise<void> {
    try {
        const serviceProvider = PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider;
        debugger;
        const archive = await serviceProvider.getUi5AbapRepository().downloadFiles(repoName);
        if (Buffer.isBuffer(archive)) {
            await extractZip(extractedProjectPath, archive, fs);
        } else {
            BspAppDownloadLogger.logger?.error(t('error.appDownloadErrors.downloadedFileNotBufferError'));
        }
    } catch (error) {
        BspAppDownloadLogger.logger?.error(t('error.appDownloadErrors.appDownloadFailure', { error: error.message }));
    }
}
