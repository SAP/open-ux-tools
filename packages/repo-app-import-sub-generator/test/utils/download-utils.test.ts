import { downloadApp, extractZip, hasQfaJson } from '../../src/utils/download-utils';
import AdmZip from 'adm-zip';
import { join } from 'path';
import { t } from '../../src/utils/i18n';
import RepoAppDownloadLogger from '../../src/utils/logger';
import * as PromptState from '../../src/prompts/prompt-state';
import { qfaJsonFileName } from '../../src/utils/constants';

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
        const mockZip = {
            getEntries: jest.fn(() => [
                { entryName: qfaJsonFileName, isDirectory: false, getData: jest.fn(() => Buffer.from('{"test": "QFA"}')) },
                { entryName: 'file1.txt', isDirectory: false, getData: jest.fn(() => Buffer.from('File 1 content')) },
                { entryName: 'folder/file2.txt', isDirectory: false, getData: jest.fn(() => Buffer.from('File 2 content')) }
            ])
        };
        
        // Set _admZipInstance
        jest.spyOn(PromptState.PromptState, 'admZip', 'get').mockReturnValue(mockZip as unknown as AdmZip);
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
        // Set _admZipInstance
        jest.spyOn(PromptState.PromptState, 'admZip', 'get').mockImplementation(() => {
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

        PromptState.PromptState.systemSelection = {
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
        expect(PromptState.PromptState.downloadedAppPackage).toEqual(mockPackage);
    });

    it('should throw if serviceProvider is undefined', async () => {
        PromptState.PromptState.systemSelection = undefined as any;

        await expect(downloadApp('repo-1')).rejects.toThrow();
    });
});

describe('hasQfaJson', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('should return true if qfa.json exists in the zip', () => {
        const mockZip = {
            getEntries: jest.fn(() => [
                { entryName: qfaJsonFileName, isDirectory: false, getData: jest.fn(() => Buffer.from('{"test": "QFA"}')) },
                { entryName: 'file1.txt', isDirectory: false, getData: jest.fn(() => Buffer.from('File 1 content')) },
                { entryName: 'folder/file2.txt', isDirectory: false, getData: jest.fn(() => Buffer.from('File 2 content')) }
            ])
        };
        
        // Set _admZipInstance
        jest.spyOn(PromptState.PromptState, 'admZip', 'get').mockReturnValue(mockZip as unknown as AdmZip);
        const dummyBuffer = Buffer.from('dummy');
        PromptState.PromptState.downloadedAppPackage = dummyBuffer;

        expect(hasQfaJson()).toBe(true);
    });

    it('should return false if qfa.json is not present in the zip', () => {
        const mockZip = {
            getEntries: jest.fn(() => [
                { entryName: 'file1.txt', isDirectory: false, getData: jest.fn(() => Buffer.from('File 1 content')) },
                { entryName: 'folder/file2.txt', isDirectory: false, getData: jest.fn(() => Buffer.from('File 2 content')) }
            ])
        };
        
        // Set _admZipInstance
        jest.spyOn(PromptState.PromptState, 'admZip', 'get').mockReturnValue(mockZip as unknown as AdmZip);
        const dummyBuffer = Buffer.from('dummy');
        PromptState.PromptState.downloadedAppPackage = dummyBuffer;
        expect(hasQfaJson()).toBe(false);
    });
});