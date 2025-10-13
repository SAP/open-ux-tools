import { join } from 'node:path';
import nock from 'nock';
import {
    createForAbap,
    createForAbapOnCloud,
    AbapCloudEnvironment,
    TransportRequestService,
    TransportChecksService,
    ListPackageService,
    FileStoreService,
    BusinessObjectsService,
    GeneratorService,
    UI5RtVersionService,
    AbapCDSViewService
} from '../../src';
import type { AbapCloudOptions, AxiosError, AxiosRequestConfig, ProviderConfiguration } from '../../src';
import * as auth from '../../src/auth';
import type { ArchiveFileNode, SystemInfo } from '../../src/abap/types';
import fs from 'node:fs';
import cloneDeep from 'lodash/cloneDeep';
import type { ToolsLogger } from '@sap-ux/logger';
import * as Logger from '@sap-ux/logger';
import { UiServiceGenerator } from '../../src/abap/adt-catalog/generators/ui-service-generator';
import { Uaa } from '../../src/auth/uaa';
import * as reentranceTicketAuth from '../../src/auth/reentrance-ticket';

const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;

jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

jest.mock('open');

/**
 * URL are specific to the discovery schema.
 * Keep the URL paths same as those in packages/axios-extension/test/abap/mockResponses/discovery.xml
 */
enum AdtServices {
    DISCOVERY = '/sap/bc/adt/discovery',
    ATO_SETTINGS = '/sap/bc/adt/ato/settings',
    TRANSPORT_CHECKS = '/sap/bc/adt/cts/transportchecks',
    TRANSPORT_REQUEST = '/sap/bc/adt/cts/transports',
    LIST_PACKAGES = '/sap/bc/adt/repository/informationsystem/search',
    FILE_STORE = '/sap/bc/adt/filestore/ui5-bsp/objects',
    //BUSINESS_OBJECTS = '/sap/bc/adt/repository/informationsystem/search',
    GENERATOR = '/sap/bc/adt/repository/generators',
    PUBLISH = '/sap/bc/adt/businessservices/odatav4',
    UI5_RT_VERSION = '/sap/bc/adt/filestore/ui5-bsp/ui5-rt-version'
}

const server = 'https://server.example';
const config = {
    baseURL: server,
    auth: {
        username: 'USER',
        password: 'SECRET'
    }
};

const testPackage = 'ZSPD';
const testPackageNamespace = '/NS/ZSPD';
const testLocalPackage = '$TMP';
const testNewPakcage = 'NEWPACKAGE';
const testNewProject = 'zdummyexample';
const testExistProject = 'zdummyexist';
const testProjectNamespace = '/test/project';

// Discovery schema is cached, so separate this test suite from other ADT service tests
describe('ADT Services unavailable in discovery', () => {
    const provider = createForAbap(config);

    test('Services unavailable in discovery', async () => {
        nock(server).get(AdtServices.DISCOVERY).replyWithFile(200, join(__dirname, 'mockResponses/discovery-2.xml'));

        expect(await provider.getAtoInfo()).toStrictEqual({});

        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(transportChecksService).toStrictEqual(null);

        const transportRequestService = await provider.getAdtService<TransportRequestService>(TransportRequestService);
        expect(transportRequestService).toStrictEqual(null);
    });
});

describe('ADT discovery service errors', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const provider = createForAbap(config);

    test('ATO service - Invalid discovery schema format', async () => {
        nock(server).get(AdtServices.DISCOVERY).reply(200, 'Invalid non-XML text');
        expect(await provider.getAtoInfo()).toStrictEqual({});
    });

    test('ATO service - Invalid discovery schema content', async () => {
        nock(server).get(AdtServices.DISCOVERY).reply(200, '<root>Error message</root>');
        expect(await provider.getAtoInfo()).toStrictEqual({});
    });

    test('CTS service - Invalid discovery schema format', async () => {
        nock(server).get(AdtServices.DISCOVERY).reply(200, 'Invalid non-XML text');
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(transportChecksService).toStrictEqual(null);
    });

    test('CTS service - Invalid discovery schema content', async () => {
        nock(server).get(AdtServices.DISCOVERY).reply(200, '<root>Error message</root>');
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(transportChecksService).toStrictEqual(null);
    });
});

describe('Create new transport number', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const provider = createForAbap(config);
    const dummyComment = 'Created from axios-extension unit test';
    test('Create new transport number succeed', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_REQUEST)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportRequest-1.txt'));
        const transportRequestService = await provider.getAdtService<TransportRequestService>(TransportRequestService);
        expect(
            await transportRequestService?.createTransportRequest({
                packageName: 'dummyPackage',
                ui5AppName: 'dummyAppName',
                description: dummyComment
            })
        ).toStrictEqual('EC1K900436');
    });

    test('Create new transport number failed', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_REQUEST)
            .reply(200, 'unknown');
        const transportRequestService = await provider.getAdtService<TransportRequestService>(TransportRequestService);
        expect(
            await transportRequestService?.createTransportRequest({
                packageName: 'dummyPackage',
                ui5AppName: 'dummyAppName',
                description: dummyComment
            })
        ).toStrictEqual(null);
    });
});

describe('Transport checks', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
        jest.clearAllMocks();
    });

    const provider = createForAbap(config);

    test('Unexpected response - invalid XML', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .reply(200, 'Some error message from backend');
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService?.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
    });

    test('Unexpected response - error in XML', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-6.xml'));
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService?.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
        expect(loggerMock.error).toHaveBeenNthCalledWith(1, 'This is the first error message');
        expect(loggerMock.error).toHaveBeenNthCalledWith(2, 'This is the second error message');
    });

    test('Unexpected response - unknown XML', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .reply(200, '<unknown></unknown>');
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService?.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
    });

    test('Valid package name, existing project name - no transport number', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-4.xml'));
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService?.getTransportRequests(testPackage, testExistProject)).toStrictEqual([]);
    });

    test('Local package: no transport number required for deploy for both new and exist project', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-3.xml'));
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        await expect(transportChecksService?.getTransportRequests(testLocalPackage, testExistProject)).rejects.toThrow(
            TransportChecksService.LocalPackageError
        );
    });

    test('New package name: no transport number available', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-4.xml'));
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService?.getTransportRequests(testNewPakcage, testNewProject)).toStrictEqual([]);
    });

    test('Valid package name, new project name', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'), { random: `${Math.random()}` })
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-1.xml'), { random: `${Math.random()}` });
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        const transportRequestList = await transportChecksService?.getTransportRequests(testPackage, testNewProject);
        expect(transportRequestList).toStrictEqual([
            expect.objectContaining({
                transportNumber: 'EC1K900294',
                user: 'TESTUSER',
                description: 'Fiori tools',
                client: '100',
                targetSystem: 'DMY'
            }),
            expect.objectContaining({
                transportNumber: 'EC1K900295',
                user: 'TESTUSER2',
                description: 'Fiori tools',
                client: '100',
                targetSystem: 'DMY'
            })
        ]);
    });

    test('Valid package name, existing project name', async () => {
        const provider = createForAbap(config);
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-2.xml'));
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService?.getTransportRequests(testPackage, testExistProject)).toStrictEqual([
            expect.objectContaining({
                transportNumber: 'EC1K900294',
                user: 'TESTUSER',
                description: 'Fiori tools',
                targetSystem: 'DMY',
                client: '100'
            })
        ]);
    });

    test('Valid package name, existing project name with namespace', async () => {
        const provider = createForAbap(config);
        const postSpy = jest.spyOn(TransportChecksService.prototype, 'post');

        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-2.xml'));

        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);

        await transportChecksService?.getTransportRequests(testPackage, testProjectNamespace);

        expect(postSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining(`<URI>/sap/bc/adt/filestore/ui5-bsp/objects/%2Ftest%2Fproject/$create</URI>`),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Accept: 'application/vnd.sap.as+xml; dataname=com.sap.adt.transport.service.checkData',
                    'content-type':
                        'application/vnd.sap.as+xml; charset=UTF-8; dataname=com.sap.adt.transport.service.checkData'
                })
            })
        );
        postSpy.mockClear();
    });

    test('Valid package name with namespace', async () => {
        const provider = createForAbap(config);
        const postSpy = jest.spyOn(TransportChecksService.prototype, 'post');

        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-2.xml'));

        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);

        await transportChecksService?.getTransportRequests(testPackageNamespace, testProjectNamespace);

        const packageNamePattern = `<DEVCLASS>${testPackageNamespace}</DEVCLASS>`;
        const appNamePattern = `<URI>/sap/bc/adt/filestore/ui5-bsp/objects/${encodeURIComponent(
            testProjectNamespace
        )}/\\$create</URI>`;
        const combinedPattern = new RegExp(`${packageNamePattern}(\n|\r\n|\r|.)*${appNamePattern}`);
        expect(postSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringMatching(combinedPattern),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Accept: 'application/vnd.sap.as+xml; dataname=com.sap.adt.transport.service.checkData',
                    'content-type':
                        'application/vnd.sap.as+xml; charset=UTF-8; dataname=com.sap.adt.transport.service.checkData'
                })
            })
        );
        postSpy.mockClear();
    });
});

describe('Should create new connections', () => {
    const attachReentranceTicketAuthInterceptorSpy = jest.spyOn(auth, 'attachReentranceTicketAuthInterceptor');

    test('abap service provider for cloud - credentials not provided, always use reentrance', async () => {
        const getReentranceTicketSpy = jest
            .spyOn(reentranceTicketAuth, 'getReentranceTicket')
            .mockResolvedValueOnce({ reentranceTicket: 'reent_tecket_1234' });

        const attachUaaAuthInterceptorSpy = jest.spyOn(auth, 'attachUaaAuthInterceptor');
        Uaa.prototype.getAccessToken = jest.fn();
        Uaa.prototype.getAccessTokenWithClientCredentials = jest.fn();
        const configForAbapOnCloudNoCreds = {
            service: {
                url: server,
                uaa: {
                    clientid: 'ClientId',
                    clientsecret: 'ClientSecret',
                    url: server
                }
            } as any,
            environment: AbapCloudEnvironment.Standalone
        } as AbapCloudOptions & Partial<ProviderConfiguration>;
        nock(server)
            .get('/sap/public/bc/icf/virtualhost')
            .reply(200, { relatedUrls: { API: server, UI: server } })
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.ATO_SETTINGS)
            .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'))
            .get('/sap/bc/adt/core/http/systeminformation')
            .reply(200, {
                userFullName: 'User FullName',
                userName: 'userName01',
                client: '100',
                systemID: 'ABC01',
                language: 'EN'
            } as SystemInfo);

        const provider = createForAbapOnCloud(configForAbapOnCloudNoCreds);
        expect(await provider.isAbapCloud()).toBe(true);
        expect(await provider.user()).toBe('userName01');
        expect(Uaa.prototype.getAccessToken).toHaveBeenCalledTimes(0);
        expect(Uaa.prototype.getAccessTokenWithClientCredentials).toHaveBeenCalledTimes(0);
        expect(attachUaaAuthInterceptorSpy).toHaveBeenCalledTimes(0);
        expect(attachReentranceTicketAuthInterceptorSpy).toHaveBeenCalledTimes(1);
        expect(getReentranceTicketSpy).toHaveBeenCalledTimes(1);
    });

    test('abap service provider for cloud - credentials provided use UAA', async () => {
        const attachUaaAuthInterceptorSpy = jest.spyOn(auth, 'attachUaaAuthInterceptor');
        const configForAbapOnCloud = {
            service: {
                log: console,
                url: server,
                uaa: {
                    username: 'TestUsername',
                    password: 'TestPassword',
                    clientid: 'ClientId',
                    clientsecret: 'ClientSecret',
                    url: server
                }
            },
            environment: AbapCloudEnvironment.Standalone
        };
        nock(server)
            .post('/oauth/token')
            .reply(201, { access_token: 'accessToken', refresh_token: 'refreshToken' })
            .get('/userinfo')
            .reply(200, { email: 'email', name: 'name' });

        const provider = createForAbapOnCloud(configForAbapOnCloud as any);
        expect(await provider.isAbapCloud()).toBe(false);
        expect(await provider.user()).toBe('email');
        expect(Uaa.prototype.getAccessToken).toHaveBeenCalledTimes(0);
        expect(Uaa.prototype.getAccessTokenWithClientCredentials).toHaveBeenCalledTimes(2);
        expect(attachUaaAuthInterceptorSpy).toHaveBeenCalledTimes(1);
    });
});

describe('Use existing connection session (cookies)', () => {
    const attachReentranceTicketAuthInterceptorSpy = jest.spyOn(auth, 'attachReentranceTicketAuthInterceptor');
    const existingCookieConfig: AxiosRequestConfig & Partial<ProviderConfiguration> = {
        baseURL: server,
        cookies: 'sap-usercontext=sap-client=100;SAP_SESSIONID_Y05_100=abc'
    };
    const existingCookieConfigForAbapOnCloudStandalone: AbapCloudOptions & Partial<ProviderConfiguration> = {
        service: {
            url: server
        } as any,
        cookies: 'sap-usercontext=sap-client=100;SAP_SESSIONID_Y05_100=abc',
        environment: AbapCloudEnvironment.Standalone
    };
    const existingCookieConfigForAbapOnCloudEmbeddedSteampunk: AbapCloudOptions & Partial<ProviderConfiguration> = {
        url: server,
        cookies: 'sap-usercontext=sap-client=100;SAP_SESSIONID_X01_100=abc',
        environment: AbapCloudEnvironment.EmbeddedSteampunk
    };

    beforeAll(() => {
        nock.disableNetConnect();
    });

    beforeEach(() => {
        nock.cleanAll();
        attachReentranceTicketAuthInterceptorSpy.mockRestore();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
        jest.resetAllMocks();
    });

    test('abap service provider', async () => {
        const provider = createForAbap(existingCookieConfig);
        expect(provider.cookies.toString()).toBe('sap-usercontext=sap-client=100; SAP_SESSIONID_Y05_100=abc');
    });

    test('abap service provider for cloud (standalone) - reentrance', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.ATO_SETTINGS)
            .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));

        const provider = createForAbapOnCloud(existingCookieConfigForAbapOnCloudStandalone as any);
        expect(provider.cookies.toString()).toBe('sap-usercontext=sap-client=100; SAP_SESSIONID_Y05_100=abc');
        expect(await provider.isAbapCloud()).toBe(true);
        expect(attachReentranceTicketAuthInterceptorSpy).toHaveBeenCalledTimes(0);
    });

    test('abap service provider for cloud (embedded steampunk) - reentrance', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.ATO_SETTINGS)
            .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));

        const provider = createForAbapOnCloud(existingCookieConfigForAbapOnCloudEmbeddedSteampunk);
        expect(provider.cookies.toString()).toBe('sap-usercontext=sap-client=100; SAP_SESSIONID_X01_100=abc');
        expect(attachReentranceTicketAuthInterceptorSpy).toHaveBeenCalledTimes(0);
    });

    test('abap service provider for cloud - active session', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.ATO_SETTINGS)
            .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'))
            .get('/sap/bc/adt/core/http/systeminformation')
            .reply(200, {
                userFullName: 'User FullName',
                userName: 'userName01',
                client: '100',
                systemID: 'ABC01',
                language: 'EN'
            } as SystemInfo);

        const config = cloneDeep(existingCookieConfigForAbapOnCloudEmbeddedSteampunk);
        const provider = createForAbapOnCloud(config as any);
        expect(await provider.isAbapCloud()).toBe(true);
        expect(await provider.user()).toBe('userName01');
        // Cookies with session already set so not expected to add an auth interceptor
        expect(attachReentranceTicketAuthInterceptorSpy).toHaveBeenCalledTimes(0);
    });
});

describe('List packages', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const provider = createForAbap(config);

    test('List packages - multiple packages returned', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `TestPackage*`,
                useSearchProvider: 'X',
                maxResults: 50,
                objectType: 'DEVC/K'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/listPackages-1.xml'));
        const listPackageService = await provider.getAdtService<ListPackageService>(ListPackageService);
        expect(await listPackageService?.listPackages({ maxResults: 50, phrase: 'TestPackage' })).toStrictEqual([
            'Z001',
            'Z002',
            'Z003'
        ]);
    });

    test('List packages - single package returned', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `TestPackage*`,
                useSearchProvider: 'X',
                maxResults: 50,
                objectType: 'DEVC/K'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/listPackages-2.xml'));
        const listPackageService = await provider.getAdtService<ListPackageService>(ListPackageService);
        expect(await listPackageService?.listPackages({ maxResults: 50, phrase: 'TestPackage' })).toStrictEqual([
            'Z001'
        ]);
    });

    test('List packages - no package found', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `TestPackage*`,
                useSearchProvider: 'X',
                maxResults: 50,
                objectType: 'DEVC/K'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/listPackages-3.xml'));
        const listPackageService = await provider.getAdtService<ListPackageService>(ListPackageService);
        expect(await listPackageService?.listPackages({ maxResults: 50, phrase: 'TestPackage' })).toStrictEqual([]);
    });

    test('List packages - invalid xml content', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `TestPackage*`,
                useSearchProvider: 'X',
                maxResults: 50,
                objectType: 'DEVC/K'
            })
            .reply(200, 'Some unknown errors');
        const listPackageService = await provider.getAdtService<ListPackageService>(ListPackageService);
        expect(await listPackageService?.listPackages({ maxResults: 50, phrase: 'TestPackage' })).toStrictEqual([]);
    });

    test('List packages - use default input {}', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `*`,
                useSearchProvider: 'X',
                maxResults: 50,
                objectType: 'DEVC/K'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/listPackages-4.xml'));
        const listPackageService = await provider.getAdtService<ListPackageService>(ListPackageService);
        expect(await listPackageService?.listPackages({})).toStrictEqual([]);
    });

    test('List packages - input phrase undefined is treated as empty string', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `*`,
                useSearchProvider: 'X',
                maxResults: 50,
                objectType: 'DEVC/K'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/listPackages-4.xml'));
        const listPackageService = await provider.getAdtService<ListPackageService>(ListPackageService);
        expect(await listPackageService?.listPackages({ phrase: undefined })).toStrictEqual([]);
    });
});

describe('File Store Service', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const provider = createForAbap(config);

    test('File structure content of root folder', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(`${AdtServices.FILE_STORE}/ZTESTAPP/content`)
            .replyWithFile(200, join(__dirname, 'mockResponses/archiveFolderContent_RootZTESTAPP.xml'));
        const fsService = await provider.getAdtService<FileStoreService>(FileStoreService);
        const rootFolderContent = await fsService?.getAppArchiveContent('folder', 'ZTESTAPP');
        expect(rootFolderContent?.length).toStrictEqual(13);
    });

    test('File structure content of folder that contain a single file', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(`${AdtServices.FILE_STORE}/ZTESTAPP/content`)
            .replyWithFile(200, join(__dirname, 'mockResponses/archiveFolderContent_i18n.xml'));
        const fsService = await provider.getAdtService<FileStoreService>(FileStoreService);
        const folderContent = await fsService?.getAppArchiveContent('folder', 'ZTESTAPP');
        expect(folderContent?.length).toStrictEqual(1);
        expect((folderContent as ArchiveFileNode[])[0].basename).toEqual('i18n.properties');
        expect((folderContent as ArchiveFileNode[])[0].path).toEqual('/i18n/i18n.properties');
        expect((folderContent as ArchiveFileNode[])[0].type).toEqual('file');
    });

    test('File content of given file path', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(`${AdtServices.FILE_STORE}/ZTESTAPP%2FComponent-dbg.js/content`)
            .replyWithFile(200, join(__dirname, 'mockResponses/archiveFileContent_Component-dbg_js.txt'));
        const fsService = await provider.getAdtService<FileStoreService>(FileStoreService);
        const fileContent = await fsService?.getAppArchiveContent('file', 'ZTESTAPP', '/Component-dbg.js');
        expect(typeof fileContent).toEqual('string');
        expect(fileContent).toEqual(
            fs.readFileSync(join(__dirname, 'mockResponses/archiveFileContent_Component-dbg_js.txt'), 'utf-8')
        );
    });

    test('Invalid input file path', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(`${AdtServices.FILE_STORE}/ZTESTAPP%2FComponent-dbg.js/content`)
            .replyWithFile(200, join(__dirname, 'mockResponses/archiveFileContent_Component-dbg_js.txt'));
        const fsService = await provider.getAdtService<FileStoreService>(FileStoreService);
        await expect(fsService?.getAppArchiveContent('file', 'ZTESTAPP', 'Component-dbg.js')).rejects.toThrow(
            'Input argument "path" needs to start with /'
        );
    });

    test('Unexpected xml in resonse', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(`${AdtServices.FILE_STORE}/ZTESTAPP/content`)
            .reply(200, '<?xml version="1.0" encoding="UTF-8"?><invalid>error message</invalid>');
        const fsService = await provider.getAdtService<FileStoreService>(FileStoreService);
        const fileContent = await fsService?.getAppArchiveContent('folder', 'ZTESTAPP');
        expect(fileContent?.length).toEqual(0);
    });

    test('Invalid xml in resonse', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(`${AdtServices.FILE_STORE}/ZTESTAPP/content`)
            .reply(200, 'Invalid XML');
        const fsService = await provider.getAdtService<FileStoreService>(FileStoreService);
        await expect(fsService?.getAppArchiveContent('folder', 'ZTESTAPP')).rejects.toThrow('Invalid XML content');
    });
});

describe('Business Object Service', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const provider = createForAbap(config);

    test('Business Object Service - multiple business objects returned', async () => {
        const maxResults = 100;
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `*`,
                maxResults: maxResults,
                objectType: 'BDEF',
                releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/businessObjects-1.xml'));
        const businessObjectService = await provider.getAdtService<BusinessObjectsService>(BusinessObjectsService);
        const businessObjects = await businessObjectService?.getBusinessObjects(maxResults);
        expect(businessObjects).toHaveLength(100);
    });

    test('Business Object Service - invalid response', async () => {
        const maxResults = 100;
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `*`,
                maxResults: maxResults,
                objectType: 'BDEF',
                releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/businessObjects-invalid.xml'));
        const businessObjectService = await provider.getAdtService<BusinessObjectsService>(BusinessObjectsService);
        const businessObjects = await businessObjectService?.getBusinessObjects(maxResults);
        expect(businessObjects).toHaveLength(0);
    });

    test('Business Object Service - test max results param', async () => {
        const boSpy = jest.spyOn(BusinessObjectsService.prototype, 'getBusinessObjects');
        const getSpy = jest.spyOn(BusinessObjectsService.prototype, 'get');
        const maxResults = 10000;
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `*`,
                maxResults: maxResults,
                objectType: 'BDEF',
                releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/businessObjects-invalid.xml'));
        const businessObjectService = await provider.getAdtService<BusinessObjectsService>(BusinessObjectsService);
        const businessObjects = await businessObjectService?.getBusinessObjects();
        expect(boSpy).toHaveBeenCalledWith();
        expect(getSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: {
                    Accept: 'application/xml'
                },
                params: {
                    operation: 'quickSearch',
                    query: `*`,
                    maxResults: maxResults,
                    objectType: 'BDEF',
                    releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
                }
            })
        );
        expect(businessObjects).toHaveLength(0);
    });
});

describe('Abap CDS View Service', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const provider = createForAbap(config);

    test('Abap CDS View Service - multiple cds views returned', async () => {
        const maxResults = 100;
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `*`,
                maxResults: maxResults,
                objectType: 'DDLS',
                releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/cdsViews-1.xml'));
        const cdsViewService = await provider.getAdtService<AbapCDSViewService>(AbapCDSViewService);
        const cdsViews = await cdsViewService?.getAbapCDSViews(maxResults);
        expect(cdsViews).toHaveLength(100);
    });

    test('Abap CDS View Service - invalid response', async () => {
        const maxResults = 100;
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `*`,
                maxResults: maxResults,
                objectType: 'DDLS',
                releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/cdsViews-invalid.xml'));
        const cdsViewService = await provider.getAdtService<AbapCDSViewService>(AbapCDSViewService);
        const cdsViews = await cdsViewService?.getAbapCDSViews(maxResults);
        expect(cdsViews).toHaveLength(0);
    });

    test('Abap CDS View Service - test max results param', async () => {
        const cdsViewSpy = jest.spyOn(AbapCDSViewService.prototype, 'getAbapCDSViews');
        const getSpy = jest.spyOn(AbapCDSViewService.prototype, 'get');
        const maxResults = 10000;
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.LIST_PACKAGES)
            .query({
                operation: 'quickSearch',
                query: `*`,
                maxResults: maxResults,
                objectType: 'DDLS',
                releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/cdsViews-invalid.xml'));
        const cdsViewService = await provider.getAdtService<AbapCDSViewService>(AbapCDSViewService);
        const cdsViews = await cdsViewService?.getAbapCDSViews();
        expect(cdsViewSpy).toHaveBeenCalledWith();
        expect(getSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: {
                    Accept: 'application/xml'
                },
                params: {
                    operation: 'quickSearch',
                    query: `*`,
                    maxResults: maxResults,
                    objectType: 'DDLS',
                    releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
                }
            })
        );
        expect(cdsViews).toHaveLength(0);
    });
});

describe('Generator Service', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const provider = createForAbap(config);
    const businessObjectName = 'I_BANKTP';
    const businessObject = {
        name: businessObjectName,
        uri: `/sap/bc/adt/bo/behaviordefinitions/${businessObjectName.toLocaleLowerCase()}`,
        description: 'test'
    };

    test('Generator Service - generator config returned', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-3.xml'))
            .get(AdtServices.GENERATOR)
            .query({
                referencedObject: `/sap/bc/adt/bo/behaviordefinitions/${businessObjectName.toLocaleLowerCase()}`,
                type: 'webapi'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/generatorConfig.xml'));
        const generatorService = await provider.getAdtService<GeneratorService>(GeneratorService);
        const generatorConfig = await generatorService?.getUIServiceGeneratorConfig(businessObject.uri);
        expect(generatorConfig?.id).toEqual('published-ui-service');
    });

    test('uiServiceGenerator', async () => {
        const transport = 'test_transport';
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-3.xml'))
            .get(AdtServices.GENERATOR)
            .query({
                referencedObject: `/sap/bc/adt/bo/behaviordefinitions/${businessObjectName.toLocaleLowerCase()}`,
                type: 'webapi'
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/generatorConfig.xml'))
            .get(
                `/sap/bc/adt/rap/generators/webapi/published-ui-service/content?referencedObject=%2fsap%2fbc%2fadt%2fbo%2fbehaviordefinitions%2fi_banktp&package=ztest1`
            )
            .replyWithFile(200, join(__dirname, 'mockResponses/generatorContent.json'))
            .get(
                `/sap/bc/adt/rap/generators/webapi/published-ui-service/schema?referencedObject=%2fsap%2fbc%2fadt%2fbo%2fbehaviordefinitions%2fi_banktp`
            )
            .replyWithFile(200, join(__dirname, 'mockResponses/schemaResponse.json'))
            .post(
                `/sap/bc/adt/rap/generators/webapi/published-ui-service/validation?referencedObject=%2fsap%2fbc%2fadt%2fbo%2fbehaviordefinitions%2fi_banktp&checks=package,referencedobject,authorization`
            )
            .replyWithFile(200, join(__dirname, 'mockResponses/validationResponse.xml'))
            .get(
                `/sap/bc/adt/rap/generators/webapi/published-ui-service/validation?referencedObject=%2fsap%2fbc%2fadt%2fbo%2fbehaviordefinitions%2fi_banktp&package=ztest1&checks=package`
            )
            .replyWithFile(200, join(__dirname, 'mockResponses/validationResponse.xml'))
            .post(
                '/sap/bc/adt/rap/generators/webapi/published-ui-service?referencedObject=%2Fsap%2Fbc%2Fadt%2Fbo%2Fbehaviordefinitions%2Fi_banktp&corrNr=test_transport'
            )
            .replyWithFile(200, join(__dirname, 'mockResponses/generateResponse.xml'));

        const gen = await provider.getUiServiceGenerator({
            name: businessObjectName,
            description: 'test',
            uri: `/sap/bc/adt/bo/behaviordefinitions/${businessObjectName.toLocaleLowerCase()}`
        });
        expect(gen).toBeInstanceOf(UiServiceGenerator);
        const content = await gen?.getContent('ztest1');
        expect(JSON.parse(content).businessService.serviceDefinition.serviceDefinitionName).toEqual('ZUI_BANKTP004_O4');

        const schemaResponse = await gen.getSchema();
        expect(schemaResponse.title).toEqual('Details for RAP artifacts generation');

        const validatePackage = await gen.validatePackage('ztest1');
        expect(validatePackage.validationMessages.validationMessage.severity).toEqual('OK');

        const validateContent = await gen.validateContent(content);
        expect(validateContent.severity).toEqual('OK');

        const generationReponse: any = await gen?.generate(content, transport);
        expect(generationReponse?.objectReferences).toEqual('');
    });

    test('uiServiceGenerator with no links in response', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-3.xml'))
            .get(AdtServices.GENERATOR)
            .query({
                referencedObject: `/sap/bc/adt/bo/behaviordefinitions/${businessObjectName.toLocaleLowerCase()}`
            })
            .replyWithFile(200, join(__dirname, 'mockResponses/generatorConfigNoLink1.xml'));
        await expect(
            provider.getUiServiceGenerator({
                name: businessObjectName,
                description: 'test',
                uri: `/sap/bc/adt/bo/behaviordefinitions/${businessObjectName.toLocaleLowerCase()}`
            })
        ).rejects.toThrow();
    });
});

describe('UI5 RT Version service', () => {
    const ui5VersionMock = '1.21.1';
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const provider = createForAbap(config);

    test('Get UI5 Version', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.UI5_RT_VERSION)
            .reply(200, ui5VersionMock);

        const ui5RtVersionService = await provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);
        const ui5Version = await ui5RtVersionService?.getUI5Version();
        expect(ui5Version).toBe(ui5VersionMock);
    });

    test('Throws error when request fails', async () => {
        const mockAxiosError = {
            response: {
                status: 404,
                data: 'Not found'
            },
            message: 'Request failed with status code 404'
        } as AxiosError;
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.UI5_RT_VERSION)
            .replyWithError(mockAxiosError);

        const ui5RtVersionService = await provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);

        try {
            await ui5RtVersionService?.getUI5Version();
            fail('The function should have thrown an error.');
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toBe('Request failed with status code 404');
        }
    });
});
