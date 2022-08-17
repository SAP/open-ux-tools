import axios from 'axios';
import { isAppStudio, getAppStudioProxyURL } from '@sap-ux/btp-utils';
import type { Destination } from '../../src';
import { checkBASDestination, checkBASDestinations, needsUsernamePassword, UrlServiceType, Severity } from '../../src';
import { destinations as destinationsApi } from '@sap/bas-sdk';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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

describe('Destinaton tests, function checkBASDestination()', () => {
    test('Valid destination, should return catalog results', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValue(true);
        const destination: Partial<Destination> = {
            name: 'ONE',
            host: 'https://one.dest:123',
            basProperties: {
                sapClient: '123'
            }
        };
        const v2catalogResponse = {
            status: 200,
            data: {
                d: {
                    results: ['V2_S1', 'V2_S2', 'V2_S3']
                }
            }
        };
        const v4catalogResponse = {
            status: 200,
            data: {
                value: [
                    { DefaultSystem: { Services: ['V4_S1'] } },
                    { DefaultSystem: { Services: ['V4_S2'] } },
                    { DefaultSystem: { Services: ['V4_S3'] } }
                ]
            }
        };
        mockedAxios.get.mockImplementation((url) => {
            if (url === 'http://ONE.dest/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection/?sap-client=123') {
                return Promise.resolve(v2catalogResponse);
            }
            if (
                url ===
                'http://ONE.dest/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)&sap-client=123'
            ) {
                return Promise.resolve(v4catalogResponse);
            }
            return Promise.reject();
        });

        // Test execution
        const result = await checkBASDestination(destination as Destination, 'testUsername', 'testPassword');

        // Result check
        expect(result.destinationResults.v2.results).toEqual(['V2_S1', 'V2_S2', 'V2_S3']);
        expect(result.destinationResults.v4.value).toEqual(v4catalogResponse.data.value);
        expect(result.messages.length > 0);
    });

    test('Catalog services return 500, HTML5.DynamicDestination missing', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const destination: Partial<Destination> = {
            name: 'DEST',
            host: 'https://one.dest:123'
        };
        mockedAxios.get.mockImplementation(() => Promise.resolve({ status: 500 }));

        // Test execution
        const result = await checkBASDestination(destination as Destination);

        // Result check
        expect(result.destinationResults.HTML5DynamicDestination).toEqual(false);
        expect(result.messages.filter((m) => m.severity === Severity.Error).length).toBe(1);
    });

    test('HTML5.DynamicDestination set to true', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const destination: Partial<Destination> = {
            name: 'DEST',
            host: 'https://one.dest:123',
            basProperties: {
                html5DynamicDestination: 'true'
            }
        };
        mockedAxios.get.mockImplementation(() => Promise.resolve({ status: 200 }));

        // Test execution
        const result = await checkBASDestination(destination as Destination);

        // Result check
        expect(result.destinationResults.HTML5DynamicDestination).toEqual(true);
        expect(result.messages.filter((m) => m.severity >= Severity.Warning).length).toBe(0);
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
