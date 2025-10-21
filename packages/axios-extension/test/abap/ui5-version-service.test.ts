import type { Logger } from '@sap-ux/logger';
import type { AxiosRequestConfig } from 'axios';
import { UI5VersionService } from '../../src/abap/ui5-version-service';

// Mock axios
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
            // Arrange
            const mockResponse = {
                data: { Version: '1.96.27' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {}
            };
            mockGet.mockResolvedValue(mockResponse);

            // Act
            const result = await service.getUI5Version();

            // Assert
            expect(result).toBe('1.96.27');
            expect(mockGet).toHaveBeenCalledWith('/bootstrap_info.json', {
                transformResponse: expect.any(Function)
            });
        });

        it('should throw UI5VersionError when version is missing', async () => {
            // Arrange
            const mockResponse = {
                data: { Version: '' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {}
            };
            mockGet.mockResolvedValue(mockResponse);

            // Act & Assert
            await expect(service.getUI5Version()).rejects.toThrow('UI5 version not provided.');
            expect(mockLogger.error).toHaveBeenCalledWith('Could not get UI5 Version.');
            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it('should throw UI5VersionError when version is null', async () => {
            // Arrange
            const mockResponse = {
                data: { Version: null },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {}
            };
            mockGet.mockResolvedValue(mockResponse);

            // Act & Assert
            await expect(service.getUI5Version()).rejects.toThrow('UI5 version not provided.');
            expect(mockLogger.error).toHaveBeenCalledWith('Could not get UI5 Version.');
        });

        it('should throw UI5VersionError when version is undefined', async () => {
            // Arrange
            const mockResponse = {
                data: {},
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {}
            };
            mockGet.mockResolvedValue(mockResponse);

            // Act & Assert
            await expect(service.getUI5Version()).rejects.toThrow('UI5 version not provided.');
            expect(mockLogger.error).toHaveBeenCalledWith('Could not get UI5 Version.');
        });

        it('should handle network errors', async () => {
            // Arrange
            const networkError = new Error('Network Error');
            mockGet.mockRejectedValue(networkError);

            // Act & Assert
            await expect(service.getUI5Version()).rejects.toThrow('Network Error');
            expect(mockLogger.error).toHaveBeenCalledWith('Could not get UI5 Version.');
            expect(mockLogger.debug).toHaveBeenCalledWith(networkError);
        });

        it('should handle HTTP errors', async () => {
            // Arrange
            const httpError = {
                response: {
                    status: 404,
                    statusText: 'Not Found'
                },
                message: 'Request failed with status code 404'
            };
            mockGet.mockRejectedValue(httpError);

            // Act & Assert
            await expect(service.getUI5Version()).rejects.toEqual(httpError);
            expect(mockLogger.error).toHaveBeenCalledWith('Could not get UI5 Version.');
            expect(mockLogger.debug).toHaveBeenCalledWith(httpError);
        });

        it('should call transformResponse with correct function', async () => {
            // Arrange
            const mockResponse = {
                data: { Version: '1.108.0' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {}
            };
            mockGet.mockResolvedValue(mockResponse);

            // Act
            await service.getUI5Version();

            // Assert
            const transformResponse = mockGet.mock.calls[0][1].transformResponse;
            expect(typeof transformResponse).toBe('function');

            // Test the transform function
            const jsonString = '{"Version":"1.108.0"}';
            const parsed = transformResponse(jsonString);
            expect(parsed).toEqual({ Version: '1.108.0' });
        });
    });

    describe('toJSON method', () => {
        it('should parse valid JSON string', () => {
            // Arrange
            const service = new UI5VersionService({});
            const jsonString = '{"Version":"1.96.27","Build":"202303161130"}';

            // Act
            const result = (service as any).toJSON(jsonString);

            // Assert
            expect(result).toEqual({
                Version: '1.96.27',
                Build: '202303161130'
            });
        });

        it('should throw error for invalid JSON', () => {
            // Arrange
            const service = new UI5VersionService({});
            const invalidJson = '{"Version":invalid}';

            // Act & Assert
            expect(() => (service as any).toJSON(invalidJson)).toThrow();
        });
    });
});
