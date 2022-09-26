import * as command from '../../src/command';
import { getCFCliToolVersion, getFioriGenVersion, getInstalledExtensions } from '../../src/checks/install';
import { NpmModules } from '../../src/types';
import fs from 'fs';

describe('Test install functions', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('getInstalledExtensions()', async () => {
        const expectedResult = {
            'SAPOS.yeoman-ui': { version: '2' },
            'SAPOSS.vscode-ui5-language-assistant': { version: '2' },
            'SAPOSS.xml-toolkit': { version: '2' }
        };

        const output = `SAPOS.yeoman-ui@2\nSAPOSS.vscode-ui5-language-assistant@2\nSAPOSS.xml-toolkit@2`;
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);
        const result = await getInstalledExtensions();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getCFCliToolVersion()', async () => {
        const expectedResult = '7.2.0';

        const output = `cf version 7.2.0+be4a5ce2b.2020-12-10`;
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);
        const result = await getCFCliToolVersion(NpmModules.CloudCliTools);
        expect(result).toStrictEqual(expectedResult);
    });

    test('getCFCliToolVersion() (throw error)', async () => {
        jest.spyOn(command, 'spawnCommand').mockImplementation(async () => {
            throw new Error('Command not found');
        });
        const result = await getCFCliToolVersion(NpmModules.CloudCliTools);
        expect(result).toStrictEqual('Not installed');
    });

    test('getFioriGenVersion()', async () => {
        const expectedResult = '1.7.5';

        const output = `some/path/to/lib/node_modules`;
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(
            `{  "name": "@sap/generator-fiori",  "displayName": "SAP Fiori application",  "version": "1.7.5",  "description": "Create an SAPUI5 application using SAP Fiori elements or a freestyle approach"  }`
        );
        const result = await getFioriGenVersion(NpmModules.FioriGenerator);
        expect(result).toStrictEqual(expectedResult);
    });

    test('getFioriGenVersion() (not installed)', async () => {
        const output = `some/path/to/lib/node_modules`;
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);

        const result = await getFioriGenVersion(NpmModules.FioriGenerator);
        expect(result).toStrictEqual('Not installed');
    });

    test('getFioriGenVersion() (throw error)', async () => {
        jest.spyOn(command, 'spawnCommand').mockImplementation(async () => {
            throw new Error('Command not found');
        });
        const result = await getFioriGenVersion(NpmModules.FioriGenerator);
        expect(result).toStrictEqual('Not installed');
    });
});
