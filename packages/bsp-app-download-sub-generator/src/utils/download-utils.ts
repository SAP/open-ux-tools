import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import AdmZip from 'adm-zip';
import type { Logger } from '@sap-ux/logger';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { PromptState } from '../prompts/prompt-state';

/**
 * Extracts a ZIP archive to a temporary directory.
 *
 * @param {string} extractedProjectPath - The path where the archive should be extracted.
 * @param {Buffer} archive - The ZIP archive buffer.
 * @param {Editor} fs - The file system editor.
 * @param {Logger} [log] - The logger instance.
 */
async function extractZip(extractedProjectPath: string, archive: Buffer, fs: Editor, log?: Logger): Promise<void> {
    try {
        const zip = new AdmZip(archive);
        zip.getEntries().forEach(function (zipEntry) {
            if (!zipEntry.isDirectory) {
                // Extract the file content
                const fileContent = zipEntry.getData().toString('utf8');
                // Add the file content to mem-fs at a virtual path
                fs.write(join(extractedProjectPath, zipEntry.entryName), fileContent);
            }
        });
    } catch (error) {
        log?.error(`Error extracting zip: ${error.message}`);
    }
}

/**
 * Downloads application files from the ABAP repository.
 *
 * @param {string} repoName - The repository name of the application.
 * @param {string} extractedProjectPath - The path where the application should be extracted.
 * @param {Editor} fs - The file system editor.
 * @param {Logger} [log] - The logger instance.
 * @throws {Error} If the file download fails.
 */
export async function downloadApp(
    repoName: string,
    extractedProjectPath: string,
    fs: Editor,
    log?: Logger
): Promise<void> {
    try {
        const serviceProvider = PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider;
        const archive = await serviceProvider.getUi5AbapRepository().downloadFiles(repoName);

        if (Buffer.isBuffer(archive)) {
            await extractZip(extractedProjectPath, archive, fs, log);
        } else {
            log?.error('Error: The downloaded file is not a Buffer.');
        }
    } catch (error) {
        throw Error(`Error downloading file: ${error.message}`);
    }
}
