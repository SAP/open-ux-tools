import { readFileSync } from 'node:fs';
import { exec } from 'node:child_process';

import { getPackageInfo, installDependencies } from '../../../src/utils/deps';

jest.mock('child_process', () => ({
    ...jest.requireActual('child_process'),
    exec: jest.fn()
}));

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn()
}));

const execMock = exec as unknown as jest.Mock;
const readFileSyncMock = readFileSync as jest.Mock;

const mockPackage = { name: '@sap-ux/generator-adp', version: '0.0.1', displayName: 'SAPUI5 Adaptation Project' };

describe('installDependencies', () => {
    const dummyProjectPath = '/dummy/path';

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve when npm install succeeds', async () => {
        execMock.mockImplementation((command: string, callback: Function) => {
            callback(null, { stdout: 'ok', stderr: '' });
        });

        await expect(installDependencies(dummyProjectPath)).resolves.toBeUndefined();

        expect(exec).toHaveBeenCalledWith(`cd ${dummyProjectPath} && npm i`, expect.any(Function));
    });

    it('should throw an error when npm install fails', async () => {
        const error = new Error('Installation failed');
        execMock.mockImplementation((command: string, callback: Function) => {
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
        readFileSyncMock.mockReturnValue(JSON.stringify(mockPackage));
        const result = getPackageInfo();

        expect(result).toEqual(mockPackage);
    });
});
