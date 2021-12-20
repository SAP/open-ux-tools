import nock from 'nock';
import { join } from 'path';
import {
    getAppStudioProxyURL,
    isAppStudio,
    getDestinationUrlForAppStudio,
    Destination,
    listDestinations
} from '../src';
import { ENV } from '../src/app-studio.env';
import destinationList from './mockResponses/destinations.json';

const destinations: { [key: string]: Destination } = {};
destinationList.forEach((dest) => {
    destinations[dest.Name] = dest;
});

const mockInstanceSettings = {
    clientid: 'CLIENT_ID',
    clientsecret: 'CLIENT_SECRET'
};
jest.mock('@sap/cf-tools', () => {
    const original = jest.requireActual('@sap/cf-tools');
    return {
        ...original,
        cfGetInstanceKeyParameters: jest.fn((name?) => {
            if (name === 'invalid') {
                throw new Error();
            } else {
                return name.includes('uaa') ? { uaa: mockInstanceSettings } : mockInstanceSettings;
            }
        })
    };
});

describe('App Studio Utils', () => {
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

    describe('getDestinationUrlForAppStudio', () => {
        const destination: Destination = destinations['ON_PREM_WITH_PATH'];
        const path = new URL(destination.Host).pathname;
        const encodedInstanceSettings = encodeURIComponent(
            Buffer.from(`${mockInstanceSettings.clientid}:${mockInstanceSettings.clientsecret}`).toString('base64')
        );

        it('Destination - host changes, path stays unchanged', async () => {
            const newUrl = await getDestinationUrlForAppStudio(destination.Name, undefined, path);
            expect(new URL(newUrl).origin).toBe(`https://${destination.Name.toLocaleLowerCase()}.dest`);
            expect(new URL(newUrl).pathname).toBe(path);
        });

        it('Destination instance provided - service has uaa config, path stays unchanged', async () => {
            const newUrl = await getDestinationUrlForAppStudio(destination.Name, 'instance_has_uaa', path);
            expect(new URL(newUrl).pathname).toBe(path);
            expect(newUrl.includes(encodedInstanceSettings)).toBe(true);
        });

        it('Destination instance provided - service has no uaa but its own id/secret', async () => {
            const newUrl = await getDestinationUrlForAppStudio(destination.Name, 'instance');
            expect(new URL(newUrl).pathname).toBe('/');
            expect(newUrl.includes(encodedInstanceSettings)).toBe(true);
        });

        it('Destination instance provided - but is invalid', async () => {
            expect(getDestinationUrlForAppStudio(destination.Name, 'invalid')).rejects.toThrowError();
        });
    });

    describe('listDestinations', () => {
        const server = 'https://destinations.example';

        beforeAll(() => {
            nock(server).get('/reload').reply(200).persist();
            process.env[ENV.H2O_URL] = server;
            process.env[ENV.PROXY_URL] = server;
        });

        test('only destinations for development returned', async () => {
            nock(server)
                .get('/api/listDestinations')
                .replyWithFile(200, join(__dirname, 'mockResponses/destinations.json'));
            const actualDestinations = await listDestinations();
            destinationList.forEach((destination) => {
                expect(!!actualDestinations[destination.Name]).toBe(destination.WebIDEEnabled === 'true');
            });
        });

        test('nothing returned', async () => {
            nock(server).get('/api/listDestinations').reply(200);
            const actualDestinations = await listDestinations();
            expect(Object.values(actualDestinations).length).toBe(0);
        });
    });
});
