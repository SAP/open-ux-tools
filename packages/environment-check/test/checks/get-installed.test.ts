import * as command from '../../src/command';
import {
    getCFCliToolVersion,
    getFioriGenVersion,
    getInstalledExtensions,
    getProcessVersions
} from '../../src/checks/get-installed';
import fs from 'fs';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getLogger } from '../../src/logger';

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
            'vscode-ui5-language-assistant': { version: '3.3.0' },
            'sap-ux-application-modeler-extension': { version: '1.7.4' },
            'yeoman-ui': { version: '1.7.11' },
            'xml-toolkit': { version: '1.1.0' }
        };
        jest.spyOn(fs, 'readdirSync').mockImplementationOnce(() => {
            return [
                `sap-ux-application-modeler-extension-1.7.4.vsix`,
                `yeoman-ui-1.7.11.vsix`,
                `xml-toolkit-1.1.0.vsix`,
                `vscode-dependencies-validation-1.8.0.vsix`,
                `vscode-ui5-language-assistant-3.3.0.vsix`
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
        jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
            throw new Error('Could not read directory');
        });
        const result = await getInstalledExtensions();
        expect(result).toBe(undefined);
    });

    test('getInstalledExtensions() (throw error with logger)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const logger = getLogger();
        jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
            throw new Error('Could not read directory');
        });
        const result = await getInstalledExtensions(logger);
        const messages = logger.getMessages();
        expect(result).toBe(undefined);
        expect(messages).toStrictEqual([
            { 'severity': 'error', 'text': 'Error retrieving installed extensions: Could not read directory' }
        ]);
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
        const output = `some/path/to/lib/node_modules`;
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(
            `{  "name": "@sap/generator-fiori",  "displayName": "SAP Fiori application",  "version": "1.7.5",  "description": "Create an SAPUI5 application using SAP Fiori elements or a freestyle approach"  }`
        );
        const result = await getFioriGenVersion();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getFioriGenVersion() (npm --location=global WARN BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const expectedResult = '1.7.5';
        const outputWarning = `npm WARN config global --global, --local are deprecated. Use --location=global instead --some/path/to/lib/node_modules`;
        const output = `some/path/to/lib/node_modules`;

        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(outputWarning);
        jest.spyOn(command, 'spawnCommand').mockResolvedValueOnce(output);

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(
            `{  "name": "@sap/generator-fiori",  "displayName": "SAP Fiori application",  "version": "1.7.5",  "description": "Create an SAPUI5 application using SAP Fiori elements or a freestyle approach"  }`
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

    test('getProcessVersions() (VSCODE)', async () => {
        jest.spyOn(command, 'spawnCommand').mockImplementationOnce(async () => {
            return `{"node":"16.17.0","v8":"9.4.146.26-node.22","uv":"1.43.0","zlib":"1.2.11","brotli":"1.0.9"}`;
        });
        const result = await getProcessVersions();
        expect(result).toStrictEqual({
            node: '16.17.0',
            v8: '9.4.146.26-node.22',
            uv: '1.43.0',
            zlib: '1.2.11',
            brotli: '1.0.9'
        });
    });

    test('getProcessVersions() errror', async () => {
        jest.spyOn(command, 'spawnCommand').mockImplementation(() => {
            throw new Error('spawn error');
        });
        const result = await getProcessVersions();
        expect(result).toStrictEqual({});
    });

    test('getProcessVersions() (error with logger)', async () => {
        jest.spyOn(command, 'spawnCommand').mockImplementation(() => {
            throw new Error('spawn error');
        });
        const logger = getLogger();
        const result = await getProcessVersions(logger);
        const messages = logger.getMessages();
        expect(result).toStrictEqual({});
        expect(messages).toStrictEqual([
            { 'severity': 'error', 'text': 'Error retrieving process versions: spawn error' }
        ]);
    });
});
