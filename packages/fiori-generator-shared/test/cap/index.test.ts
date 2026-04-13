import { jest } from '@jest/globals';
import * as actualFs from 'node:fs';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockReadFileSync = jest.fn<any>(actualFs.readFileSync);

jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    readFileSync: mockReadFileSync
}));

jest.unstable_mockModule('@vscode-logging/logger', () => ({
    getExtensionLogger: jest.fn()
}));

const { getCapFolderPathsSync } = await import('../../src/');

describe('getCapFolderPaths', () => {
    const testCapProject = join(__dirname, '../fixtures/test-cap-project');
    test('should return correct folders from exisiting folders and configs', () => {
        const capPaths = getCapFolderPathsSync(testCapProject);

        expect(capPaths).toEqual({
            app: 'app/',
            db: 'databases/',
            srv: 'services/'
        });
    });

    test('should not throw error with invalid config', () => {
        mockReadFileSync.mockImplementation(() => {
            throw new Error('Error reading config');
        });

        const capPaths = getCapFolderPathsSync(testCapProject);

        expect(capPaths).toEqual({
            app: 'app/',
            db: 'db/',
            srv: 'srv/'
        });
    });
});
