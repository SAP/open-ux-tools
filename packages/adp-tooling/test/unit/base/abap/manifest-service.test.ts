import ZipFile from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import * as axiosExtension from '@sap-ux/axios-extension';
import type { ManifestNamespace } from '@sap-ux/project-access';

import {
    ManifestService,
    getInboundsFromManifest,
    getRegistrationIdFromManifest
} from '../../../../src/base/abap/manifest-service';
import { getWebappFiles } from '../../../../src/base/helper';
import type { DescriptorVariant } from '../../../../src/types';

jest.mock('@sap-ux/axios-extension');
jest.mock('adm-zip');
jest.mock('../../../../src/base/helper');

describe('ManifestService', () => {
    let provider: jest.Mocked<axiosExtension.AbapServiceProvider>;
    let logger: jest.Mocked<ToolsLogger>;
    let manifestService: ManifestService;

    const mockAppInfoContent = {
        appId: {
            manifestUrl: 'https://example.com/manifest.json',
            url: '/sapApp'
        }
    };

    const mockManifest = {
        'sap.app': {
            dataSources: {
                someDataSource: {
                    uri: '/some/uri',
                    settings: {
                        localUri: '/local/uri'
                    }
                }
            }
        }
    };

    beforeEach(async () => {
        provider = {
            get: jest.fn().mockResolvedValue({ data: JSON.stringify(mockManifest) }),
            getAppIndex: jest.fn().mockReturnValue({
                getAppInfo: jest.fn().mockResolvedValue(mockAppInfoContent)
            }),
            getLayeredRepository: jest.fn().mockReturnValue({
                getCsrfToken: jest.fn().mockResolvedValue(true),
                mergeAppDescriptorVariant: jest
                    .fn()
                    .mockResolvedValue({ 'descriptorVariantId': { manifest: mockManifest } })
            }),
            defaults: { baseURL: 'https://example.com' }
        } as unknown as jest.Mocked<axiosExtension.AbapServiceProvider>;

        logger = {
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        } as unknown as jest.Mocked<ToolsLogger>;

        (ZipFile as jest.MockedClass<typeof ZipFile>).mockImplementation(
            () =>
                ({
                    addFile: jest.fn(),
                    toBuffer: jest.fn().mockReturnValue(Buffer.from('zip content'))
                } as unknown as ZipFile)
        );
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('initBaseManifest', () => {
        it('should initialize and fetch the base manifest', async () => {
            manifestService = await ManifestService.initBaseManifest(provider, 'appId', logger);

            expect(manifestService.getManifest()).toEqual(mockManifest);
            expect(provider.getAppIndex().getAppInfo).toHaveBeenCalledWith('appId');
        });

        it('should throw an error if the manifest URL is not found', async () => {
            (provider.getAppIndex().getAppInfo as jest.Mock).mockResolvedValueOnce({ appId: 'test' });

            await expect(ManifestService.initBaseManifest(provider, 'appId', logger)).rejects.toThrow(
                'Manifest URL not found'
            );
        });

        it('should log errors on fetching or parsing failure', async () => {
            jest.spyOn(axiosExtension, 'isAxiosError').mockReturnValue(true);
            const error = new Error('fetching failed');

            provider.get.mockRejectedValue(error);
            await expect(ManifestService.initBaseManifest(provider, 'appId', logger)).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalledWith('Manifest fetching failed');
            expect(logger.debug).toHaveBeenCalledWith(error);
        });

        it('should log an error if manifest parsing throws an exception', async () => {
            provider.get.mockResolvedValue({ data: 'invalid json' });

            await expect(ManifestService.initBaseManifest(provider, 'appId', logger)).rejects.toThrow();
            expect(logger.error).toHaveBeenCalledWith('Manifest parsing error: Manifest is not in expected format.');
        });
    });

    describe('initMergedManifest', () => {
        it('should initialize and fetch the merged manifest', async () => {
            const variant = { id: 'descriptorVariantId', reference: 'referenceAppId' };
            (getWebappFiles as jest.MockedFunction<typeof getWebappFiles>).mockReturnValue([
                { relativePath: 'path', content: 'content' }
            ]);
            manifestService = await ManifestService.initMergedManifest(
                provider,
                'basePath',
                variant as unknown as DescriptorVariant,
                logger
            );

            expect(manifestService.getManifest()).toEqual(mockManifest);
        });
    });

    describe('getManifestDataSources', () => {
        it('should return the data sources from the manifest', async () => {
            manifestService = await ManifestService.initBaseManifest(provider, 'appId', logger);
            const dataSources = manifestService.getManifestDataSources();
            expect(dataSources).toEqual(mockManifest['sap.app'].dataSources);
        });

        it('should throw an error when no data sources are found in the manifest', async () => {
            provider.get.mockResolvedValue({ data: JSON.stringify({ 'sap.app': {} }) });
            manifestService = await ManifestService.initBaseManifest(provider, 'appId', logger);

            expect(() => manifestService.getManifestDataSources()).toThrow('No data sources found in the manifest');
        });
    });

    describe('getDataSourceMetadata', () => {
        it('should return metadata of the data source', async () => {
            const mockManifest = {
                'sap.app': {
                    dataSources: {
                        someDataSource: {
                            uri: '/some/uri',
                            type: 'OData',
                            settings: {
                                localUri: 'metadata.xml',
                                annotations: ['annotation1']
                            }
                        }
                    }
                }
            };
            provider.get
                .mockResolvedValueOnce({ data: JSON.stringify(mockManifest) })
                .mockResolvedValueOnce({ data: 'metadata' });
            manifestService = await ManifestService.initBaseManifest(provider, 'appId', logger);
            const metadata = await manifestService.getDataSourceMetadata('someDataSource');

            expect(metadata).toEqual('metadata');
        });

        it('should fallback to local metadata if fetching metadata fails', async () => {
            provider.get
                .mockResolvedValueOnce({ data: JSON.stringify(mockManifest) })
                .mockRejectedValueOnce('fetching failed')
                .mockResolvedValueOnce({ data: 'local metadata' });
            manifestService = await ManifestService.initBaseManifest(provider, 'appId', logger);
            const metadata = await manifestService.getDataSourceMetadata('someDataSource');

            expect(metadata).toEqual('local metadata');
            expect(logger.warn).toHaveBeenCalledWith('Metadata fetching failed. Fallback to local metadata');
        });

        it('should throw an error if local URI is not provided for a fallback', async () => {
            const mockManifest = {
                'sap.app': {
                    dataSources: {
                        someDataSource: {
                            uri: '/some/uri',
                            settings: {}
                        }
                    }
                }
            };
            provider.get
                .mockResolvedValueOnce({ data: JSON.stringify(mockManifest) })
                .mockRejectedValueOnce('fetching failed');
            manifestService = await ManifestService.initBaseManifest(provider, 'appId', logger);

            try {
                await manifestService.getDataSourceMetadata('someDataSource');
            } catch (e) {
                expect(e).toEqual('fetching failed');
            }
            expect(logger.error).toHaveBeenCalledWith('Metadata fetching failed');
        });

        it('should throw an error if local metadata fallback also fails', async () => {
            const error = new Error('fetching failed');
            provider.get
                .mockResolvedValueOnce({ data: JSON.stringify(mockManifest) })
                .mockRejectedValue(error)
                .mockRejectedValue(error);
            manifestService = await ManifestService.initBaseManifest(provider, 'appId', logger);
            await expect(manifestService.getDataSourceMetadata('someDataSource')).rejects.toThrow(error);
            expect(logger.warn).toHaveBeenCalledWith('Metadata fetching failed. Fallback to local metadata');
            expect(logger.error).toHaveBeenCalledWith('Local metadata fallback fetching failed');
        });

        it('should throw an error if data source is not found', async () => {
            manifestService = await ManifestService.initBaseManifest(provider, 'appId', logger);
            await expect(manifestService.getDataSourceMetadata('nonExistentDataSource')).rejects.toThrow(
                'No metadata path found in the manifest'
            );
        });
    });

    describe('getInboundsFromManifest', () => {
        it('should return inbounds if present in the manifest', () => {
            const manifest = {
                'sap.app': {
                    crossNavigation: {
                        inbounds: {
                            inbound1: { semanticObject: 'Object1', action: 'action1' },
                            inbound2: { semanticObject: 'Object2', action: 'action2' }
                        }
                    }
                }
            } as unknown as ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;

            const result = getInboundsFromManifest(manifest);
            expect(result).toEqual({
                inbound1: { semanticObject: 'Object1', action: 'action1' },
                inbound2: { semanticObject: 'Object2', action: 'action2' }
            });
        });

        it('should return undefined if inbounds are not present in the manifest', () => {
            const manifest = {
                'sap.app': {}
            } as unknown as ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;

            const result = getInboundsFromManifest(manifest);
            expect(result).toBeUndefined();
        });
    });

    describe('getRegistrationIdFromManifest', () => {
        it('should return the first registration ID if present in the manifest', () => {
            const manifest = {
                'sap.fiori': {
                    registrationIds: ['F0024', 'F2445']
                }
            } as unknown as ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;

            const result = getRegistrationIdFromManifest(manifest);
            expect(result).toBe('F0024');
        });

        it('should return undefined if registrationIds array is empty', () => {
            const manifest = {
                'sap.fiori': {
                    registrationIds: []
                }
            } as unknown as ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;

            const result = getRegistrationIdFromManifest(manifest);
            expect(result).toBeUndefined();
        });
    });
});
