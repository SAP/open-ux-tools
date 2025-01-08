import type { Logger } from '@sap-ux/logger';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { fetchFallbackMetadata, fetchMetadata } from '../../../../src';

describe('Metadata Fetchers', () => {
    let mockProvider: AbapServiceProvider;
    let mockLogger: Logger;

    const baseUrl = new URL('https://example.com');
    const mockResponse = { data: '<xml>metadata</xml>' };

    beforeEach(() => {
        mockProvider = {
            get: jest.fn().mockResolvedValue(mockResponse)
        } as unknown as AbapServiceProvider;
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        } as unknown as Logger;
    });

    describe('fetchMetadata', () => {
        it('should fetch remote metadata successfully', async () => {
            const dataSource: ManifestNamespace.DataSource = {
                uri: '/odata/service1/',
                type: 'OData'
            };

            const result = await fetchMetadata(dataSource, baseUrl, mockProvider, mockLogger);

            expect(mockProvider.get).toHaveBeenCalledWith('https://example.com/odata/service1/$metadata');
            expect(result).toBe('<xml>metadata</xml>');
            expect(mockLogger.debug).toHaveBeenCalledWith('Fetching remote metadata from: /odata/service1/$metadata');
        });

        it('should throw an error if the provider request fails', async () => {
            (mockProvider.get as jest.Mock).mockRejectedValue(new Error('Fetch error'));

            const dataSource: ManifestNamespace.DataSource = {
                uri: '/odata/service1/',
                type: 'OData'
            };

            await expect(fetchMetadata(dataSource, baseUrl, mockProvider, mockLogger)).rejects.toThrow('Fetch error');

            expect(mockLogger.debug).toHaveBeenCalledWith('Fetching remote metadata from: /odata/service1/$metadata');
        });
    });

    describe('fetchFallbackMetadata', () => {
        it('should fetch local fallback metadata successfully', async () => {
            const dataSource: ManifestNamespace.DataSource = {
                uri: '/odata/service1/',
                type: 'OData',
                settings: { localUri: 'local/metadata.xml' }
            };

            const result = await fetchFallbackMetadata(dataSource, baseUrl, mockProvider, mockLogger);

            expect(mockProvider.get).toHaveBeenCalledWith('https://example.com/local/metadata.xml');
            expect(result).toBe('<xml>metadata</xml>');
            expect(mockLogger.debug).toHaveBeenCalledWith('Fetching local metadata from: /local/metadata.xml');
        });

        it('should throw an error if no localUri is specified', async () => {
            const dataSource: ManifestNamespace.DataSource = {
                uri: '/odata/service1/',
                type: 'OData',
                settings: {}
            };

            await expect(fetchFallbackMetadata(dataSource, baseUrl, mockProvider, mockLogger)).rejects.toThrow(
                'No localUri specified for the fallback fetch'
            );
        });

        it('should throw an error if the fallback request fails', async () => {
            (mockProvider.get as jest.Mock).mockRejectedValue(new Error('Fallback fetch error'));

            const dataSource: ManifestNamespace.DataSource = {
                uri: '/odata/service1/',
                type: 'OData',
                settings: { localUri: 'local/metadata.xml' }
            };

            await expect(fetchFallbackMetadata(dataSource, baseUrl, mockProvider, mockLogger)).rejects.toThrow(
                'Fallback fetch error'
            );

            expect(mockLogger.debug).toHaveBeenCalledWith('Fetching local metadata from: /local/metadata.xml');
        });
    });
});
