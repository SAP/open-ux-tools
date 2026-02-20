import type { Logger } from '@sap-ux/logger';
import type { AxiosRequestConfig } from 'axios';
import { UI5VersionService } from '../../src/abap/ui5-version-service';

jest.mock('axios');

describe('UI5VersionService', () => {
    let service: UI5VersionService;
    let mockLogger: jest.Mocked<Logger>;
    let mockGet: jest.SpyInstance;

    beforeEach(() => {
        mockLogger = {
            error: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        } as unknown as jest.Mocked<Logger>;

        const config: AxiosRequestConfig = {
            baseURL: 'https://example.sap.com'
        };

        service = new UI5VersionService(config);
        service.log = mockLogger;

        // Mock the get method
        mockGet = jest.spyOn(service, 'get');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('PATH constant', () => {
        it('should have the correct base path', () => {
            expect(UI5VersionService.PATH).toBe('/sap/public/bc/ui5_ui5');
        });
    });

    describe('getUI5Version', () => {
        it('should return UI5 version when API call succeeds', async () => {
            const mockResponse = {
                data: { Version: '1.96.27' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {}
            };
            mockGet.mockResolvedValue(mockResponse);

            const result = await service.getUI5Version();

            expect(result).toBe('1.96.27');
            expect(mockGet).toHaveBeenCalledWith('/bootstrap_info.json', {
                transformResponse: expect.any(Function)
            });
        });

        it('should throw error when version is missing', async () => {
            const mockResponse = {
                data: { Version: '' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {}
            };
            mockGet.mockResolvedValue(mockResponse);

            await expect(service.getUI5Version()).rejects.toThrow('UI5 version not provided.');
            expect(mockLogger.error).toHaveBeenCalledWith('Could not get UI5 Version.');
            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network Error');
            mockGet.mockRejectedValue(networkError);

            await expect(service.getUI5Version()).rejects.toThrow('Network Error');
            expect(mockLogger.error).toHaveBeenCalledWith('Could not get UI5 Version.');
            expect(mockLogger.debug).toHaveBeenCalledWith(networkError);
        });

        it('should call transformResponse with correct function', async () => {
            const mockResponse = {
                data: { Version: '1.108.0' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {}
            };
            mockGet.mockResolvedValue(mockResponse);

            await service.getUI5Version();

            const transformResponse = mockGet.mock.calls[0][1].transformResponse;
            expect(typeof transformResponse).toBe('function');

            const jsonString = '{"Version":"1.108.0"}';
            const parsed = transformResponse(jsonString);
            expect(parsed).toEqual({ Version: '1.108.0' });
        });
    });
});
