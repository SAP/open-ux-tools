import { AxiosError } from 'axios';
import { isAppStudio, getAppStudioProxyURL } from '@sap-ux/btp-utils';
import { Destination, Severity } from '../../src/types';
import { checkBASDestination, checkBASDestinations, needsUsernamePassword } from '../../src/checks/destination';
import { UrlServiceType } from '../../src/types';
import { destinations as destinationsApi } from '@sap/bas-sdk';
import { createForDestination } from '@sap-ux/axios-extension';

jest.mock('@sap-ux/axios-extension', () => ({
    ...(jest.requireActual('@sap-ux/axios-extension') as object),
    createForDestination: jest.fn()
}));

const mockCreateForDestination = createForDestination as jest.Mock;

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

        const expectedData = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
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

describe('Destinaton tests, function checkBASDestination()', () => {
    test('Valid destination, should return catalog results', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValue(true);
        const destination: Partial<Destination> = {
            Name: 'ONE',
            Host: 'https://one.dest:123',
            'sap-client': '123'
        };
        const v2catalogResponse = ['V2_S1', 'V2_S2', 'V2_S3'];
        const v4catalogResponse = ['V4_S1', 'V4_S2', 'V4_S3'];

        const catalog = jest.fn();
        const listServices = jest.fn();

        listServices.mockImplementationOnce(() => v2catalogResponse).mockImplementationOnce(() => v4catalogResponse);

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        mockCreateForDestination.mockImplementation(() => {
            return {
                catalog: catalog
            };
        });

        // Test execution
        const result = await checkBASDestination(destination as Destination, 'testUsername', 'testPassword');

        // Result check
        expect(result.destinationResults.v2.results).toEqual(['V2_S1', 'V2_S2', 'V2_S3']);
        expect(result.destinationResults.v4.results).toEqual(v4catalogResponse);
        expect(result.messages.length > 0);
    });

    test('Catalog services return 401, HTML5.DynamicDestination missing', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const destination: Partial<Destination> = {
            Name: 'DEST',
            Host: 'https://one.dest:123'
        };
        const catalog = jest.fn();
        const listServices = jest.fn();

        const error = {
            response: {
                status: 401
            }
        } as AxiosError;

        listServices.mockImplementationOnce(() => {
            throw error;
        });

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        mockCreateForDestination.mockImplementation(() => {
            return {
                catalog: catalog
            };
        });
        // Test execution
        const result = await checkBASDestination(destination as Destination);

        // Result check
        expect(result.destinationResults.HTML5DynamicDestination).toEqual(false);
        expect(result.messages.filter((m) => m.severity === Severity.Error).length).toBe(3);
    });

    test('Catalog services return 403, HTML5.DynamicDestination missing', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const destination: Partial<Destination> = {
            Name: 'DEST',
            Host: 'https://one.dest:123'
        };
        const catalog = jest.fn();
        const listServices = jest.fn();

        const error = {
            response: {
                status: 403
            }
        } as AxiosError;

        listServices.mockImplementationOnce(() => {
            throw error;
        });

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        mockCreateForDestination.mockImplementation(() => {
            return {
                catalog: catalog
            };
        });
        // Test execution
        const result = await checkBASDestination(destination as Destination);

        // Result check
        expect(result.destinationResults.HTML5DynamicDestination).toEqual(false);
        expect(result.messages.filter((m) => m.severity === Severity.Error).length).toBe(3);
    });

    test('HTML5.DynamicDestination set to true', async () => {
        // Mock setup
        mockIsAppStudio.mockReturnValueOnce(true);

        const destination: Partial<Destination> = {
            Name: 'DEST',
            Host: 'https://one.dest:123',
            'HTML5.DynamicDestination': 'true'
        };
        const v2catalogResponse = ['V2_S1', 'V2_S2', 'V2_S3'];
        const v4catalogResponse = ['V4_S1', 'V4_S2', 'V4_S3'];

        const catalog = jest.fn();
        const listServices = jest.fn();

        listServices.mockImplementationOnce(() => v2catalogResponse).mockImplementationOnce(() => v4catalogResponse);

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        mockCreateForDestination.mockImplementation(() => {
            return {
                catalog: catalog
            };
        });

        // Test execution
        const result = await checkBASDestination(destination as Destination);

        // Result check
        expect(result.destinationResults.HTML5DynamicDestination).toEqual(true);
        expect(result.messages.filter((m) => m.severity >= Severity.Warning).length).toBe(0);
    });
});

describe('Destinaton tests, needsUsernamePassword()', () => {
    test('Password required, should return true', () => {
        const result = needsUsernamePassword({
            Authentication: 'NoAuthentication'
        } as Destination);
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
        expect(destResult.destinations.find((d) => d.Name === 'FUL')?.UrlServiceType).toEqual(
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
        expect(destResult.destinations.find((d) => d.Name === 'CAT').UrlServiceType).toEqual(
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
        expect(destResult.destinations.find((d) => d.Name === 'PAR').UrlServiceType).toEqual(UrlServiceType.PartialUrl);
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
        expect(destResult.destinations.find((d) => d.Name === 'INV').UrlServiceType).toEqual(UrlServiceType.InvalidUrl);
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
        expect(destResult.destinations.find((d) => d.Name === 'INV').UrlServiceType).toEqual(UrlServiceType.InvalidUrl);
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
        expect(destResult.destinations.find((d) => d.Name === 'INV').UrlServiceType).toEqual(UrlServiceType.InvalidUrl);
    });
});
