import { jest } from '@jest/globals';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Uaa } from '../../../src/types';

const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();

jest.unstable_mockModule('axios', () => ({
    default: {
        get: mockAxiosGet,
        post: mockAxiosPost
    },
    __esModule: true
}));

const { getToken, getBtpDestinationConfig, listBtpDestinations } = await import('../../../src/btp/api');
const { initI18n, t } = await import('../../../src/i18n');

describe('btp/api', () => {
    const mockLogger = {
        debug: jest.fn(),
        log: jest.fn(),
        error: jest.fn()
    } as unknown as ToolsLogger;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getToken', () => {
        const mockUaa: Uaa = {
            clientid: 'test-client-id',
            clientsecret: 'test-client-secret',
            url: '/test-uaa'
        };

        test('should successfully get OAuth token', async () => {
            const mockResponse = {
                data: {
                    access_token: 'test-access-token'
                }
            };
            mockAxiosPost.mockResolvedValue(mockResponse);

            const result = await getToken(mockUaa);

            expect(result).toBe('test-access-token');
            expect(mockAxiosPost).toHaveBeenCalledWith('/test-uaa/oauth/token', 'grant_type=client_credentials', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from('test-client-id:test-client-secret').toString('base64')
                }
            });
        });

        test('should throw error when token request fails', async () => {
            const error = new Error('Network error');
            mockAxiosPost.mockRejectedValue(error);

            await expect(getToken(mockUaa)).rejects.toThrow(t('error.failedToGetAuthKey', { error: 'Network error' }));
        });

        test('should handle missing access_token in response', async () => {
            const mockResponse = {
                data: {}
            };
            mockAxiosPost.mockResolvedValue(mockResponse);

            const result = await getToken(mockUaa);

            expect(result).toBeUndefined();
        });
    });

    describe('getBtpDestinationConfig', () => {
        const mockUri = 'https://destination-configuration.test.xx.hana.ondemand.com';
        const mockToken = 'test-bearer-token';
        const mockDestinationName = 'my-destination';

        test('should return destination configuration on success', async () => {
            const mockConfig = {
                Name: 'my-destination',
                ProxyType: 'OnPremise',
                URL: '/backend.example',
                Authentication: 'PrincipalPropagation'
            };
            mockAxiosGet.mockResolvedValue({
                data: { destinationConfiguration: mockConfig }
            });

            const result = await getBtpDestinationConfig(mockUri, mockToken, mockDestinationName, mockLogger);

            expect(result).toEqual(mockConfig);
            expect(mockAxiosGet).toHaveBeenCalledWith(
                `${mockUri}/destination-configuration/v1/destinations/${mockDestinationName}`,
                { headers: { Authorization: `Bearer ${mockToken}` } }
            );
        });

        test('should return undefined when request fails', async () => {
            mockAxiosGet.mockRejectedValue(new Error('Network error'));

            const result = await getBtpDestinationConfig(mockUri, mockToken, mockDestinationName, mockLogger);

            expect(result).toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to fetch destination config')
            );
        });

        test('should return undefined when destinationConfiguration is missing from response', async () => {
            mockAxiosGet.mockResolvedValue({ data: {} });

            const result = await getBtpDestinationConfig(mockUri, mockToken, mockDestinationName, mockLogger);

            expect(result).toBeUndefined();
        });

        test('should encode destination name in URL', async () => {
            const specialName = 'dest with spaces';
            mockAxiosGet.mockResolvedValue({ data: { destinationConfiguration: { Name: specialName } } });

            await getBtpDestinationConfig(mockUri, mockToken, specialName, mockLogger);

            expect(mockAxiosGet).toHaveBeenCalledWith(
                `${mockUri}/destination-configuration/v1/destinations/${encodeURIComponent(specialName)}`,
                expect.any(Object)
            );
        });
    });

    describe('listBtpDestinations', () => {
        const mockCredentials = {
            uri: 'https://destination.cfapps.example.com',
            uaa: { clientid: 'client-id', clientsecret: 'client-secret', url: 'https://auth.example.com' }
        };

        const mockBtpConfigs = [
            {
                Name: 'DEST_ONE',
                Type: 'HTTP',
                URL: 'https://one.example.com',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'First dest'
            },
            {
                Name: 'DEST_TWO',
                Type: 'HTTP',
                URL: 'https://two.example.com',
                Authentication: 'BasicAuthentication',
                ProxyType: 'OnPremise'
            }
        ];

        beforeEach(() => {
            mockAxiosPost.mockResolvedValueOnce({ data: { access_token: 'mock-token' } });
        });

        it('should return a Destinations map built from the BTP API response', async () => {
            mockAxiosGet.mockResolvedValueOnce({ data: mockBtpConfigs });

            const result = await listBtpDestinations(mockCredentials);

            expect(result).toEqual({
                DEST_ONE: {
                    Name: 'DEST_ONE',
                    Host: 'https://one.example.com',
                    Type: 'HTTP',
                    Authentication: 'NoAuthentication',
                    ProxyType: 'Internet',
                    Description: 'First dest'
                },
                DEST_TWO: {
                    Name: 'DEST_TWO',
                    Host: 'https://two.example.com',
                    Type: 'HTTP',
                    Authentication: 'BasicAuthentication',
                    ProxyType: 'OnPremise',
                    Description: ''
                }
            });
        });

        it('should handle flat credentials (no nested uaa object)', async () => {
            const flatCredentials = {
                uri: 'https://destination.cfapps.example.com',
                clientid: 'client-id',
                clientsecret: 'client-secret',
                url: 'https://auth.example.com'
            };
            mockAxiosGet.mockResolvedValueOnce({ data: mockBtpConfigs });

            const result = await listBtpDestinations(flatCredentials);

            expect(result).toEqual({
                DEST_ONE: {
                    Name: 'DEST_ONE',
                    Host: 'https://one.example.com',
                    Type: 'HTTP',
                    Authentication: 'NoAuthentication',
                    ProxyType: 'Internet',
                    Description: 'First dest'
                },
                DEST_TWO: {
                    Name: 'DEST_TWO',
                    Host: 'https://two.example.com',
                    Type: 'HTTP',
                    Authentication: 'BasicAuthentication',
                    ProxyType: 'OnPremise',
                    Description: ''
                }
            });
        });

        it('should throw when the BTP destination API call fails', async () => {
            mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

            await expect(listBtpDestinations(mockCredentials)).rejects.toThrow(
                t('error.failedToListBtpDestinations', { error: 'Network error' })
            );
        });
    });
});
