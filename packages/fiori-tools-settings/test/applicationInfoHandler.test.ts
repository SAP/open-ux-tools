import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import {
    addGeneratedFiles,
    initAppInfoSettings,
    loadApplicationInfoFromSettings,
    appInfoFilePath
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

    afterEach(async () => {
        await fsPromises.rm(appInfoFilePath).catch(() => {
            // Ignore errors if the file does not exist
        });
    });

    it('addGeneratedFiles should add a file path to appInfo.json', () => {
        const testPath = 'test-file-path';
        initAppInfoSettings(fs);
        addGeneratedFiles(testPath, fs);
        const appInfoContents = JSON.parse(fs.read(appInfoFilePath) || '{}');
        expect(appInfoContents.latestGeneratedFiles).toContain(testPath);
    });

    it('addGeneratedFiles should add a file path to appInfo.json when mem-fs editor not provided', async () => {
        const testPath = 'test-file-path';
        initAppInfoSettings();
        // Wait a bit for the commit to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        addGeneratedFiles(testPath);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const executeCommand = jest.fn();
        loadApplicationInfoFromSettings(executeCommand);
        expect(executeCommand).toHaveBeenCalledWith(testPath);
    });

    it('loadApplicationInfoFromSettings should execute command and delete the file', () => {
        const testPath = 'test-file-path';
        fs.write(appInfoFilePath, JSON.stringify({ latestGeneratedFiles: [testPath] }));
        const executeCommand = jest.fn();
        loadApplicationInfoFromSettings(executeCommand, fs);
        expect(executeCommand).toHaveBeenCalledWith(testPath);
        expect(fs.exists(appInfoFilePath)).toBe(false);
    });

    it('loadApplicationInfoFromSettings should respect autoOpen=false', () => {
        const testPath = 'test-file-path';
        fs.write(appInfoFilePath, JSON.stringify({ latestGeneratedFiles: [testPath] }));
        const executeCommand = jest.fn();
        loadApplicationInfoFromSettings(executeCommand, fs, false);
        expect(executeCommand).not.toHaveBeenCalled(); // Command should NOT be executed
        expect(fs.exists(appInfoFilePath)).toBe(false); // File should still be deleted
    });

    it('loadApplicationInfoFromSettings should execute command when autoOpen=true', () => {
        const testPath = 'test-file-path';
        fs.write(appInfoFilePath, JSON.stringify({ latestGeneratedFiles: [testPath] }));
        const executeCommand = jest.fn();
        loadApplicationInfoFromSettings(executeCommand, fs, true);
        expect(executeCommand).toHaveBeenCalledWith(testPath); // Command SHOULD be executed
        expect(fs.exists(appInfoFilePath)).toBe(false);
    });

    it('loadApplicationInfoFromSettings should default to enabled when autoOpen not provided', () => {
        const testPath = 'test-file-path';
        fs.write(appInfoFilePath, JSON.stringify({ latestGeneratedFiles: [testPath] }));
        const executeCommand = jest.fn();
        loadApplicationInfoFromSettings(executeCommand, fs); // No autoOpen parameter
        expect(executeCommand).toHaveBeenCalledWith(testPath); // Should execute (default: true)
        expect(fs.exists(appInfoFilePath)).toBe(false);
    });
});
