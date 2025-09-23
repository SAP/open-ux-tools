import ODataModel2, {
    oDataMetadataLoadedSpy,
    oDataDestroySpy as oDataV2DestroySpy
} from 'mock/sap/ui/model/odata/v2/ODataModel';
import ODataModel4, {
    oDataRequestObjectSpy,
    oDataDestroySpy as oDataV4DestroySpy
} from 'mock/sap/ui/model/odata/v4/ODataModel';
import * as apiHandler from '../../../../src/adp/api-handler';
import { ODataHealthChecker } from '../../../../src/cpe/odata-health/odata-health-checker';
import { ODataDownStatus, ODataUpStatus } from '../../../../src/cpe/odata-health/odata-health-status';

// Mock the api-handler module
jest.mock('../../../../src/adp/api-handler');

describe('ODataHealthChecker', () => {
    let healthChecker: ODataHealthChecker;
    let mockGetDataSourceAnnotationFileMap: jest.SpyInstance;

    beforeEach(() => {
        healthChecker = new ODataHealthChecker();
        mockGetDataSourceAnnotationFileMap = jest.spyOn(apiHandler, 'getDataSourceAnnotationFileMap');
        jest.clearAllMocks();
    });

    describe('getHealthStatus', () => {
        it('should return health status for all services', async () => {
            // Arrange
            const mockServices = {
                annotationDataSourceMap: {
                    service1: {
                        serviceUrl: 'http://localhost:8080/service1',
                        oDataVersion: 'v2' as const
                    },
                    service2: {
                        serviceUrl: 'http://localhost:8080/service2',
                        oDataVersion: 'v4' as const
                    }
                }
            };

            mockGetDataSourceAnnotationFileMap.mockResolvedValue(mockServices);

            // Mock successful metadata loading for both services
            oDataMetadataLoadedSpy.mockResolvedValue({ version: 'v2', metadata: 'test' });
            oDataRequestObjectSpy.mockResolvedValue({ version: 'v4', metadata: 'test' });

            // Act
            const result = await healthChecker.getHealthStatus();

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(ODataUpStatus);
            expect(result[1]).toBeInstanceOf(ODataUpStatus);
            expect(result[0].serviceUrl).toBe('http://localhost:8080/service1');
            expect(result[1].serviceUrl).toBe('http://localhost:8080/service2');

            // Assert model v2 lifecycle
            expect(ODataModel2).toHaveBeenCalledWith({
                serviceUrl: 'http://localhost:8080/service1',
                json: true,
                loadAnnotationsJoined: false
            });
            expect(oDataMetadataLoadedSpy).toHaveBeenCalledWith(true);
            expect(oDataV2DestroySpy).toHaveBeenCalled();

            // Assert model v4 lifecycle
            expect(ODataModel4).toHaveBeenCalledWith({
                serviceUrl: 'http://localhost:8080/service2',
                synchronizationMode: 'None'
            });
            expect(oDataRequestObjectSpy).toHaveBeenCalledWith('/');
            expect(oDataV4DestroySpy).toHaveBeenCalled();
        });

        it('should handle mixed success and failure scenarios', async () => {
            // Arrange
            const mockServices = {
                annotationDataSourceMap: {
                    workingService: {
                        serviceUrl: 'http://localhost:8080/working',
                        oDataVersion: 'v2' as const
                    },
                    failingService: {
                        serviceUrl: 'http://localhost:8080/failing',
                        oDataVersion: 'v2' as const
                    }
                }
            };

            mockGetDataSourceAnnotationFileMap.mockResolvedValue(mockServices);
            oDataMetadataLoadedSpy
                .mockResolvedValueOnce({ metadata: 'success' })
                .mockRejectedValueOnce(new Error('Service unavailable'));

            // Act
            const result = await healthChecker.getHealthStatus();

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(ODataUpStatus);
            expect(result[1]).toBeInstanceOf(ODataDownStatus);
            expect(result[0].serviceUrl).toBe('http://localhost:8080/working');
            expect(result[1].serviceUrl).toBe('http://localhost:8080/failing');
        });

        it('should handle empty service list', async () => {
            // Arrange
            mockGetDataSourceAnnotationFileMap.mockResolvedValue({
                annotationDataSourceMap: {}
            });

            // Act
            const result = await healthChecker.getHealthStatus();

            // Assert
            expect(result).toHaveLength(0);
        });

        it('should handle error during OData version retrieval', async () => {
            // Arrange
            const metadataReadErrorMsg = 'Failed to read metadata on the server.';
            const mockServices = {
                annotationDataSourceMap: {
                    errorService: {
                        serviceUrl: 'http://localhost:8080/error',
                        metadataReadErrorMsg
                    }
                }
            };

            mockGetDataSourceAnnotationFileMap.mockResolvedValue(mockServices);

            // Act
            const result = await healthChecker.getHealthStatus();
            const versionRetreivalErrorMessage = (result[0] as ODataDownStatus).errorMessage;

            // Assert
            expect(result[0].serviceUrl).toBe('http://localhost:8080/error');
            expect(versionRetreivalErrorMessage).toBe(
                `Unable to read OData version from the metadata xml. ${metadataReadErrorMsg}`
            );
        });
    });
});
