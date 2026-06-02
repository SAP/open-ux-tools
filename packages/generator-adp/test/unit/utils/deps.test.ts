import { jest } from '@jest/globals';

const mockExec = jest.fn();
const mockReadFileSync = jest.fn();

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

const { getPackageInfo, installDependencies } = await import('../../../src/utils/deps');

const mockPackage = { name: '@sap-ux/generator-adp', version: '0.0.1', displayName: 'SAPUI5 Adaptation Project' };

describe('installDependencies', () => {
    const dummyProjectPath = '/dummy/path';

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve when npm install succeeds', async () => {
        mockExec.mockImplementation((command: string, callback: Function) => {
            callback(null, { stdout: 'ok', stderr: '' });
        });

        await expect(installDependencies(dummyProjectPath)).resolves.toBeUndefined();

        expect(mockExec).toHaveBeenCalledWith(`cd ${dummyProjectPath} && npm i`, expect.any(Function));
    });

    it('should throw an error when npm install fails', async () => {
        const error = new Error('Installation failed');
        mockExec.mockImplementation((command: string, callback: Function) => {
            callback(error, null);
        });

        await expect(installDependencies(dummyProjectPath)).rejects.toThrow('Installation of dependencies failed.');
    });
});

describe('getPackageInfo', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return the correct package.json', async () => {
        mockReadFileSync.mockReturnValue(JSON.stringify(mockPackage));
        const result = getPackageInfo();

        expect(result).toEqual(mockPackage);
    });
});
