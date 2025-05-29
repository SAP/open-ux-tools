import { exec } from 'child_process';
import { getPackageInfo, installDependencies, setHeaderTitle } from '../../../src/utils/deps';
import { readFileSync } from 'fs';
import { AppWizard } from '@sap-devx/yeoman-ui-types';
import { IChildLogger } from '@vscode-logging/logger';

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

describe('setHeaderTitle', () => {
    const logger = { error: jest.fn() } as unknown as IChildLogger;

    beforeEach(() => {
        jest.clearAllMocks();

        readFileSyncMock.mockReturnValue(JSON.stringify(mockPackage));
    });

    it('should call setHeaderTitle with displayName and version', () => {
        const appWizard = { setHeaderTitle: jest.fn() } as unknown as AppWizard;

        setHeaderTitle({ appWizard }, logger);

        expect(appWizard.setHeaderTitle).toHaveBeenCalledWith(mockPackage.displayName, '@sap-ux/generator-adp@0.0.1');
    });

    it('should not throw if appWizard or setHeaderTitle is missing', () => {
        expect(() => setHeaderTitle({} as unknown as AppWizard, logger)).not.toThrow();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log an error if something throws inside the try block', () => {
        const appWizard = {
            setHeaderTitle: jest.fn(() => {
                throw new Error('Failed');
            })
        } as unknown as AppWizard;

        setHeaderTitle({ appWizard }, logger);

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("An error occurred while trying to set '@sap-ux/generator-adp' header: Failed")
        );
    });
});
