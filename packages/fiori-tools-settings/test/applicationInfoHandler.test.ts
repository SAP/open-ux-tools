import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import {
    writeApplicationInfoSettings,
    deleteAppInfoSettings,
    loadApplicationInfoFromSettings,
    appInfoFilePath,
    defaultAppInfoContents
} from '../src';
import { promises as fsPromises } from 'node:fs';

describe('Application Info Settings', () => {
    let fs: Editor;

    beforeEach(async () => {
        // Ensure a clean state before each test
        await fsPromises.rm(appInfoFilePath).catch(() => {
            // Ignore errors if the file does not exist
        });

        fs = create(createStorage());
    });

    afterEach(() => {
        deleteAppInfoSettings(fs);
    });

    it('writeApplicationInfoSettings should add a file path to appInfo.json', () => {
        const testPath = 'test-file-path';
        writeApplicationInfoSettings(testPath, fs);
        const appInfoContents = JSON.parse(fs.read(appInfoFilePath) || '{}');
        expect(appInfoContents.latestGeneratedFiles).toContain(testPath);
    });

    it('writeApplicationInfoSettings should add a file path to appInfo.json when mem-fs editor not provided', () => {
        const testPath = 'test-file-path';
        writeApplicationInfoSettings(testPath);
        const executeCommand = jest.fn();
        loadApplicationInfoFromSettings(executeCommand);
        expect(executeCommand).toHaveBeenCalledWith(testPath);
    });

    it('deleteAppInfoSettings should delete the appInfo.json file if it exists', () => {
        fs.write(appInfoFilePath, JSON.stringify(defaultAppInfoContents));
        deleteAppInfoSettings(fs);
        expect(fs.exists(appInfoFilePath)).toBe(false);
    });

    it('loadApplicationInfoFromSettings should execute command and delete the file', () => {
        const testPath = 'test-file-path';
        fs.write(appInfoFilePath, JSON.stringify({ latestGeneratedFiles: [testPath] }));
        const executeCommand = jest.fn();
        loadApplicationInfoFromSettings(executeCommand, fs);
        expect(executeCommand).toHaveBeenCalledWith(testPath);
        expect(fs.exists(appInfoFilePath)).toBe(false);
    });

    it('should throw an error if fs.delete fails', () => {
        // Create a mock file system that throws an error when delete is called
        const errorFs = create(createStorage());
        errorFs.write(appInfoFilePath, JSON.stringify(defaultAppInfoContents));
        // Override the delete method to throw an error
        errorFs.delete = jest.fn(() => {
            throw new Error('Mock delete error');
        });
        expect(() => deleteAppInfoSettings(errorFs)).toThrow(
            'Error deleting appInfo.json file: Error: Mock delete error'
        );
    });
});
