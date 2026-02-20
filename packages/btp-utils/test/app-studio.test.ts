import nock from 'nock';
import { join } from 'node:path';
import type { Destination, ServiceInfo } from '../src';
import {
    getAppStudioProxyURL,
    getAppStudioBaseURL,
    isAppStudio,
    getDestinationUrlForAppStudio,
    listDestinations,
    getCredentialsForDestinationService,
    exposePort,
    createOAuth2UserTokenExchangeDest
} from '../src';
import { ENV } from '../src/app-studio.env';
import destinationList from './mockResponses/destinations.json';
import { type ServiceInstanceInfo } from '@sap/cf-tools';
import { ToolsLogger } from '@sap-ux/logger';
import * as cfTools from '@sap/cf-tools';
import * as basSdk from '@sap/bas-sdk';

const destinations: { [key: string]: Destination } = {};
destinationList.forEach((dest) => {
    destinations[dest.Name] = dest;
});

const mockInstanceSettings = {
    clientid: 'CLIENT_ID/WITH/STH/TO/ENCODE',
    clientsecret: 'CLIENT_SECRET'
};

const cfDiscoveredAbapEnvsMock: ServiceInstanceInfo[] = [
    { label: 'system1', serviceName: 'service1' },
    { label: 'system2', serviceName: 'service2' }
];

const credentials = {
    uaa: {
        clientid: 'CLIENT_ID/WITH/STH/TO/ENCODE',
        clientsecret: 'CLIENT_SECRET',
        url: 'http://my-server'
    } as ServiceInfo['uaa'],
    url: 'http://123abcd-fully-resolved-host-url.abap.somewhereaws.hanavlab.ondemand.com'
};
let uaaCredentialsMock = {
    credentials
};

const cfTarget = { org: 'testOrg', space: 'testSpace' };
let cfTargetMock = cfTarget;

jest.mock('@sap/cf-tools', () => {
    const original = jest.requireActual('@sap/cf-tools');
    return {
        ...original,
        cfGetInstanceKeyParameters: jest.fn((name?) => {
            if (name === 'invalid') {
                throw new Error();
            } else if (name === 'noinstance') {
                return undefined;
            } else if (name === 'nocredentials') {
                return {};
            } else {
                return name.includes('uaa')
                    ? { credentials: { uaa: mockInstanceSettings } }
                    : { credentials: mockInstanceSettings };
            }
        }),
        cfGetTarget: jest.fn(() => Promise.resolve(cfTargetMock)),
        apiGetServicesInstancesFilteredByType: jest.fn().mockImplementation(() => cfDiscoveredAbapEnvsMock),
        apiCreateServiceInstance: jest.fn().mockImplementation(() => {}),
        apiGetInstanceCredentials: jest.fn(() => Promise.resolve(uaaCredentialsMock))
    };
});

describe('App Studio', () => {
    describe('isAppStudio', () => {
        it('returns true when env variable is truthy', () => {
            process.env[ENV.H2O_URL] = '1';
            expect(isAppStudio()).toBeTruthy();
        });

        it('returns true when env variable is undefined', () => {
            delete process.env[ENV.H2O_URL];
            expect(isAppStudio()).toBeFalsy();
        });

        it('returns true when env variable is ', () => {
            process.env[ENV.H2O_URL] = '';
            expect(isAppStudio()).toBeFalsy();
        });
    });

    describe('getAppStudioProxyURL', () => {
        it('returns the url from the correct env var when set', () => {
            const PROXY_URL = 'http://proxy';
            process.env[ENV.PROXY_URL] = PROXY_URL;
            expect(getAppStudioProxyURL()).toBe(PROXY_URL);
        });

        it('returns undefined when env var is not set', () => {
            delete process.env[ENV.PROXY_URL];
            expect(getAppStudioProxyURL()).toBeUndefined();
        });
    });

    describe('getAppStudioBaseURL', () => {
        it('returns the url from the correct env var when set', () => {
            const H2O_URL = 'http://someurl';
            process.env[ENV.H2O_URL] = H2O_URL;
            expect(getAppStudioBaseURL()).toBe(H2O_URL);
        });

        it('returns undefined when env var is not set', () => {
            delete process.env[ENV.H2O_URL];
            expect(getAppStudioBaseURL()).toBeUndefined();
        });
    });

    describe('getCredentialsForDestinationService', () => {
        const encodedInstanceSettings = Buffer.from(
            `${encodeURIComponent(mockInstanceSettings.clientid)}:${encodeURIComponent(
                mockInstanceSettings.clientsecret
            )}`
        ).toString('base64');

        it('Service has uaa config', async () => {
            const user = await getCredentialsForDestinationService('instance_has_uaa');
            expect(user).toBe(encodedInstanceSettings);
        });

        it('Service has no uaa but its own id/secret', async () => {
            const user = await getCredentialsForDestinationService('instance');
            expect(user).toBe(encodedInstanceSettings);
        });

        it('Invalid instance', async () => {
            expect(getCredentialsForDestinationService('invalid')).rejects.toThrow();
        });

        it('Instance does not exist', async () => {
            expect(getCredentialsForDestinationService('noinstance')).rejects.toThrow();
        });

        it('Instance does not have credentials', async () => {
            expect(getCredentialsForDestinationService('nocredentials')).rejects.toThrow();
        });
    });

    describe('getDestinationUrlForAppStudio', () => {
        const destination: Destination = destinations['ON_PREM_WITH_PATH'];
        const path = new URL(destination.Host).pathname;

        it('Host changes', async () => {
            const newUrl = await getDestinationUrlForAppStudio(destination.Name);
            expect(new URL(newUrl).origin).toBe(`https://${destination.Name.toLocaleLowerCase()}.dest`);
            expect(new URL(newUrl).pathname).toBe('/');
        });

        it('Host changes, path stays unchanged', async () => {
            const newUrl = await getDestinationUrlForAppStudio(destination.Name, path);
            expect(new URL(newUrl).origin).toBe(`https://${destination.Name.toLocaleLowerCase()}.dest`);
            expect(new URL(newUrl).pathname).toBe(path);
        });
    });

    describe('listDestinations', () => {
        const server = 'https://destinations.example';

        beforeAll(() => {
            nock(server).get('/reload').reply(200).persist();
            process.env[ENV.H2O_URL] = server;
            process.env[ENV.PROXY_URL] = server;
        });

        afterAll(() => {
            delete process.env[ENV.H2O_URL];
            delete process.env[ENV.PROXY_URL];
        });

        test('only destinations for development returned', async () => {
            nock(server)
                .get('/api/listDestinations')
                .replyWithFile(200, join(__dirname, 'mockResponses/destinations.json'));
            const actualDestinations = await listDestinations();
            destinationList.forEach((destination) => {
                expect(!!actualDestinations[destination.Name]).toBe(destination.WebIDEEnabled === 'true');
            });
            // test host remains unchanged when no opts passed to api
            expect(actualDestinations['S4HC'].Host).toBe('https://s4hc-example-api.sap.example');
        });

        test('nothing returned', async () => {
            nock(server).get('/api/listDestinations').reply(200);
            const actualDestinations = await listDestinations();
            expect(Object.values(actualDestinations).length).toBe(0);
        });

        test('test stripping -api from s4hc destination', async () => {
            nock(server)
                .get('/api/listDestinations')
                .replyWithFile(200, join(__dirname, 'mockResponses/destinations.json'));
            const destinationsWithOpts = await listDestinations({ stripS4HCApiHosts: true });
            expect(destinationsWithOpts['S4HC'].Host).toBe('https://s4hc-example.sap.example');
        });
    });

    describe('exposePort', () => {
        const server = 'http://localhost:3001/';

        test('calls app studio api with correct port', async () => {
            nock(server).get('/AppStudio/api/getHostByPort?port=1234').reply(200, { result: 'https://abcd.com' });
            const url = await exposePort(1234);
            expect(url).toStrictEqual('https://abcd.com');
        });
        test('catches error returned by app studio', async () => {
            nock(server).get('/AppStudio/api/getHostByPort?port=1234').reply(500);
            const url = await exposePort(1234);
            expect(url).toStrictEqual('');
        });
    });

    describe('createOAuth2UserTokenExchangeDest', () => {
        let envH20Settings: string | undefined;
        let envWSBaseURLSettings: string | undefined;
        const logger = new ToolsLogger();
        const infoMock = (logger.info = jest.fn());
        const debugMock = (logger.debug = jest.fn());

        const serviceInstanceName = 'my-abap-env';
        const server = 'https://destinations.example';

        beforeAll(() => {
            nock(server).get('/reload').reply(200).persist();
            envH20Settings = process.env[ENV.H2O_URL];
            envWSBaseURLSettings = process.env['WS_BASE_URL'];
            process.env[ENV.H2O_URL] = server;
            process.env[ENV.PROXY_URL] = server;
        });

        afterAll(() => {
            process.env[ENV.H2O_URL] = envH20Settings;
            process.env['WS_BASE_URL'] = envWSBaseURLSettings;
            jest.resetAllMocks();
        });

        beforeEach(() => {
            // test isolation, reset mock state between tests
            uaaCredentialsMock.credentials = credentials;
            cfTargetMock = cfTarget;
            process.env[ENV.H2O_URL] = server;
        });

        test('creation is only supported on BAS', async () => {
            delete process.env[ENV.H2O_URL];
            await expect(
                createOAuth2UserTokenExchangeDest(serviceInstanceName, {
                    uaaCredentials: uaaCredentialsMock.credentials.uaa,
                    hostUrl: uaaCredentialsMock.credentials.url
                })
            ).rejects.toThrow(/SAP Business Application Studio/);
        });

        test('generate new OAuth2UserTokenExchange SAP BTP destination', async () => {
            process.env['WS_BASE_URL'] = server; // Required for bas-sdk to ensure isAppStudio is true
            const result = `
                Object {
                  "Authentication": "OAuth2UserTokenExchange",
                  "Description": "Destination generated by App Studio for 'my-abap-env', Do not remove.",
                  "HTML5.DynamicDestination": "true",
                  "HTML5.Timeout": "60000",
                  "Name": "abap-cloud-my-abap-env-testorg-testspace",
                  "ProxyType": "Internet",
                  "Type": "HTTP",
                  "URL": "http://my-server/",
                  "WebIDEEnabled": "true",
                  "WebIDEUsage": "odata_abap,dev_abap,abap_cloud",
                  "clientId": "CLIENT_ID/WITH/STH/TO/ENCODE",
                  "clientSecret": "CLIENT_SECRET",
                  "tokenServiceURL": "http://my-server/oauth/token",
                  "tokenServiceURLType": "Dedicated",
                }
            `;
            let bodyParam;
            nock(server)
                .post('/api/createDestination', (body) => {
                    bodyParam = body;
                    return true;
                })
                .reply(200);
            nock(server)
                .get('/api/listDestinations')
                .replyWithFile(200, join(__dirname, 'mockResponses/destinations.json'));
            await expect(
                createOAuth2UserTokenExchangeDest(
                    serviceInstanceName,
                    {
                        uaaCredentials: uaaCredentialsMock.credentials.uaa,
                        hostUrl: uaaCredentialsMock.credentials.url
                    },
                    logger
                )
            ).resolves.toMatchObject(destinations['abap-cloud-my-abap-env-testorg-testspace']);
            expect(bodyParam).toMatchInlineSnapshot(`
                Object {
                  "Authentication": "OAuth2UserTokenExchange",
                  "Description": "Destination generated by App Studio for Cloud Foundry Abap service instance: 'my-abap-env', Do not remove.",
                  "HTML5.DynamicDestination": "true",
                  "HTML5.Timeout": "60000",
                  "Name": "abap-cloud-my-abap-env-testorg-testspace",
                  "ProxyType": "Internet",
                  "Type": "HTTP",
                  "URL": "http://123abcd-fully-resolved-host-url.abap.somewhereaws.hanavlab.ondemand.com/",
                  "WebIDEEnabled": "true",
                  "WebIDEUsage": "odata_abap,dev_abap,abap_cloud",
                  "clientId": "CLIENT_ID/WITH/STH/TO/ENCODE",
                  "clientSecret": "CLIENT_SECRET",
                  "tokenServiceURL": "http://my-server/oauth/token",
                  "tokenServiceURLType": "Dedicated",
                }
            `);
            expect(infoMock).toHaveBeenCalledTimes(1);
            expect(debugMock).toHaveBeenCalledTimes(1);
        });

        test('throw exception if no destination found in SAP BTP', async () => {
            process.env['WS_BASE_URL'] = server;
            nock(server).post('/api/createDestination').reply(200);
            nock(server).get('/api/listDestinations').reply(200);
            await expect(
                createOAuth2UserTokenExchangeDest(serviceInstanceName, {
                    uaaCredentials: uaaCredentialsMock.credentials.uaa,
                    hostUrl: uaaCredentialsMock.credentials.url
                })
            ).rejects.toThrow(/Destination not found on SAP BTP./);
        });

        test('throw exception if no UAA credentials found', async () => {
            uaaCredentialsMock = {} as any;
            await expect(createOAuth2UserTokenExchangeDest(serviceInstanceName)).rejects.toThrow(
                /Could not retrieve SAP BTP credentials./
            );
        });

        test('retrieve credentials if optionally not provided', async () => {
            const createDestSpy = jest.spyOn(basSdk.destinations, 'createDestination');
            nock(server).post('/api/createDestination').reply(200);
            nock(server)
                .get('/api/listDestinations')
                .replyWithFile(200, join(__dirname, 'mockResponses/destinations.json'));
            const getCredsSpy = jest.spyOn(cfTools, 'apiGetInstanceCredentials');
            const dest = await createOAuth2UserTokenExchangeDest(serviceInstanceName);
            expect(dest.Name).toBe('abap-cloud-my-abap-env-testorg-testspace');
            expect(getCredsSpy).toHaveBeenCalledWith(serviceInstanceName);
            expect(createDestSpy).toHaveBeenCalledWith({
                basProperties: {
                    html5DynamicDestination: 'true',
                    html5Timeout: '60000',
                    usage: 'odata_abap,dev_abap,abap_cloud'
                },
                credentials: {
                    authentication: 'OAuth2UserTokenExchange',
                    oauth2UserTokenExchange: {
                        clientId: 'CLIENT_ID/WITH/STH/TO/ENCODE',
                        clientSecret: 'CLIENT_SECRET',
                        tokenServiceURL: 'http://my-server/oauth/token',
                        tokenServiceURLType: 'Dedicated'
                    }
                },
                description:
                    "Destination generated by App Studio for Cloud Foundry Abap service instance: 'my-abap-env', Do not remove.",
                name: 'abap-cloud-my-abap-env-testorg-testspace',
                proxyType: 'Internet',
                type: 'HTTP',
                url: new URL('http://123abcd-fully-resolved-host-url.abap.somewhereaws.hanavlab.ondemand.com/')
            });
        });

        test('throw exception if no dev space is created for the respective subaccount', async () => {
            cfTargetMock = {} as any;
            await expect(
                createOAuth2UserTokenExchangeDest(serviceInstanceName, {
                    uaaCredentials: uaaCredentialsMock.credentials.uaa,
                    hostUrl: uaaCredentialsMock.credentials.url
                })
            ).rejects.toThrow(/No Dev Space has been created for the subaccount./);
        });
    });
});
