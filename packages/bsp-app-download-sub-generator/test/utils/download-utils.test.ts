import { downloadApp } from '../../src/utils/download-utils';
import AdmZip from 'adm-zip';
import { PromptState } from '../../src/prompts/prompt-state';
import type { Logger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { join } from 'path';
import { t } from '../../src/utils/i18n';
import BspAppDownloadLogger from '../../src/utils/logger';

jest.mock('adm-zip');
jest.mock('../../src/utils/logger', () => ({
    logger: {
        error: jest.fn()
    }
}));

describe('download-utils', () => {
    let mockFs: Editor;
    let mockLog: Logger;
    let mockServiceProvider: AbapServiceProvider;

    beforeEach(() => {
        mockFs = {
            write: jest.fn(),
        } as unknown as Editor;

        mockLog = {
            error: jest.fn(),
        } as unknown as Logger;

        mockServiceProvider = {
            getUi5AbapRepository: jest.fn().mockReturnValue({
                downloadFiles: jest.fn(),
            }),
        } as unknown as AbapServiceProvider;

        (PromptState.systemSelection as any) = {
            connectedSystem: {
                serviceProvider: mockServiceProvider,
            },
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const extractedPath = join('path/to/extract');
    it('should download and extract the application files', async () => {
        await downloadApp('repoName', extractedPath, mockFs);
        expect(mockServiceProvider.getUi5AbapRepository().downloadFiles).toHaveBeenCalledWith('repoName');
    });

    it('should log an error if the downloaded file is not a Buffer', async () => {
        jest.spyOn(mockServiceProvider.getUi5AbapRepository(), 'downloadFiles').mockResolvedValue('not-a-buffer' as any);
        await downloadApp('repoName', extractedPath, mockFs);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.appDownloadErrors.downloadedFileNotBufferError'));
    });

    it('should log an error if the download fails', async () => {
        const errorMessage = 'Mock download error';
        jest.spyOn(mockServiceProvider.getUi5AbapRepository(), 'downloadFiles').mockRejectedValue(new Error(errorMessage));
        await downloadApp('repoName', extractedPath, mockFs)
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.appDownloadErrors.appDownloadFailure', { error: errorMessage }));
    });

    it('should extract files from a ZIP archive and write them to the file system', async () => {
        const appContents = 'app contents', appName = 'app-name';
        const mockZipEntry = {
            isDirectory: false,
            entryName: appName,
            getData: jest.fn().mockReturnValue(Buffer.from(appContents))
        };
        const mockZip = {
            getEntries: jest.fn().mockReturnValue([mockZipEntry]),
        };
        (AdmZip as jest.Mock).mockImplementation(() => mockZip);

        jest.spyOn(mockServiceProvider.getUi5AbapRepository(), 'downloadFiles').mockResolvedValue(Buffer.from(appContents));
        await downloadApp('repoName', extractedPath, mockFs);

        expect(mockZip.getEntries).toHaveBeenCalled();
        expect(mockFs.write).toHaveBeenCalledWith(`${extractedPath}/${appName}`, appContents);
    });

    it('should log an error if extraction fails', async () => {
        const errorMessage = 'Mock extraction error';
        (AdmZip as jest.Mock).mockImplementation(() => {
            throw new Error(errorMessage);
        });
        jest.spyOn(mockServiceProvider.getUi5AbapRepository(), 'downloadFiles').mockResolvedValue(Buffer.from('app contents'));
        await downloadApp('repoName', extractedPath, mockFs);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.appDownloadErrors.zipExtractionError', { error: errorMessage }));
    });
});