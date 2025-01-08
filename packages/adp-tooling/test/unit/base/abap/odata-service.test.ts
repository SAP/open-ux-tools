import type { Logger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { type AbapServiceProvider, type Ui5AppInfoContent } from '@sap-ux/axios-extension';

import { getDataSources, getDataSourceById, fetchMetadata, fetchFallbackMetadata, ODataService } from '../../../../src';

jest.mock('../../../../src/base/abap/metadata-fetchers.ts', () => ({
    fetchMetadata: jest.fn(),
    fetchFallbackMetadata: jest.fn()
}));

const fetchMetadataMock = fetchMetadata as jest.Mock;
const fetchFallbackMetadataMock = fetchFallbackMetadata as jest.Mock;

const mockManifest = {
    'sap.app': {
        dataSources: {
            'mainService': { uri: '/odata/service1', type: 'OData' } as ManifestNamespace.DataSource,
            'DataSource2': {
                uri: '/odata/service2',
                type: 'OData',
                settings: { localUri: 'local/metadata.xml' }
            } as ManifestNamespace.DataSource
        }
    }
} as unknown as Manifest;

describe('ODataService Utility Functions', () => {
    describe('getDataSources', () => {
        it('should return all data sources from the manifest', () => {
            const dataSources = getDataSources(mockManifest);
            expect(dataSources).toEqual(mockManifest['sap.app']?.dataSources);
        });

        it('should throw an error if no data sources are found', () => {
            expect(() => getDataSources({} as Manifest)).toThrow('No data sources found in the manifest');
        });
    });

    describe('getDataSourceById', () => {
        it('should return the data source with the specified ID', () => {
            const dataSource = getDataSourceById(mockManifest, 'mainService');
            expect(dataSource.uri).toBe('/odata/service1');
        });

        it('should throw an error if the data source ID is not found', () => {
            expect(() => getDataSourceById(mockManifest, 'NonExistingId')).toThrow(
                "Data source 'NonExistingId' was not found in the manifest."
            );
        });
    });
});

describe('ODataService Class', () => {
    let odataService: ODataService;
    const mockAppInfo = { url: '/base/url' } as Ui5AppInfoContent;
    const mockProvider = { defaults: { baseURL: 'https://example.com' } } as Partial<AbapServiceProvider>;
    const mockLogger: Partial<Logger> = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };

    beforeEach(() => {
        odataService = new ODataService(
            mockManifest,
            mockAppInfo,
            mockProvider as AbapServiceProvider,
            mockLogger as Logger
        );
        jest.clearAllMocks();
    });

    describe('getMetadata', () => {
        it('should fetch metadata for the specified data source ID', async () => {
            const mockMetadata = '<xml>...</xml>';
            fetchMetadataMock.mockResolvedValue(mockMetadata);

            const result = await odataService.getMetadata('mainService');

            expect(fetchMetadataMock).toHaveBeenCalledWith(
                expect.objectContaining({ uri: '/odata/service1' }),
                expect.any(URL),
                mockProvider,
                mockLogger
            );
            expect(result).toBe(mockMetadata);
            expect(mockLogger.debug).toHaveBeenCalledWith("Fetching remote metadata for data source 'mainService'");
        });

        it('should throw an error if fetchMetadata fails', async () => {
            fetchMetadataMock.mockRejectedValue(new Error('Fetch error'));

            await expect(odataService.getMetadata('mainService')).rejects.toThrow('Fetch error');
            expect(mockLogger.debug).toHaveBeenCalledWith("Fetching remote metadata for data source 'mainService'");
        });
    });

    describe('getMetadataWithFallback', () => {
        it('should return remote metadata if fetchMetadata succeeds', async () => {
            const mockMetadata = '<xml>data</xml>';
            fetchMetadataMock.mockResolvedValue(mockMetadata);

            const result = await odataService.getMetadataWithFallback('mainService');

            expect(fetchMetadataMock).toHaveBeenCalled();
            expect(result).toBe(mockMetadata);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                "Fetching metadata with fallback for data source 'mainService'..."
            );
        });

        it('should return fallback metadata if remote fetch fails', async () => {
            const mockFallbackMetadata = '<xml>fallback data</xml>';
            fetchMetadataMock.mockRejectedValue(new Error('Remote fetch failed'));
            fetchFallbackMetadataMock.mockResolvedValue(mockFallbackMetadata);

            const result = await odataService.getMetadataWithFallback('DataSource2');

            expect(fetchFallbackMetadataMock).toHaveBeenCalledWith(
                expect.objectContaining({ uri: '/odata/service2' }),
                expect.any(URL),
                mockProvider,
                mockLogger
            );
            expect(result).toBe(mockFallbackMetadata);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "Metadata fetching failed for 'DataSource2'. Will attempt fallback. Reason: Error: Remote fetch failed"
            );
        });

        it('should throw an error if both remote and fallback fetches fail', async () => {
            fetchMetadataMock.mockRejectedValue(new Error('Remote fetch failed'));
            fetchFallbackMetadataMock.mockRejectedValue(new Error('Fallback fetch failed'));

            await expect(odataService.getMetadataWithFallback('DataSource2')).rejects.toThrow('Fallback fetch failed');
            expect(mockLogger.error).toHaveBeenCalledWith("Local metadata fallback also failed for 'DataSource2'");
        });

        it('should throw an error if no localUri is configured and remote fetch fails', async () => {
            fetchMetadataMock.mockRejectedValue(new Error('Remote fetch failed'));

            await expect(odataService.getMetadataWithFallback('mainService')).rejects.toThrow('Remote fetch failed');
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Metadata fetching failed, no local fallback available for 'mainService'"
            );
        });
    });
});
