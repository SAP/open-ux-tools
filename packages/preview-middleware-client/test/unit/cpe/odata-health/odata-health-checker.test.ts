import ODataModel2, {
    oDataMetadataLoadedSpy,
    oDataDestroySpy as oDataV2DestroySpy
} from 'mock/sap/ui/model/odata/v2/ODataModel';
import ODataModel4, {
    oDataRequestObjectSpy,
    oDataDestroySpy as oDataV4DestroySpy
} from 'mock/sap/ui/model/odata/v4/ODataModel';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ODataHealthChecker } from '../../../../src/cpe/odata-health/odata-health-checker';
import { ODataDownStatus, ODataUpStatus } from '../../../../src/cpe/odata-health/odata-health-status';

type ODataVersion = 'v2' | 'v4' | '2.0' | '4.0';

interface DataSource {
    uri: string;
    type: string;
    settings: {
        odataVersion?: ODataVersion;
        localUri: string;
    };
}

type DataSourceRecord = Record<string, DataSource>;

type Manifest = {
    'sap.app': {
        dataSources: DataSourceRecord;
    };
};

describe('ODataHealthChecker', () => {
    const MANIFEST_WITH_HEALTHY_SERVICES: Manifest = {
        'sap.app': {
            dataSources: {
                service1: {
                    uri: 'http://localhost:8080/service1',
                    type: 'OData',
                    settings: {
                        localUri: '/service1'
                    }
                },
                service2: {
                    uri: 'http://localhost:8080/service2',
                    type: 'OData',
                    settings: {
                        odataVersion: 'v4' as const,
                        localUri: '/service2'
                    }
                },
                annotationsService: {
                    uri: 'http://localhost:8080/annotations',
                    type: 'ODataAnnotation',
                    settings: {
                        localUri: '/annotations'
                    }
                }
            }
        }
    };

    const MANIFEST_WITH_UNHEALTHY_SERVICE: Manifest = {
        'sap.app': {
            dataSources: {
                workingService: {
                    uri: 'http://localhost:8080/working',
                    type: 'OData',
                    settings: {
                        odataVersion: '2.0' as const,
                        localUri: '/working'
                    }
                },
                failingService: {
                    uri: 'http://localhost:8080/failing',
                    type: 'OData',
                    settings: {
                        odataVersion: 'v2' as const,
                        localUri: '/failing'
                    }
                }
            }
        }
    };

    let healthChecker: ODataHealthChecker;
    const getManifestMock: jest.Mock = jest.fn();
    const rtaMock: jest.Mocked<RuntimeAuthoring> = {
        getRootControlInstance: () => ({
            getManifest: getManifestMock
        })
    } as unknown as jest.Mocked<RuntimeAuthoring>;

    beforeEach(() => {
        healthChecker = new ODataHealthChecker(rtaMock);
        jest.clearAllMocks();
    });

    describe('getHealthStatus', () => {
        it('should return health status for all services', async () => {
            getManifestMock.mockReturnValue(MANIFEST_WITH_HEALTHY_SERVICES);

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
            getManifestMock.mockReturnValue(MANIFEST_WITH_UNHEALTHY_SERVICE);
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
            getManifestMock.mockReturnValue({});
            let result = await healthChecker.getHealthStatus();
            expect(result).toHaveLength(0);

            getManifestMock.mockReturnValue({ 'sap.app': {} });
            result = await healthChecker.getHealthStatus();
            expect(result).toHaveLength(0);

            getManifestMock.mockReturnValue({
                'sap.app': {
                    dataSources: {}
                }
            });
            result = await healthChecker.getHealthStatus();
            expect(result).toHaveLength(0);
        });
    });
});
