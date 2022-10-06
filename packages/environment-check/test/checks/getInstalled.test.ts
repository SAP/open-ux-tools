import * as command from '../../src/command';
import { getCFCliToolVersion, getFioriGenVersion, getInstalledExtensions } from '../../src/checks/getInstalled';
import fs from 'fs';
import { isAppStudio } from '@sap-ux/btp-utils';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;

describe('Test install functions', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('getInstalledExtensions() (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const expectedResult = {
            'sap-ux-application-modeler-extension': { version: '1.7.4' },
            'yeoman-ui': { version: '1.7.11' },
            'xml-toolkit': { version: '1.1.0' }
        };
        jest.spyOn(fs, 'readdirSync').mockImplementationOnce(() => {
            return [
                `sap-ux-application-modeler-extension-1.7.4.vsix`,
                `yeoman-ui-1.7.11.vsix`,
                `xml-toolkit-1.1.0.vsix`,
                `vscode-dependencies-validation-1.8.0.vsix`
            ] as any;
        });

        const result = await getInstalledExtensions();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getInstalledExtensions() (VSCODE)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        const expectedResult = {
            'yeoman-ui': { version: '2' },
            'vscode-ui5-language-assistant': { version: '2' },
            'xml-toolkit': { version: '2' }
        };

        const output = `SAPOS.yeoman-ui@2\nSAPOSS.vscode-ui5-language-assistant@2\nSAPOSS.xml-toolkit@2`;
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);
        const result = await getInstalledExtensions();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getInstalledExtensions() (throw error)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const consoleSpy = jest.spyOn(console, 'error');
        jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
            throw new Error('Could not read directory');
        });
        const result = await getInstalledExtensions();
        expect(result).toBe(undefined);
        expect(consoleSpy).toHaveBeenCalledWith('Error retrieving installed extensions: Could not read directory');
    });

    test('getCFCliToolVersion()', async () => {
        const expectedResult = '7.2.0';

        const output = `cf version 7.2.0+be4a5ce2b.2020-12-10`;
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);
        const result = await getCFCliToolVersion();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getCFCliToolVersion() (throw error)', async () => {
        jest.spyOn(command, 'spawnCommand').mockImplementation(async () => {
            throw new Error('Command not found');
        });
        const result = await getCFCliToolVersion();
        expect(result).toStrictEqual('Not installed or not found');
    });

    test('getFioriGenVersion() (VSCODE)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        const expectedResult = '1.7.5';

        const output = `some/path/to/lib/node_modules`;
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(
            `{  "name": "@sap/generator-fiori",  "displayName": "SAP Fiori application",  "version": "1.7.5",  "description": "Create an SAPUI5 application using SAP Fiori elements or a freestyle approach"  }`
        );
        const result = await getFioriGenVersion();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getFioriGenVersion() (not installed) (VSCODE)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        const output = `some/path/to/lib/node_modules`;
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);

        const result = await getFioriGenVersion();
        expect(result).toStrictEqual('Not installed or not found');
    });

    test('getFioriGenVersion() (throw error) (VSCODE)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        jest.spyOn(command, 'spawnCommand').mockImplementation(async () => {
            throw new Error('Command not found');
        });
        const result = await getFioriGenVersion();
        expect(result).toStrictEqual('Not installed or not found');
    });

    test('getFioriGenVersion() (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const expectedResult = '1.7.5';

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(
            `{  "dependencies": { "@sap/generator-fiori": "1.7.5"  }}`
        );
        const result = await getFioriGenVersion();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getFioriGenVersion() (not installed) (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);

        const result = await getFioriGenVersion();
        expect(result).toStrictEqual('Not installed or not found');
    });
});
