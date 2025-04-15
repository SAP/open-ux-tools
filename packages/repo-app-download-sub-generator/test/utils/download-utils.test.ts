import { downloadApp, extractZip } from '../../src/utils/download-utils';
import AdmZip from 'adm-zip';
import { join } from 'path';
import { t } from '../../src/utils/i18n';
import RepoAppDownloadLogger from '../../src/utils/logger';
import * as PromptStateModule from '../../src/prompts/prompt-state';

jest.mock('adm-zip');
jest.mock('../../src/utils/logger', () => ({
    logger: {
        error: jest.fn()
    }
}));

describe('extractZip', () => {
    let mockZip: any;
    let mockEntry1: any;
    let mockEntry2: any;
    let mockFs: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEntry1 = {
            isDirectory: false,
            entryName: 'file1.txt',
            getData: jest.fn(() => Buffer.from('File 1 content'))
        };
        mockEntry2 = {
            isDirectory: false,
            entryName: 'folder/file2.txt',
            getData: jest.fn(() => Buffer.from('File 2 content'))
        };
        mockZip = {
            getEntries: jest.fn(() => [mockEntry1, mockEntry2])
        };

        (AdmZip as jest.Mock).mockImplementation(() => mockZip);
        mockFs = {
            write: jest.fn()
        };
    });

    it('should extract files from zip and write them using fs', async () => {
        const extractedPath = join('/tmp/project');
        const dummyBuffer = Buffer.from('fake zip content');

        await extractZip(extractedPath, dummyBuffer, mockFs);

        expect(mockZip.getEntries).toHaveBeenCalled();
        expect(mockFs.write).toHaveBeenCalledWith(
            join(extractedPath, 'file1.txt'),
            'File 1 content'
        );
        expect(mockFs.write).toHaveBeenCalledWith(
            join(extractedPath, 'folder/file2.txt'),
            'File 2 content'
        );
    });

    it('should log an error if zip extraction fails', async () => {
        const errorMessage = 'Zip corrupted!';
        (AdmZip as jest.Mock).mockImplementation(() => {
            throw new Error(errorMessage);
        });

        const dummyBuffer = Buffer.from('broken zip');
        await extractZip('/tmp/fail', dummyBuffer, mockFs);

        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.appDownloadErrors.zipExtractionError', { error: errorMessage })
        );
    });
});

describe('downloadApp', () => {
    const mockDownloadFiles = jest.fn();
    const mockGetUi5AbapRepository = jest.fn(() => ({
        downloadFiles: mockDownloadFiles
    }));
    const mockServiceProvider = {
        getUi5AbapRepository: mockGetUi5AbapRepository
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockDownloadFiles.mockReset();

        PromptStateModule.PromptState.systemSelection = {
            connectedSystem: {
                serviceProvider: mockServiceProvider
            }
        } as any;
    });

    it('should download app and store it in PromptState', async () => {
        const mockPackage = { name: 'app-1', files: ['files.js'] };
        mockDownloadFiles.mockResolvedValue(mockPackage);

        await downloadApp('repo-1');

        expect(mockServiceProvider.getUi5AbapRepository).toHaveBeenCalled();
        expect(mockDownloadFiles).toHaveBeenCalledWith('repo-1');
        expect(PromptStateModule.PromptState.downloadedAppPackage).toEqual(mockPackage);
    });

    it('should throw if serviceProvider is undefined', async () => {
        PromptStateModule.PromptState.systemSelection = undefined as any;

        await expect(downloadApp('repo-1')).rejects.toThrow();
    });
});
