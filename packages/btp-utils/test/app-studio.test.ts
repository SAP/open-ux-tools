import { getAppStudioProxyURL, isAppStudio, getDestinationUrlForAppStudio } from '../src';
import { ENV } from '../src/app-studio';

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
        const url = 'http://example.com/my/service';
        const destination = 'example_dest';
        const encodedInstanceSettings = Buffer.from(
            `${mockInstanceSettings.clientid}:${mockInstanceSettings.clientsecret}`
        ).toString('base64');

        it('No destination provider - url stays unchanged', async () => {
            expect(getDestinationUrlForAppStudio(url)).resolves.toBe(url);
        });

        it('Destination provided - host changes, path stays unchanged', async () => {
            const newUrl = await getDestinationUrlForAppStudio(url, destination);
            expect(newUrl).not.toBe(url);
            expect(new URL(newUrl).pathname).toBe(new URL(url).pathname);
            expect(new URL(newUrl).origin).toBe(`https://${destination}.dest`);
        });

        it('Destination instance provided - service has uaa config', async () => {
            const newUrl = await getDestinationUrlForAppStudio(url, destination, 'instance_has_uaa');
            expect(newUrl).not.toBe(url);
            expect(new URL(newUrl).pathname).toBe('/');
            expect(newUrl.includes(encodedInstanceSettings)).toBe(true);
        });

        it('Destination instance provided - service has no uaa but its own id/secret', async () => {
            const newUrl = await getDestinationUrlForAppStudio(url, destination, 'instance');
            expect(newUrl).not.toBe(url);
            expect(new URL(newUrl).pathname).toBe('/');
            console.log(newUrl);
            expect(newUrl.includes(encodedInstanceSettings)).toBe(true);
        });

        it('Destination instance provided - but is invalid', async () => {
            expect(getDestinationUrlForAppStudio(url, destination, 'invalid')).resolves.toThrowError();
        });
    });
});
