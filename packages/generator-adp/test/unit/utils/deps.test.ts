import { jest } from '@jest/globals';
import { join } from 'node:path';

const mockExec = jest.fn<typeof realChildProcess.exec>();
const mockReadFileSync = jest.fn<typeof realFs.readFileSync>();

const realChildProcess = await import('node:child_process');
jest.unstable_mockModule('node:child_process', () => ({
    ...realChildProcess,
    exec: mockExec
}));

const realFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...realFs,
    readFileSync: mockReadFileSync
}));

const { getPackageInfo, installDependencies } = await import('../../../src/utils/deps.js');

const mockPackage = { name: '@sap-ux/generator-adp', version: '0.0.1', displayName: 'SAPUI5 Adaptation Project' };

describe('installDependencies', () => {
    const dummyProjectPath = '/dummy/path';

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve when npm install succeeds', async () => {
        mockExec.mockImplementation(((command, callback) => {
            callback(null, { stdout: 'ok', stderr: '' });
        }) as unknown as typeof realChildProcess.exec);

        await expect(installDependencies(dummyProjectPath)).resolves.toBeUndefined();

        expect(mockExec).toHaveBeenCalledWith(`cd ${dummyProjectPath} && npm i`, expect.any(Function));
    });

    it('should throw an error when npm install fails', async () => {
        const error = new Error('Installation failed');
        mockExec.mockImplementation(((command, callback) => {
            callback(error, null);
        }) as unknown as typeof realChildProcess.exec);

        await expect(installDependencies(dummyProjectPath)).rejects.toThrow('Installation of dependencies failed.');
    });
});

describe('getPackageInfo', () => {
    afterEach(() => {
        jest.clearAllMocks();
        delete (globalThis as Record<string, unknown>).__dirname;
    });

    it('should return the correct package.json', async () => {
        mockReadFileSync.mockReturnValue(JSON.stringify(mockPackage));
        const result = getPackageInfo();

        expect(result).toEqual(mockPackage);
    });

    it('should resolve the package.json path via __dirname when defined (CJS runtime)', () => {
        // The compiled CJS build runs with Node's `__dirname` global defined.
        // Under ts-jest's ESM transform it is undefined, so we simulate it
        // here to exercise the production code path.
        const fakeDir = join('abs', 'generators', 'utils');
        (globalThis as Record<string, unknown>).__dirname = fakeDir;
        mockReadFileSync.mockReturnValue(JSON.stringify(mockPackage));

        const result = getPackageInfo();

        const expectedPath = join(fakeDir, '..', '..', 'package.json');
        expect(result).toEqual(mockPackage);
        expect(mockReadFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8');
    });
});
