import { create as createStorage } from 'mem-fs';
import { create as createFS } from 'mem-fs-editor';
import nock from 'nock';
import { join } from 'node:path';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { TargetConfig } from '../../../src/types';
import {
    getLocalStoredCredentials,
    getTargetDefinition,
    getTargetMappingsConfig,
    sendRequest,
    writeSmartLinksConfig
} from '../../../src/smartlinks-config/utils';

// mocks
const storeRead = jest.fn();
jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn(() => {
        return { read: storeRead };
    })
}));
jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));
const isAppStudioMock = isAppStudio as jest.Mock;

// logger mock
const loggerMock = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;
let debugMock: jest.SpyInstance;
let infoMock: jest.SpyInstance;
let warnMock: jest.SpyInstance;

describe('utils', () => {
    // reusable test parameters
    const service = '/sap/bc/ui2/start_up';
    const params = {
        'action': '*',
        'depth': 0,
        'sap-language': 'EN',
        'shellType': 'FLP',
        'so': '*',
        'systemAliasesFormat': 'object'
    };
    const url = 'http://sap.example';

    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        debugMock = loggerMock.debug as any;
        infoMock = loggerMock.info as any;
        warnMock = loggerMock.warn as any;
    });

    describe('getLocalStoredCredentials', () => {
        test('existing credentials in secure storage', async () => {
            const credentials = { username: 'mockUser', password: 'mockPW' };
            storeRead.mockResolvedValueOnce(credentials);
            expect(await getLocalStoredCredentials('targetUrl', '000')).toEqual(credentials);
        });
        test('existing username in secure storage', async () => {
            const credentials = { username: 'mockUser', password: '' };
            storeRead.mockResolvedValueOnce({ username: 'mockUser' });
            expect(await getLocalStoredCredentials('targetUrl')).toEqual(credentials);
        });
        test('non-existing credentials in secure storage', async () => {
            storeRead.mockResolvedValueOnce(undefined);
            expect(await getLocalStoredCredentials('targetUrl', '000')).toEqual(undefined);
        });
        test('Store throws error', async () => {
            storeRead.mockRejectedValueOnce('Throw Error');
            await getLocalStoredCredentials('targetUrl', '000', loggerMock);
            expect(warnMock).toHaveBeenCalledWith('Retrieving stored credentials failed.');
            expect(debugMock).toHaveBeenCalledWith('Throw Error');
        });
        test('Store throws error (no logger)', async () => {
            storeRead.mockRejectedValueOnce('Throw Error');
            await getLocalStoredCredentials('targetUrl');
            expect(warnMock).not.toHaveBeenCalled();
            expect(debugMock).not.toHaveBeenCalled();
        });
    });

    describe('sendRequest', () => {
        beforeEach(() => {
            isAppStudioMock.mockReturnValue(false);
        });

        const targetResponseMock = { 'targetMappings': 'mockData' };

        const config = {
            target: { url, client: '000' },
            ignoreCertErrors: true,
            auth: { username: 'mockUser', password: 'mockPW' }
        };
        const expectDebugInfo = (calls: unknown[][]) => {
            expect(calls[0][0]).toContain('Connecting to');
            expect(calls[1][0]).toContain('Connected');
        };
        test('local environment: all parameters provided', async () => {
            nock(config.target.url)
                .get(service)
                .query({ ...params, 'sap-client': config.target.client })
                .reply(200, JSON.stringify(targetResponseMock));
            const result = await sendRequest(config, loggerMock);
            expectDebugInfo(infoMock.mock.calls);
            expect(result).toEqual(targetResponseMock);
        });
        test('local environment: just url', async () => {
            nock(config.target.url).get(service).query(params).reply(200, JSON.stringify(targetResponseMock));
            const result = await sendRequest({ target: { url } }, loggerMock);
            expectDebugInfo(infoMock.mock.calls);
            expect(result).toEqual(targetResponseMock);
        });
        test('in BAS with destination', async () => {
            const destination = 'MOCK_DESTINATION';
            isAppStudioMock.mockReturnValue(true);
            nock(`https://${destination}.dest`)
                .get(service)
                .query(params)
                .reply(200, JSON.stringify(targetResponseMock));
            const result = await sendRequest({ target: { destination } }, loggerMock);
            expectDebugInfo(infoMock.mock.calls);
            expect(result).toEqual(targetResponseMock);
        });
        test('empty data response', async () => {
            nock(config.target.url).get(service).query(params).reply(200, undefined);
            try {
                await sendRequest({ target: { url } }, loggerMock);
                fail('Error should have been thrown');
            } catch (error) {
                expect(debugMock.mock.calls.length).toBe(1);
                expect(debugMock).toHaveBeenCalledWith(
                    `Request failed. Error: Invalid response from http://sap.example: status: 200. data: ''.`
                );
                expect(infoMock.mock.calls[0][0]).toContain('Connecting to');
            }
        });
        test('Connection error - throw error', async () => {
            const errorMsg = 'Connection Error';
            nock(config.target.url)
                .get(() => true)
                .replyWithError(errorMsg);
            try {
                await sendRequest(config, loggerMock);
                fail('Error should have been thrown');
            } catch (error) {
                expect(debugMock.mock.calls.length).toBe(1);
                expect(debugMock).toHaveBeenCalledWith(`Request failed. Error: ${errorMsg}`);
                expect(infoMock.mock.calls[0][0]).toContain('Connecting to');
            }
        });
        test('Connection error - status 404', async () => {
            nock(config.target.url)
                .get(() => true)
                .query(params)
                .reply(404);
            try {
                await sendRequest(config, loggerMock);
                fail('Error should have been thrown');
            } catch (error) {
                expect(debugMock.mock.calls.length).toBe(1);
                expect(debugMock.mock.calls[0][0]).toContain(`Request failed. Error:`);
                expect(infoMock.mock.calls[0][0]).toContain('Connecting to');
            }
        });
        test('Connection error - throw error (no logger)', async () => {
            const errorMsg = 'Connection Error';
            nock(config.target.url)
                .get(() => true)
                .replyWithError(errorMsg);
            try {
                await sendRequest(config);
                fail('Error should have been thrown');
            } catch (error) {
                expect(debugMock).not.toHaveBeenCalled();
                expect(error.message).toEqual(errorMsg);
            }
        });
        test('No url/destination provided - throw error', async () => {
            try {
                await sendRequest({ target: {} }, loggerMock);
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toEqual('Please provide a target for the configuration.');
            }
        });
    });

    describe('getTargetDefinition', () => {
        test('target in deploy.yaml', async () => {
            const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
            expect(await getTargetDefinition(basePath, loggerMock as any)).toMatchInlineSnapshot(`
                Object {
                  "ignoreCertErrors": undefined,
                  "target": Object {
                    "client": 100,
                    "destination": "ABC123",
                    "url": "https://abc.example",
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
        test('target available (no logger)', async () => {
            const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
            await getTargetDefinition(basePath);
            expect(infoMock).not.toHaveBeenCalled();
            expect(warnMock).not.toHaveBeenCalled();
        });
        test('no target available (no logger)', async () => {
            const basePath = join(__dirname, '../../fixtures/no-ui5-deploy-config');
            await getTargetDefinition(basePath);
            expect(infoMock).not.toHaveBeenCalled();
            expect(warnMock).not.toHaveBeenCalled();
        });
    });

    describe('writeSmartLinksConfig', () => {
        const fs = createFS(createStorage());
        const copyTemplateSpy = jest.spyOn(fs, 'copyTpl');
        const sandboxExistsSpy = jest.spyOn(fs, 'exists');
        const readSandboxSpy = jest.spyOn(fs, 'readJSON');
        const extendSandboxSpy = jest.spyOn(fs, 'extendJSON');

        const config: TargetConfig = { target: { url } };
        const getSandboxJSON = (targets?: any) => ({
            'services': {
                'ClientSideTargetResolution': {
                    'adapter': {
                        'config': {
                            'inbounds': targets ? targets : undefined
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
            nock(url).get(service).query(params).reply(200, targetResults);
            sandboxExistsSpy.mockReturnValueOnce(false);
            await writeSmartLinksConfig('mockBasePath', config, fs, loggerMock);
            expect(copyTemplateSpy).toHaveBeenCalled();
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
            nock(url).get(service).query(params).reply(200, targetResults);

            await writeSmartLinksConfig('mockBasePath', config, fs, loggerMock);
            expect(extendSandboxSpy).toHaveBeenCalled();
        });
        test('Update fioriSandboxConfig.json - existing file, no targets', async () => {
            const sandboxJSON = getSandboxJSON();
            readSandboxSpy.mockReturnValue(sandboxJSON);
            sandboxExistsSpy.mockReturnValueOnce(true);
            nock(url).get(service).query(params).reply(200, targetResults);

            await writeSmartLinksConfig('mockBasePath', config, fs, loggerMock);
            expect(extendSandboxSpy).toHaveBeenCalled();
        });
        test('Overwrite fioriSandboxConfig.json - existing target with same key', async () => {
            const ResponseMapping = {
                semanticObject: 'ExistingSemanticObject',
                action: 'ExistingAction',
                signature: {}
            };
            const sandboxJSON = getSandboxJSON(ResponseMapping);
            readSandboxSpy.mockReturnValue(sandboxJSON);
            sandboxExistsSpy.mockReturnValueOnce(true);
            nock(url).get(service).query(params).reply(200, targetResults);

            await writeSmartLinksConfig('mockBasePath', config, fs, loggerMock);
            expect(extendSandboxSpy).toHaveBeenCalled();
        });
        test('No target mappings', async () => {
            const errorMsg = 'No target definition found ';
            nock(url).get(service).query(params).replyWithError(errorMsg);
            try {
                await getTargetMappingsConfig(config, loggerMock);
                fail('Error should have been thrown');
            } catch (error) {
                expect(error.message).toEqual(errorMsg);
            }
        });
    });
});
