import {
    generatorTitle,
    generatorDescription,
    appListSearchParams,
    appListResultFields,
    adtSourceTemplateId
} from './constants';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import AdmZip from 'adm-zip';
import type { Logger } from '@sap-ux/logger';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { BspAppDownloadAnswers } from '../app/types';
import { FileName, type Manifest } from '@sap-ux/project-access';
import { t } from './i18n';
import { PromptState } from '../prompts/prompt-state';

/**
 * Returns the details for the YUI prompt.
 *
 * @returns step details
 */
export function getYUIDetails(): { name: string; description: string }[] {
    return [
        {
            name: generatorTitle,
            description: generatorDescription
        }
    ];
}

/**
 * Retrieves a list of deployed applications from abap respository.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @param {Logger} log - The logger instance.
 * @returns {Promise<Array<{ name: string, value: string }>>} - List of applications filtered by source template.
 */
export async function getAppList(provider: AbapServiceProvider, log?: Logger): Promise<AppIndex> {
    try {
        const appIndexService = provider.getAppIndex();
        return await appIndexService.search(appListSearchParams, appListResultFields);
    } catch (error) {
        log?.error(`Error fetching application list: ${error.message}`);
        return [];
    }
}

/**
 * Extracts ZIP archive to a temporary directory.
 *
 * @param extractedProjectPath
 * @param {Buffer} archive - The ZIP archive buffer.
 * @param fs
 * @param {Logger} log - The logger instance.
 */
async function extractZip(extractedProjectPath: string, archive: Buffer, fs: Editor, log?: Logger): Promise<void> {
    try {
        const zip = new AdmZip(archive);
        //zip.extractAllTo(join(fioriToolsExtractionPath, appId), true);
        const zipEntries = zip.getEntries(); // an array of ZipEntry records
        zipEntries.forEach(function (zipEntry) {
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
 * Downloads application files from the server.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @param answers
 * @param extractedProjectPath
 * @param fs
 * @param {Logger} log - The logger instance.
 */
export async function downloadApp(
    answers: BspAppDownloadAnswers,
    extractedProjectPath: string,
    fs: Editor,
    log?: Logger
): Promise<void> {
    try {
        const { selectedApp } = answers;
        const ui5AbapRepositoryService = (
            PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider
        ).getUi5AbapRepository();
        const archive = await ui5AbapRepositoryService.downloadFiles(selectedApp.repoName);

        if (Buffer.isBuffer(archive)) {
            await extractZip(extractedProjectPath, archive, fs, log);
        } else {
            log?.error('Error: The downloaded file is not a Buffer.');
        }
    } catch (error) {
        throw Error(`Error downloading file: ${error.message}`);
    }
}

/**
 * Reads and validates the manifest.json file.
 *
 * @param {string} extractedProjectPath - The path to the extracted project.
 * @param {Editor} fs - The file system editor.
 * @returns {Promise<Manifest>} - The manifest object.
 */
export async function readManifest(extractedProjectPath: string, fs: Editor): Promise<Manifest> {
    const manifestPath = join(extractedProjectPath, FileName.Manifest);
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    if (!manifest) {
        throw Error(t('error.manifestNotFound'));
    }
    if (!manifest['sap.app']) {
        throw Error(t('error.sapAppNotDefined'));
    }
    if (manifest['sap.app'].sourceTemplate?.id !== adtSourceTemplateId) {
        throw Error(t('error.sourceTemplateNotSupported'));
    }
    return manifest;
}
