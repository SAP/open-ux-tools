import { jest } from '@jest/globals';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import type { CheckEnvironmentOptions } from '../../src';
import { DevelopmentEnvironment, Severity } from '../../src/types';

jest.unstable_mockModule('axios', () => ({
    __esModule: true,
    default: { get: jest.fn() }
}));

const mockIsAppStudio = jest.fn();
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    getAppStudioProxyURL: jest.fn()
}));

const mockCheckBASDestinations = jest.fn();
jest.unstable_mockModule('../../src/checks/destination', () => ({
    checkBASDestinations: mockCheckBASDestinations,
    needsUsernamePassword: jest.fn(),
    checkBASDestination: jest.fn()
}));

const mockCheckSapSystem = jest.fn();
jest.unstable_mockModule('../../src/checks/endpoint', () => ({
    checkEndpoint: mockCheckSapSystem
}));

const mockCheckStoredSystems = jest.fn();
jest.unstable_mockModule('../../src/checks/stored-system', () => ({
    checkStoredSystems: mockCheckStoredSystems
}));

const mockGetFioriGenVersion = jest.fn();
const mockGetCFCliToolVersion = jest.fn();
const mockGetInstalledExtensions = jest.fn();
const mockGetProcessVersions = jest.fn();
jest.unstable_mockModule('../../src/checks/get-installed', () => ({
    getFioriGenVersion: mockGetFioriGenVersion,
    getCFCliToolVersion: mockGetCFCliToolVersion,
    getInstalledExtensions: mockGetInstalledExtensions,
    getProcessVersions: mockGetProcessVersions
}));

const { checkEnvironment, getEnvironment } = await import('../../src/checks/environment');

const nodeJSProcessVersions = {
    'node': '16.17.0',
    'v8': '9.4.146.26-node.22',
    'uv': '1.43.0',
    'zlib': '1.2.11',
    'ares': '1.18.1',
    'modules': '93',
    'openssl': '1.1.1q+quic',
    'http_parser': '1'
};
describe('Test for getEnvironmentCheck()', () => {
    test('Ensure correct dev environment (VSCode)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockGetFioriGenVersion.mockResolvedValueOnce('1');
        mockGetCFCliToolVersion.mockResolvedValueOnce('2');
        mockGetInstalledExtensions.mockResolvedValueOnce({});
        mockGetProcessVersions.mockResolvedValueOnce(nodeJSProcessVersions);
        const { environment, messages } = await getEnvironment();
        expect(environment.developmentEnvironment === DevelopmentEnvironment.VSCode).toBeTruthy();
        expect(messages.length).toBeGreaterThan(0);
    });

    test('Ensure correct dev environment (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockGetFioriGenVersion.mockResolvedValueOnce('1');
        mockGetCFCliToolVersion.mockResolvedValueOnce('2');
        mockGetInstalledExtensions.mockResolvedValueOnce({});
        mockGetProcessVersions.mockResolvedValueOnce(nodeJSProcessVersions);
        const { environment, messages } = await getEnvironment();
        expect(environment.developmentEnvironment === DevelopmentEnvironment.BAS).toBeTruthy();
        expect(messages.length).toBeGreaterThan(0);
    });
});

describe('Test for checkEnvironment() (BAS)', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockIsAppStudio.mockReturnValue(true);
        mockGetProcessVersions.mockResolvedValueOnce(nodeJSProcessVersions);
        mockGetFioriGenVersion.mockResolvedValueOnce('1');
        mockGetCFCliToolVersion.mockResolvedValueOnce('2');
        mockGetInstalledExtensions.mockResolvedValueOnce({});
    });

    test('Test destinations', async () => {
        const data = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEUsage: 'odata_abap',
                Host: 'https://one.dest:123'
            },
            {
                Name: 'TWO',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'OnPremise',
                Description: 'TWO_DESC',
                'sap-client': '111',
                WebIDEUsage: 'odata_abap,dev_abap',
                Host: 'http://two.dest:234',
                WebIDEExposedHost: 'http://two.dest:345'
            }
        ];

        mockCheckBASDestinations.mockImplementationOnce(() => Promise.resolve({ messages: [], destinations: data }));
        mockCheckSapSystem.mockImplementationOnce(() => Promise.resolve({ messages: [], sapSystemResults: {} }));
        const options: CheckEnvironmentOptions = {
            workspaceRoots: [join(__dirname, '..', 'sample-workspace')],
            endpoints: ['ONE']
        };

        // Test execution
        const result = await checkEnvironment(options);

        // Result check
        expect(result.endpoints).toEqual(data);
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBe(17);
        expect(result.requestedChecks).toEqual(['environment', 'destinations', 'endpointResults']);
    });

    test('No deep dive destination, getEnvironmentCheck()', async () => {
        const data = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEUsage: 'odata_abap',
                Host: 'https://one.dest:123'
            }
        ];

        mockCheckBASDestinations.mockImplementationOnce(() => Promise.resolve({ messages: [], destinations: data }));

        const options: CheckEnvironmentOptions = {
            workspaceRoots: ['test/workspace']
        };

        // Test execution
        const result = await checkEnvironment(options);
        const infoMessage = result.messages?.find(
            (m) => m.text.includes('No destinations details requested') && m.severity === Severity.Info
        );

        // Result check
        expect(infoMessage).toBeDefined();
        expect(result.endpoints).toEqual(data);
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.endpointResults).toBeDefined();
    });
    test('Checking for deep dive destination that does not exist in the list, getEnvironmentCheck()', async () => {
        const data = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEUsage: 'odata_abap',
                Host: 'https://one.dest:123'
            }
        ];

        mockCheckBASDestinations.mockImplementationOnce(() => Promise.resolve({ messages: [], destinations: data }));
        mockCheckSapSystem.mockImplementationOnce(() => Promise.resolve({ messages: [], sapSystemResults: {} }));

        const options: CheckEnvironmentOptions = {
            workspaceRoots: [join(__dirname, '..', 'sample-workspace')],
            endpoints: ['NotInList']
        };

        // Test execution
        const result = await checkEnvironment(options);

        // Result check
        expect(result.endpoints).toEqual(data);
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.endpointResults).toBeDefined();
    });
});

describe('Test for checkEnvironment() (VSCODE)', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockIsAppStudio.mockReturnValue(false);
    });
    test('Testing getToolsExtensions', async () => {
        const extensionVersions = {
            'yeoman-ui': { version: '2' },
            'vscode-ui5-language-assistant': { version: '2' },
            'xml-toolkit': { version: '2' },
            'sap-ux-annotation-modeler-extension': { version: '2.2' },
            'sap-ux-application-modeler-extension': { version: '2' },
            'sap-ux-help-extension': { version: '2' },
            'sap-ux-service-modeler-extension': { version: '2.4' },
            'vscode-cds': { version: '2' }
        };

        const expectedData = {
            fioriGenVersion: '1',
            cloudCli: '2',
            appWizard: '2',
            ui5LanguageAssistant: '2',
            xmlToolkit: '2',
            annotationMod: '2.2',
            appMod: '2',
            help: '2',
            serviceMod: '2.4',
            cds: '2'
        };

        mockGetFioriGenVersion.mockResolvedValueOnce('1');
        mockGetCFCliToolVersion.mockResolvedValueOnce('2');
        mockGetInstalledExtensions.mockResolvedValueOnce(extensionVersions);
        mockGetProcessVersions.mockResolvedValueOnce(nodeJSProcessVersions);

        mockCheckStoredSystems.mockImplementationOnce(() => Promise.resolve({ messages: [], storedSystems: [] }));
        mockCheckSapSystem.mockImplementationOnce(() => Promise.resolve({ messages: [], sapSystemResults: {} }));

        // Test execution
        const result = await checkEnvironment();
        expect(result.environment?.toolsExtensions).toEqual(expectedData);
    });

    test('Testing getToolsExtensions (no extensions installed)', async () => {
        const expectedData = {
            annotationMod: 'Not installed.',
            appMod: 'Not installed.',
            appWizard: 'Not installed.',
            cds: 'Not installed.',
            cloudCli: '2',
            fioriGenVersion: '1',
            help: 'Not installed.',
            serviceMod: 'Not installed.',
            ui5LanguageAssistant: 'Not installed.',
            xmlToolkit: 'Not installed.'
        };

        mockGetFioriGenVersion.mockResolvedValueOnce('1');
        mockGetCFCliToolVersion.mockResolvedValueOnce('2');
        mockGetInstalledExtensions.mockResolvedValueOnce({});
        mockGetProcessVersions.mockResolvedValueOnce(nodeJSProcessVersions);
        mockCheckStoredSystems.mockImplementationOnce(() => Promise.resolve({ messages: [], storedSystems: [] }));
        mockCheckSapSystem.mockImplementationOnce(() => Promise.resolve({ messages: [], sapSystemResults: {} }));

        // Test execution
        const result = await checkEnvironment();
        expect(result.environment?.toolsExtensions).toEqual(expectedData);
    });
});
