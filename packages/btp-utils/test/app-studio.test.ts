import nock from 'nock';
import { join } from 'path';
import type { Destination } from '../src';
import {
    getAppStudioProxyURL,
    getAppStudioBaseURL,
    isAppStudio,
    getDestinationUrlForAppStudio,
    listDestinations,
    getCredentialsForDestinationService,
    exposePort
} from '../src';
import { ENV } from '../src/app-studio.env';
import destinationList from './mockResponses/destinations.json';

const destinations: { [key: string]: Destination } = {};
destinationList.forEach((dest) => {
    destinations[dest.Name] = dest;
});

const mockInstanceSettings = {
    clientid: 'CLIENT_ID/WITH/STH/TO/ENCODE',
    clientsecret: 'CLIENT_SECRET'
};

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
        })
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

        it('returns true when env variable is ""', () => {
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
            expect(getCredentialsForDestinationService('invalid')).rejects.toThrowError();
        });

        it('Instance does not exist', async () => {
            expect(getCredentialsForDestinationService('noinstance')).rejects.toThrowError();
        });

        it('Instance does not have credentials', async () => {
            expect(getCredentialsForDestinationService('nocredentials')).rejects.toThrowError();
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
});
