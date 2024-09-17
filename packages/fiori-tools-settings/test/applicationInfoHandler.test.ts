import { writeApplicationInfoSettings, loadApplicationInfoFromSettings, appInfoFilePath } from '../src/';
import path from 'path';

const mockFsEditor = {
    read: jest.fn(),
    write: jest.fn(),
    exists: jest.fn(),
    delete: jest.fn()
};

jest.mock('mem-fs', () => ({
    create: jest.fn(() => ({}))
}));

jest.mock('mem-fs-editor', () => ({
    create: jest.fn(() => mockFsEditor)
}));

const executeCommandMock = jest.fn();

describe('loadApplicationInfoFromSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should do nothing if appInfo.json does not exist', () => {
        mockFsEditor.exists.mockReturnValue(false);

        loadApplicationInfoFromSettings(executeCommandMock);

        expect(mockFsEditor.read).not.toHaveBeenCalled();
        expect(mockFsEditor.write).not.toHaveBeenCalled();
        expect(executeCommandMock).not.toHaveBeenCalled();
        expect(mockFsEditor.delete).not.toHaveBeenCalled();
    });

    it('should do nothing if latestGeneratedFiles is empty', () => {
        mockFsEditor.exists.mockReturnValue(true);
        mockFsEditor.read.mockReturnValue(
            JSON.stringify({
                latestGeneratedFiles: []
            })
        );

        loadApplicationInfoFromSettings(executeCommandMock);

        expect(executeCommandMock).not.toHaveBeenCalled();
        expect(mockFsEditor.write).not.toHaveBeenCalled();
        expect(mockFsEditor.delete).not.toHaveBeenCalled();
    });

    it('should load the application info, update the file, and delete the appInfo.json', () => {
        const mockFilePath = path.join('/some/path/to/file.txt');
        mockFsEditor.exists.mockReturnValue(true);
        mockFsEditor.read.mockReturnValue(
            JSON.stringify({
                latestGeneratedFiles: [mockFilePath]
            })
        );

        loadApplicationInfoFromSettings(executeCommandMock);

        expect(executeCommandMock).toHaveBeenCalledWith(mockFilePath);
        expect(mockFsEditor.delete).toHaveBeenCalledWith(appInfoFilePath);
    });

    it('should handle delete AppInfo file error gracefully', () => {
        const mockFilePath = path.join('/some/path/to/file.txt');
        mockFsEditor.exists.mockReturnValue(true);
        mockFsEditor.read.mockReturnValue(
            JSON.stringify({
                latestGeneratedFiles: [mockFilePath]
            })
        );

        const mockError = new Error('Failed to delete file');
        mockFsEditor.delete.mockImplementation(() => {
            throw mockError;
        });

        expect(() => loadApplicationInfoFromSettings(executeCommandMock)).toThrow(
            `Error in deleting AppInfo.json file, ${mockError}`
        );
    });
});

describe('writeApplicationInfoSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create appInfo.json if it does not exist', () => {
        mockFsEditor.exists.mockReturnValue(false);

        writeApplicationInfoSettings(path.join('/some/path/to/file.txt'));

        expect(mockFsEditor.write).toHaveBeenCalledWith(
            appInfoFilePath,
            JSON.stringify(
                {
                    latestGeneratedFiles: ['/some/path/to/file.txt']
                },
                null,
                2
            )
        );
    });

    it('should update appInfo.json if it exists', () => {
        mockFsEditor.exists.mockReturnValue(true);
        const mockPath = path.join('/existing/path');
        mockFsEditor.read.mockReturnValue(
            JSON.stringify({
                latestGeneratedFiles: [mockPath]
            })
        );
        writeApplicationInfoSettings('/some/new/path');
        expect(mockFsEditor.write).toHaveBeenCalledWith(
            appInfoFilePath,
            JSON.stringify(
                {
                    latestGeneratedFiles: ['/existing/path', '/some/new/path']
                },
                null,
                2
            )
        );
    });
});
