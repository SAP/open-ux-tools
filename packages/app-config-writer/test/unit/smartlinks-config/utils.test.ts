import { create as createStorage } from 'mem-fs';
import { create as createFS } from 'mem-fs-editor';
import { join } from 'path';
import * as axiosExtension from '@sap-ux/axios-extension';
import * as btp from '@sap-ux/btp-utils';
import * as store from '@sap-ux/store';
import type { ToolsLogger } from '@sap-ux/logger';
import type { TargetConfig } from '../../../src/types';
import {
    getLocalStoredCredentials,
    getTargetDefinition,
    getTargetMappingsConfig,
    sendRequest,
    writeSmartLinksConfig
} from '../../../src/smartlinks-config/utils';

// Mocks
jest.mock('@sap-ux/axios-extension', () => ({
    ...jest.requireActual('@sap-ux/axios-extension'),
    create: jest.fn()
}));
jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn()
}));
jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

// axios-extension mock
const axiosGet = jest.fn();
const axiosMock = jest.spyOn(axiosExtension, 'create').mockReturnValue({ get: axiosGet } as any);
// store mock
const storeRead = jest.fn();
jest.spyOn(store, 'getService').mockReturnValue({ read: storeRead } as any);
// logger mock
const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;
let debugMock: jest.SpyInstance;
let infoMock: jest.SpyInstance;
let warnMock: jest.SpyInstance;
let isAppStudioMock: jest.SpyInstance;

beforeEach(() => {
    jest.clearAllMocks();
    isAppStudioMock = jest.spyOn(btp, 'isAppStudio');
    debugMock = loggerMock.debug as any;
    infoMock = loggerMock.info as any;
    warnMock = loggerMock.warn as any;
});

describe('Test getLocalStoredCredentials', () => {
    test('existing credentials in secure storage', async () => {
        const credentials = { username: 'mockUser', password: 'mockPW' };
        storeRead.mockResolvedValueOnce(credentials);
        expect(await getLocalStoredCredentials('targetUrl', '000')).toEqual(credentials);
    });
    test('non-existing credentials in secure storage', async () => {
        storeRead.mockResolvedValueOnce(undefined);
        expect(await getLocalStoredCredentials('targetUrl', '000')).toEqual(undefined);
    });
});
describe('Test sendRequest', () => {
    const targetResponseMock = { 'targetMappings': 'mockData' };
    beforeEach(() => {
        axiosGet.mockResolvedValue({ data: JSON.stringify(targetResponseMock) });
    });
    const config: TargetConfig = {
        target: { destination: 'mockDestination', url: 'mockUrl', client: '000' },
        ignoreCertErrors: true,
        auth: { username: 'mockUser', password: 'mockPW' }
    };
    const expectDebugInfo = (calls: any) => {
        expect(calls[0][0]).toContain('Connecting to');
        expect(calls[1][0]).toContain('Connection successful');
    };
    const expectCreate = (calls: any) => {
        expect(calls[0][0].auth).toEqual(config.auth);
        expect(calls[0][0].ignoreCertErrors).toEqual(config.ignoreCertErrors);
    };

    test('Connection successful - BAS instance with destination', async () => {
        isAppStudioMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
        const result = await sendRequest(config, loggerMock);
        expectCreate(axiosMock.mock.calls);
        expect(axiosGet.mock.calls[0][0]).toEqual(
            'https://mockDestination.dest/sap/bc/ui2/start_up?so=%2A&action=%2A&systemAliasesFormat=object&sap-language=EN&shellType=FLP&depth=0'
        );
        expectDebugInfo(infoMock.mock.calls);
        expect(result).toEqual(targetResponseMock);
    });
    test('Connection successful - local environment: parameters provided', async () => {
        const result = await sendRequest(config, loggerMock);
        expectCreate(axiosMock.mock.calls);
        expect(axiosGet.mock.calls[0][0]).toEqual(
            'mockUrl/sap/bc/ui2/start_up?so=%2A&action=%2A&systemAliasesFormat=object&sap-language=EN&shellType=FLP&depth=0&sap-client=000'
        );
        expectDebugInfo(infoMock.mock.calls);
        expect(result).toEqual(targetResponseMock);
    });
    test('Connection successful - no client provided', async () => {
        const result = await sendRequest({ ...config, target: { url: 'mockUrl' } }, loggerMock);
        expect(axiosGet.mock.calls[0][0]).toEqual(
            'mockUrl/sap/bc/ui2/start_up?so=%2A&action=%2A&systemAliasesFormat=object&sap-language=EN&shellType=FLP&depth=0'
        );
        expectCreate(axiosMock.mock.calls);
        expectDebugInfo(infoMock.mock.calls);
        expect(result).toEqual(targetResponseMock);
    });
    test('Connection error - no response', async () => {
        axiosGet.mockRejectedValue('Connection Error');
        try {
            await sendRequest(config, loggerMock);
            fail('Error should have been thrown');
        } catch (error) {
            expect(debugMock.mock.calls.length).toBe(1);
            expect(debugMock.mock.calls[0][0]).toEqual('Connection Error');
            expect(infoMock.mock.calls[0][0]).toContain('Connecting to');
        }
    });
});
describe('Test getTargetDefinition', () => {
    test('target in deploy.yaml', async () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        expect(await getTargetDefinition(basePath, loggerMock as any)).toMatchInlineSnapshot(`
            Object {
              "ignoreCertErrors": undefined,
              "target": Object {
                "url": "https://abc.abap.stagingaws.hanavlab.ondemand.com",
              },
            }
        `);
        expect(infoMock.mock.calls[0][0]).toContain('Searching for deploy target definition');
        expect(infoMock.mock.calls[1][0]).toContain('Deploy target definition found');
    });
    test('no deploy.yaml', async () => {
        const basePath = join(__dirname, '../../fixtures/no-ui5-deploy-config');
        expect(await getTargetDefinition(basePath, loggerMock as any)).not.toBeDefined();
        expect(infoMock.mock.calls[0][0]).toContain('Searching for deploy target definition');
        expect(infoMock.mock.calls[1]).not.toBeDefined();
        expect(debugMock.mock.calls[0][0].message).toContain(`File 'ui5-deploy.yaml' not found`);
        expect(warnMock.mock.calls[0][0]).toContain(`File 'ui5-deploy.yaml' not found`);
    });
});

describe('Test writeSmartLinksConfig', () => {
    const fs = createFS(createStorage());
    const copyTemplateSpy = jest.spyOn(fs, 'copyTpl');
    const sandboxExistsSpy = jest.spyOn(fs, 'exists');
    const readSandboxSpy = jest.spyOn(fs, 'readJSON');
    const extendSandboxSpy = jest.spyOn(fs, 'extendJSON');

    const config: TargetConfig = { target: { url: 'mockUrl' } };
    const getSandboxJSON = (existingInboundTargets: any) => ({
        'services': {
            'ClientSideTargetResolution': {
                'adapter': {
                    'config': {
                        'inbounds': { existingInboundTargets }
                    }
                }
            }
        }
    });
    const targetResults = {
        'targetMappings': {
            'ResponseMapping': {
                'semanticObject': 'MockObject1',
                'semanticAction': 'MockAction1',
                'formFactors': { 'desktop': true },
                'signature': {
                    'additionalParameters': 'allowed',
                    'parameters': {
                        'app-id': {
                            'required': true
                        }
                    }
                },
                'text': 'MockText'
            }
        }
    };

    test('Add fioriSandboxConfig.json - none existing', async () => {
        axiosGet.mockResolvedValue({ data: JSON.stringify(targetResults) });
        sandboxExistsSpy.mockReturnValueOnce(false);
        await writeSmartLinksConfig('mockBasePath', config, fs, loggerMock as any);
        expect(copyTemplateSpy).toBeCalled();
    });
    test('Update fioriSandboxConfig.json - existing target', async () => {
        const existingTarget = {
            'semanticObject': 'ExistingSemanticObject',
            'action': 'ExistingAction',
            'signature': { 'additionalParameters': 'allowed' },
            'resolutionResult': {}
        };
        const sandboxJSON = getSandboxJSON(existingTarget);
        readSandboxSpy.mockReturnValue(sandboxJSON);
        sandboxExistsSpy.mockReturnValueOnce(true);
        axiosGet.mockResolvedValue({ data: JSON.stringify(targetResults) });

        await writeSmartLinksConfig('mockBasePath', config, fs, loggerMock as any);
        expect(extendSandboxSpy).toBeCalled();
    });
    test('Overwrite fioriSandboxConfig.json - existing target with same key', async () => {
        const ResponseMapping = {
            'semanticObject': 'ExistingSemanticObject',
            'action': 'ExistingAction',
            'signature': {}
        };
        const sandboxJSON = getSandboxJSON(ResponseMapping);
        readSandboxSpy.mockReturnValue(sandboxJSON);
        sandboxExistsSpy.mockReturnValueOnce(true);
        axiosGet.mockResolvedValue({ data: JSON.stringify(targetResults) });

        await writeSmartLinksConfig('mockBasePath', config, fs, loggerMock as any);
        expect(extendSandboxSpy).toBeCalled();
    });
    test('No target mappings', async () => {
        axiosGet.mockResolvedValue({ data: JSON.stringify('') });
        try {
            await getTargetMappingsConfig(config, loggerMock as any);
            fail('Error should have been thrown');
        } catch (error) {
            expect(error.message).toEqual('No target definition found ');
        }
    });
});
