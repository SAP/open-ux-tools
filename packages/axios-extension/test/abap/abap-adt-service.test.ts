import { join } from 'path';
import nock from 'nock';
import {
    createForAbap,
    createForAbapOnCloud,
    AbapCloudEnvironment,
    TransportRequestService,
    TransportChecksService
} from '../../src';
import * as auth from '../../src/auth';

/**
 * URL are specific to the discovery schema.
 * Keep the URL paths same as those in packages/axios-extension/test/abap/mockResponses/discovery.xml
 */
enum AdtServices {
    DISCOVERY = '/sap/bc/adt/discovery',
    ATO_SETTINGS = '/sap/bc/adt/ato/settings',
    TRANSPORT_CHECKS = '/sap/bc/adt/cts/transportchecks',
    TRANSPORT_REQUEST = '/sap/bc/adt/cts/transports'
}

const server = 'https://server.example';
const config = {
    baseURL: server,
    auth: {
        username: 'USER',
        password: 'SECRET'
    }
};
const existingCookieConfig = {
    baseURL: server,
    cookies: 'sap-usercontext=sap-client=100;SAP_SESSIONID_Y05_100=abc'
};
const configForAbapOnCloud = {
    service: {},
    environment: AbapCloudEnvironment.Standalone
};
const existingCookieConfigForAbapOnCloud = {
    service: {},
    cookies: 'sap-usercontext=sap-client=100;SAP_SESSIONID_Y05_100=abc',
    environment: AbapCloudEnvironment.Standalone
};

const testPackage = 'ZSPD';
const testLocalPackage = '$TMP';
const testNewPakcage = 'NEWPACKAGE';
const testNewProject = 'zdummyexample';
const testExistProject = 'zdummyexist';

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
            await transportRequestService.createTransportRequest({
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
            await transportRequestService.createTransportRequest({
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
    });

    const provider = createForAbap(config);

    test('Unexpected response - invalid XML', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .reply(200, 'Some error message from backend');
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
    });

    test('Unexpected response - error or unknown XML', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .reply(200, '<unknown></unknown>');
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
    });

    test('Valid package name, existing project name - no transport number', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-4.xml'));
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService.getTransportRequests(testPackage, testExistProject)).toStrictEqual([]);
    });

    test('Local package: no transport number required for deploy for both new and exist project', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-3.xml'));
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService.getTransportRequests(testLocalPackage, testExistProject)).toStrictEqual([]);
    });

    test('New package name: no transport number available', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-4.xml'));
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        expect(await transportChecksService.getTransportRequests(testNewPakcage, testNewProject)).toStrictEqual([]);
    });

    test('Valid package name, new project name', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'), { random: `${Math.random()}` })
            .post(AdtServices.TRANSPORT_CHECKS)
            .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-1.xml'), { random: `${Math.random()}` });
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        const transportRequestList = await transportChecksService.getTransportRequests(testPackage, testNewProject);
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
        expect(await transportChecksService.getTransportRequests(testPackage, testExistProject)).toStrictEqual([
            expect.objectContaining({
                transportNumber: 'EC1K900294',
                user: 'TESTUSER',
                description: 'Fiori tools',
                targetSystem: 'DMY',
                client: '100'
            })
        ]);
    });
});

describe('Use existing connection session', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const attachUaaAuthInterceptorSpy = jest.spyOn(auth, 'attachUaaAuthInterceptor');

    test('abap service provider', async () => {
        const provider = createForAbap(existingCookieConfig);
        expect(provider.cookies.toString()).toBe('sap-usercontext=sap-client=100; SAP_SESSIONID_Y05_100=abc');
    });

    test('abap service provider for cloud', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.ATO_SETTINGS)
            .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));

        const provider = createForAbapOnCloud(existingCookieConfigForAbapOnCloud as any);
        expect(provider.cookies.toString()).toBe('sap-usercontext=sap-client=100; SAP_SESSIONID_Y05_100=abc');
        expect(await provider.isS4Cloud()).toBe(false);
        expect(attachUaaAuthInterceptorSpy.mockImplementation(jest.fn())).toBeCalledTimes(0);
    });

    test('abap service provider for cloud - require authentication', async () => {
        nock(server)
            .get(AdtServices.DISCOVERY)
            .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
            .get(AdtServices.ATO_SETTINGS)
            .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));

        const provider = createForAbapOnCloud(configForAbapOnCloud as any);
        expect(await provider.isS4Cloud()).toBe(false);
        expect(attachUaaAuthInterceptorSpy.mockImplementation(jest.fn())).toBeCalledTimes(1);
    });
});
