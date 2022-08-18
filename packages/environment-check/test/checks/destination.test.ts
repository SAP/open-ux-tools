import axios from 'axios';
import { isAppStudio, getAppStudioProxyURL } from '@sap-ux/btp-utils';
import type { Destination } from '../../src/types';
import { checkBASDestinations, needsUsernamePassword } from '../../src/checks/destination';
import { UrlServiceType, Severity } from '../../src/types';
import { destinations as destinationsApi } from '@sap/bas-sdk';

jest.mock('@sap/bas-sdk');
const mockDestinationsApi = destinationsApi as jest.Mocked<typeof destinationsApi>;

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn(),
    getAppStudioProxyURL: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;
const mockGetAppStudioProxyURL = getAppStudioProxyURL as jest.Mock;

describe('Destinaton tests, function checkBASDestinations()', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('Valid call should return destinations', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        mockGetAppStudioProxyURL.mockResolvedValueOnce('');
        const data = [
            {
                name: 'ONE',
                type: 'HTTP',
                credentials: { authentication: 'NoAuthentication' },
                proxyType: 'Internet',
                description: 'ONE_DESC',
                basProperties: {
                    webIDEEnabled: 'true',
                    usage: 'odata_abap'
                },
                host: 'https://one.dest:123'
            },
            {
                name: 'TWO',
                type: 'HTTP',
                credentials: { authentication: 'NoAuthentication' },
                proxyType: 'OnPremise',
                description: 'TWO_DESC',
                basProperties: {
                    sapClient: '111',
                    webIDEEnabled: 'true',
                    usage: 'odata_abap,dev_abap'
                },
                host: 'http://two.dest:234'
            }
        ] as any[];
        mockDestinationsApi.getDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations).toEqual(data);
        expect(destResult.messages).toBeDefined();
    });

    test('No destinations and calling checkBASDestinations', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [];
        mockDestinationsApi.getDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations).toEqual(data);
        expect(destResult.messages).toBeDefined();
    });

    test('No destinations and VSCode Environment', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(false);
        const data = [];
        mockDestinationsApi.getDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations).toEqual(data);
        expect(destResult.messages).toBeDefined();
    });

    test('HTTP call returns error for all requests, should be in result messages', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        mockDestinationsApi.getDestinations.mockImplementationOnce(() => Promise.reject(new Error('HTTP ERROR')));

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.messages.find((e) => e.text.includes('HTTP ERROR'))).toBeDefined();
    });
});

describe('Destinaton tests, needsUsernamePassword()', () => {
    test('Password required, should return true', () => {
        const result = needsUsernamePassword({
            credentials: { authentication: 'NoAuthentication' }
        } as unknown as Destination);
        expect(result).toBeTruthy();
    });

    test('No password required, should return false', () => {
        const result = needsUsernamePassword({} as unknown as Destination);
        expect(result).toBeFalsy();
    });
});

describe('Destination test for classification', () => {
    test('FullServiceUrl', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                name: 'FUL',
                type: 'HTTP',
                credentials: { authentication: 'NoAuthentication' },
                proxyType: 'Internet',
                description: 'ONE_DESC',
                basProperties: {
                    webIDEEnabled: 'true',
                    usage: 'USELESS, odata_gen',
                    additionalData: 'full_url'
                },
                host: 'https://one.dest:123'
            }
        ] as any;
        mockDestinationsApi.getDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.name === 'FUL').urlServiceType).toEqual(
            UrlServiceType.FullServiceUrl
        );
    });

    test('CatalogServiceUrl', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                name: 'CAT',
                type: 'HTTP',
                credentials: { authentication: 'NoAuthentication' },
                proxyType: 'Internet',
                description: 'ONE_DESC',
                basProperties: {
                    webIDEEnabled: 'true',
                    usage: 'USELESS, odata_abap'
                },
                host: 'https://one.dest:123'
            }
        ] as any;
        mockDestinationsApi.getDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.name === 'CAT').urlServiceType).toEqual(
            UrlServiceType.CatalogServiceUrl
        );
    });

    test('PartialUrl', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                name: 'PAR',
                type: 'HTTP',
                credentials: { authentication: 'NoAuthentication' },
                proxyType: 'Internet',
                description: 'ONE_DESC',
                basProperties: {
                    webIDEEnabled: 'true',
                    usage: 'odata_gen, odata_abappp'
                },
                host: 'https://one.dest:123'
            }
        ] as any;
        mockDestinationsApi.getDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.name === 'PAR').urlServiceType).toEqual(UrlServiceType.PartialUrl);
    });

    test('InvalidUrl', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                name: 'INV',
                type: 'HTTP',
                credentials: { authentication: 'NoAuthentication' },
                proxyType: 'Internet',
                description: 'ONE_DESC',
                basProperties: {
                    webIDEEnabled: 'true',
                    usage: 'odata_gen, odata_abap',
                    additionalData: 'full_url'
                },
                host: 'https://one.dest:123'
            }
        ] as any;
        mockDestinationsApi.getDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.name === 'INV').urlServiceType).toEqual(UrlServiceType.InvalidUrl);
    });
    test('InvalidUrl, no WebIDEUsage', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                name: 'INV',
                type: 'HTTP',
                credentials: { authentication: 'NoAuthentication' },
                proxyType: 'Internet',
                description: 'ONE_DESC',
                basProperties: {
                    webIDEEnabled: 'true',
                    additionalData: 'full_url'
                },
                host: 'https://one.dest:123'
            }
        ] as any;
        mockDestinationsApi.getDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.name === 'INV').urlServiceType).toEqual(UrlServiceType.InvalidUrl);
    });
    test('InvalidUrl, no WebIDEEnabled', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                name: 'INV',
                type: 'HTTP',
                credentials: { authentication: 'NoAuthentication' },
                proxyType: 'Internet',
                description: 'ONE_DESC',
                basProperties: {
                    additionalData: 'full_url'
                },
                host: 'https://one.dest:123'
            }
        ] as any;
        mockDestinationsApi.getDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.name === 'INV').urlServiceType).toEqual(UrlServiceType.InvalidUrl);
    });
});
