import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import {
    writeApplicationInfoSettings,
    deleteAppInfoSettings,
    loadApplicationInfoFromSettings,
    appInfoFilePath,
    defaultAppInfoContents
} from '../src/index.js';
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

    it('loadApplicationInfoFromSettings should respect setting when disabled', () => {
        const testPath = 'test-file-path';
        fs.write(appInfoFilePath, JSON.stringify({ latestGeneratedFiles: [testPath] }));
        const executeCommand = jest.fn();
        const getConfiguration = jest.fn(() => ({
            get: jest.fn((key: string, defaultValue?: boolean) => {
                if (key === 'ApplicationWizard.autoOpenApplicationInfoPage') {
                    return false; // Setting disabled
                }
                return defaultValue;
            })
        }));
        loadApplicationInfoFromSettings(executeCommand, fs, getConfiguration);
        expect(executeCommand).not.toHaveBeenCalled(); // Command should NOT be executed
        expect(fs.exists(appInfoFilePath)).toBe(false); // File should still be deleted
    });

    it('loadApplicationInfoFromSettings should execute command when setting enabled', () => {
        const testPath = 'test-file-path';
        fs.write(appInfoFilePath, JSON.stringify({ latestGeneratedFiles: [testPath] }));
        const executeCommand = jest.fn();
        const getConfiguration = jest.fn(() => ({
            get: jest.fn((key: string, defaultValue?: boolean) => {
                if (key === 'ApplicationWizard.autoOpenApplicationInfoPage') {
                    return true; // Setting enabled
                }
                return defaultValue;
            })
        }));
        loadApplicationInfoFromSettings(executeCommand, fs, getConfiguration);
        expect(executeCommand).toHaveBeenCalledWith(testPath); // Command SHOULD be executed
        expect(fs.exists(appInfoFilePath)).toBe(false);
    });

    it('loadApplicationInfoFromSettings should default to enabled when getConfiguration not provided', () => {
        const testPath = 'test-file-path';
        fs.write(appInfoFilePath, JSON.stringify({ latestGeneratedFiles: [testPath] }));
        const executeCommand = jest.fn();
        loadApplicationInfoFromSettings(executeCommand, fs); // No getConfiguration parameter
        expect(executeCommand).toHaveBeenCalledWith(testPath); // Should execute (default: true)
        expect(fs.exists(appInfoFilePath)).toBe(false);
    });

    it('loadApplicationInfoFromSettings should default to enabled when getConfiguration returns undefined', () => {
        const testPath = 'test-file-path';
        fs.write(appInfoFilePath, JSON.stringify({ latestGeneratedFiles: [testPath] }));
        const executeCommand = jest.fn();
        const getConfiguration = jest.fn(() => ({
            get: jest.fn(() => undefined) // Returns undefined
        }));
        loadApplicationInfoFromSettings(executeCommand, fs, getConfiguration);
        expect(executeCommand).toHaveBeenCalledWith(testPath); // Should execute (default via fallback)
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
