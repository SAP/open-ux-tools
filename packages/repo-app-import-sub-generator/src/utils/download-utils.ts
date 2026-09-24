import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { FileStoreService } from '@sap-ux/axios-extension';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { PromptState } from '../prompts/prompt-state.js';
import { t } from './i18n.js';
import RepoAppDownloadLogger from '../utils/logger.js';
import { qfaJsonFileName } from './constants.js';
import { type Logger } from '@sap-ux/logger';
import { TransportChecksService } from '@sap-ux/axios-extension';
import { restoreServiceProviderLoggers } from '@sap-ux/fiori-generator-shared';

/**
 * Fetches the metadata of a given service from the provided ABAP service provider.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider instance.
 * @param {string} serviceUrl - The URL of the service to retrieve metadata for.
 * @returns {Promise<string | undefined>} - A promise resolving to the service metadata XML string.
 */
export async function fetchServiceMetadata(
    provider: AbapServiceProvider,
    serviceUrl: string
): Promise<string | undefined> {
    try {
        const metadata = await provider.service(serviceUrl).metadata();
        RepoAppDownloadLogger.logger?.debug('Metadata fetched successfully');
        return metadata as string | undefined;
    } catch (err) {
        RepoAppDownloadLogger.logger?.error(t('error.metadataFetchError', { error: (err as Error).message }));
    }
}

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
 * @param {Editor} fs - The file system editor.
 */
export async function extractZip(extractedProjectPath: string, fs: Editor): Promise<void> {
    try {
        PromptState.admZip?.getEntries().forEach(function (zipEntry) {
            if (!zipEntry.isDirectory) {
                // Extract the file content
                const fileContent = zipEntry.getData().toString('utf8');
                const filePath = join(extractedProjectPath, zipEntry.entryName);
                RepoAppDownloadLogger.logger?.debug(
                    `extractZip: Extracting file: "${filePath}" with contents: "${fileContent}" .`
                );
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
 * First attempts download via ABAP_REPOSITORY_SRV (requires SAP_UI 754+).
 * Falls back to ADT FileStoreService on older systems.
 *
 * @param {string} repoName - The repository name of the application.
 * @returns {Promise<boolean>} - Resolves to false if no data was returned, true otherwise.
 */
export async function downloadApp(repoName: string): Promise<boolean> {
    const serviceProvider = PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider;
    const ui5AbapRepository = serviceProvider.getUi5AbapRepository();
    ui5AbapRepository.log = RepoAppDownloadLogger.logger as unknown as Logger;
    RepoAppDownloadLogger.logger?.debug(`App download started: ${repoName}`);
    let downloadedAppPackage: Buffer | undefined;
    try {
        downloadedAppPackage = await ui5AbapRepository.downloadFiles(repoName);
    } catch (error) {
        // ABAP_REPOSITORY_SRV may not be available on older systems (e.g. ABAP 731 / SAP_UI < 754).
        // Fall through to the ADT FileStoreService fallback below.
        RepoAppDownloadLogger.logger?.debug(`ABAP_REPOSITORY_SRV unavailable, falling back to ADT: ${(error as Error).message}`);
    }
    if (!downloadedAppPackage || downloadedAppPackage.length === 0) {
        RepoAppDownloadLogger.logger?.debug(t('error.adtFallbackDownload'));
        try {
            const fileStoreService = await serviceProvider.getAdtService<FileStoreService>(FileStoreService);
            if (fileStoreService) {
                downloadedAppPackage = await ui5AbapRepository.downloadFilesViaAdt(repoName, fileStoreService);
            }
        } catch (error) {
            RepoAppDownloadLogger.logger?.error(t('error.adtFallbackDownloadFailed', { error: (error as Error).message }));
        }
    }
    if (!downloadedAppPackage || downloadedAppPackage.length === 0) {
        RepoAppDownloadLogger.logger?.error(t('error.appDownloadFailed'));
        return false;
    }
    RepoAppDownloadLogger.logger?.debug(`App download completed: ${repoName}`);
    PromptState.admZip = downloadedAppPackage;
    return true;
}

/**
 * Resolve a transport request for the given app/package.
 *
 * @param serviceProvider - The ABAP service provider instance.
 * @param packageName - The ABAP package name.
 * @param appName - The repository/app name used for transport lookup.
 * @returns { Promise<string> }
 *  - '' when package is local ('$TMP')
 *  - '<transport-request-id>' when transport request is found
 *  - 'REPLACE_WITH_TRANSPORT' when no transport request is found
 * @throws Error when the transport check fails
 */
export async function resolveTransportRequest(
    serviceProvider: AbapServiceProvider | undefined,
    packageName: string,
    appName: string
): Promise<string> {
    if (packageName === '$TMP') {
        return '';
    }

    // Restore loggers lost during odata-service-inquirer serialization to prevent 'this.log.error is not a function' errors in service calls
    restoreServiceProviderLoggers(RepoAppDownloadLogger.logger as unknown as Logger, serviceProvider);

    try {
        const transportService = await serviceProvider?.getAdtService<TransportChecksService>(TransportChecksService);
        const transportRequests = await transportService?.getTransportRequests(packageName, appName);
        if (transportRequests?.length === 1) {
            return transportRequests[0].transportNumber;
        }
        return 'REPLACE_WITH_TRANSPORT';
    } catch (error) {
        if (error.message === TransportChecksService.LocalPackageError) {
            return '';
        }
        const msg = t('error.transportCheckFailed', { error: error?.message });
        RepoAppDownloadLogger.logger?.error(msg);
        throw new Error(msg);
    }
}
