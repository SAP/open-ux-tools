import { isAppStudio, getAppStudioProxyURL, listDestinations } from '@sap-ux/btp-utils';
import type { Destinations } from '@sap-ux/btp-utils';
import type { Endpoint, CatalogServiceResult } from '../../src/types';
import { Severity, UrlServiceType } from '../../src/types';
import { checkBASDestination, checkBASDestinations, needsUsernamePassword } from '../../src/checks/destination';
import * as serviceChecks from '../../src/checks/service-checks';

jest.mock('@sap-ux/axios-extension', () => ({
    ...(jest.requireActual('@sap-ux/axios-extension') as object),
    createForDestination: jest.fn()
}));

jest.mock('@sap/bas-sdk');

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn(),
    getAppStudioProxyURL: jest.fn(),
    listDestinations: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;
const mockGetAppStudioProxyURL = getAppStudioProxyURL as jest.Mock;
const mockListDestinations = listDestinations as jest.Mock;

describe('Destination tests, function checkBASDestination()', () => {
    const checkCatalogServicesResult = {
        messages: [],
        result: {
            v2: {},
            v4: {}
        } as CatalogServiceResult
    };
    test('HTML5.DynamicDestination missing', async () => {
        const destination: Partial<Endpoint> = {
            Name: 'DEST',
            Host: 'https://one.dest:123'
        };

        jest.spyOn(serviceChecks, 'checkCatalogServices').mockResolvedValueOnce(checkCatalogServicesResult);

        // Test execution
        const result = await checkBASDestination(destination as Endpoint);

        // Result check
        expect(result.destinationResults.HTML5DynamicDestination).toEqual(false);
        expect(result.messages.filter((m) => m.severity === Severity.Error).length).toBe(1);
    });

    test('HTML5.DynamicDestination set to true', async () => {
        const destination: Partial<Endpoint> = {
            Name: 'DEST',
            Host: 'https://one.dest:123',
            'HTML5.DynamicDestination': 'true'
        };
        jest.spyOn(serviceChecks, 'checkCatalogServices').mockResolvedValueOnce(checkCatalogServicesResult);

        // Test execution
        const result = await checkBASDestination(destination as Endpoint);

        // Result check
        expect(result.destinationResults.HTML5DynamicDestination).toEqual(true);
        expect(result.messages.filter((m) => m.severity >= Severity.Warning).length).toBe(0);
    });
});

describe('Destinaton tests, function checkBASDestinations()', () => {
    jest.setTimeout(10000);

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('Valid call should return destinations', async () => {
        // Mock setup
        mockGetAppStudioProxyURL.mockResolvedValueOnce('');
        const data = {
            'ONE': {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEEnabled: 'true',
                WebIDEUsage: 'odata_abap',
                'HTML5.DynamicDestination': 'true',
                Host: 'https://one.dest:123'
            },
            'TWO': {
                Name: 'TWO',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'OnPremise',
                Description: 'TWO_DESC',
                WebIDEEnabled: 'true',
                WebIDEUsage: 'odata_abap,dev_abap',
                'sap-client': '111',
                Host: 'http://two.dest:234'
            }
        } as Destinations;
        mockListDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check

        const expectedData = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                'HTML5.DynamicDestination': 'true',
                WebIDEEnabled: 'true',
                WebIDEUsage: 'odata_abap',
                UrlServiceType: 'Catalog Service',
                Host: 'https://one.dest:123'
            },
            {
                Name: 'TWO',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'OnPremise',
                Description: 'TWO_DESC',
                'sap-client': '111',
                WebIDEEnabled: 'true',
                WebIDEUsage: 'odata_abap,dev_abap',
                UrlServiceType: 'Catalog Service',
                Host: 'http://two.dest:234'
            }
        ];

        expect(destResult.destinations).toEqual(expectedData);
        expect(destResult.messages).toBeDefined();
    });

    test('No destinations and calling checkBASDestinations', async () => {
        // Mock setup
        const data = [];
        mockListDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations).toEqual(data);
        expect(destResult.messages).toBeDefined();
    });

    test('HTTP call returns error for all requests, should be in result messages', async () => {
        // Mock setup
        mockListDestinations.mockImplementationOnce(() => Promise.reject(new Error('HTTP ERROR')));

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.messages.find((e) => e.text.includes('HTTP ERROR'))).toBeDefined();
    });
});

describe('Destinaton tests, needsUsernamePassword()', () => {
    test('Password required, should return true', () => {
        const result = needsUsernamePassword({
            Authentication: 'NoAuthentication'
        } as Endpoint);
        expect(result).toBeTruthy();
    });

    test('No password required, should return false', () => {
        const result = needsUsernamePassword({} as unknown as Endpoint);
        expect(result).toBeFalsy();
    });
});

describe('Destination test for classification', () => {
    test('FullServiceUrl', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const data = {
            'FUL': {
                Name: 'FUL',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEEnabled: 'true',
                WebIDEUsage: 'USELESS, odata_gen',
                WebIDEAdditionalData: 'full_url',
                Host: 'https://one.dest:123'
            }
        } as Destinations;

        mockListDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.Name === 'FUL')?.UrlServiceType).toEqual(
            UrlServiceType.FullServiceUrl
        );
    });

    test('CatalogServiceUrl', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const data = {
            'CAT': {
                Name: 'CAT',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEEnabled: 'true',
                WebIDEUsage: 'USELESS, odata_abap',
                Host: 'https://one.dest:123'
            }
        } as Destinations;
        mockListDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.Name === 'CAT').UrlServiceType).toEqual(
            UrlServiceType.CatalogServiceUrl
        );
    });

    test('PartialUrl', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const data = {
            'PAR': {
                Name: 'PAR',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEEnabled: 'true',
                WebIDEUsage: 'odata_gen',
                Host: 'https://one.dest:123'
            }
        } as Destinations;
        mockListDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.Name === 'PAR').UrlServiceType).toEqual(UrlServiceType.PartialUrl);
    });

    test('InvalidUrl', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const data = {
            'INV': {
                Name: 'INV',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEEnabled: 'true',
                WebIDEUsage: 'odata_gen, odata_abap',
                WebIDEAdditionalData: 'full_url',
                Host: 'https://one.dest:123'
            }
        } as Destinations;
        mockListDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.Name === 'INV').UrlServiceType).toEqual(UrlServiceType.InvalidUrl);
    });
    test('InvalidUrl, no WebIDEUsage', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = {
            'INV': {
                Name: 'INV',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEEnabled: 'true',
                WebIDEAdditionalData: 'full_url',
                Host: 'https://one.dest:123'
            }
        } as Destinations;
        mockListDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.Name === 'INV').UrlServiceType).toEqual(UrlServiceType.InvalidUrl);
    });
    test('InvalidUrl, no WebIDEEnabled', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const data = {
            'INV': {
                Name: 'INV',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEAdditionalData: 'full_url',
                Host: 'https://one.dest:123'
            }
        } as Destinations;

        mockListDestinations.mockResolvedValueOnce(data);

        // Test execution
        const destResult = await checkBASDestinations();

        // Result check
        expect(destResult.destinations.find((d) => d.Name === 'INV').UrlServiceType).toEqual(UrlServiceType.InvalidUrl);
    });
});
