import { ManifestService } from '../../../../src/base/abap/manifest-service';
import * as axiosExtension from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';
import { getWebappFiles } from '../../../../src/base/helper';
import type { AdpPreviewConfig, DescriptorVariant } from '../../../../src/types';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import ZipFile from 'adm-zip';

jest.mock('@sap-ux/axios-extension');
jest.mock('adm-zip');
jest.mock('../../../../src/base/helper');
jest.mock('@sap-ux/system-access');

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

    const adpConfig: AdpPreviewConfig = {
        target: { url: 'https://example.com' },
        ignoreCertErrors: false
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

        (createAbapServiceProvider as jest.MockedFunction<typeof createAbapServiceProvider>).mockResolvedValue(
            provider
        );

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
        it('should initialize and fetch the base manifest with default ignoreCertErrors', async () => {
            const adpConfigWithoutIgnoreCers: AdpPreviewConfig = {
                target: { url: 'https://example.com' }
            };

            manifestService = await ManifestService.initBaseManifest('appId', adpConfigWithoutIgnoreCers, logger);

            expect(manifestService.getManifest()).toEqual(mockManifest);
            expect(createAbapServiceProvider).toHaveBeenCalledWith(
                adpConfig.target,
                { ignoreCertErrors: false },
                true,
                logger
            );
            expect(provider.getAppIndex().getAppInfo).toHaveBeenCalledWith('appId');
        });

        it('should initialize and fetch the base manifest with additional request options', async () => {
            const adpConfigWithoutIgnoreCers: AdpPreviewConfig = {
                target: { url: 'https://example.com' }
            };

            const requestOptions = {
                headers: {
                    'testHeader': 'testVa;'
                }
            };

            manifestService = await ManifestService.initBaseManifest(
                'appId',
                adpConfigWithoutIgnoreCers,
                logger,
                requestOptions
            );

            expect(manifestService.getManifest()).toEqual(mockManifest);
            expect(createAbapServiceProvider).toHaveBeenCalledWith(
                adpConfig.target,
                {
                    ...requestOptions,
                    ignoreCertErrors: false
                },
                true,
                logger
            );
            expect(provider.getAppIndex().getAppInfo).toHaveBeenCalledWith('appId');
        });

        it('should initialize and fetch the base manifest with ignoreCertErrors set to true', async () => {
            const adpConfigWithIgnoreCertErrors: AdpPreviewConfig = {
                target: { url: 'https://example.com' },
                ignoreCertErrors: true
            };

            manifestService = await ManifestService.initBaseManifest('appId', adpConfigWithIgnoreCertErrors, logger);
            expect(manifestService.getManifest()).toEqual(mockManifest);
            expect(createAbapServiceProvider).toHaveBeenCalledWith(
                adpConfigWithIgnoreCertErrors.target,
                { ignoreCertErrors: true },
                true,
                logger
            );
            expect(provider.getAppIndex().getAppInfo).toHaveBeenCalledWith('appId');
        });

        it('should initialize and fetch the base manifest with ignoreCertErrors set to false', async () => {
            manifestService = await ManifestService.initBaseManifest('appId', adpConfig, logger);
            expect(manifestService.getManifest()).toEqual(mockManifest);
            expect(createAbapServiceProvider).toHaveBeenCalledWith(
                adpConfig.target,
                { ignoreCertErrors: false },
                true,
                logger
            );
            expect(provider.getAppIndex().getAppInfo).toHaveBeenCalledWith('appId');
        });

        it('should initialize and fetch the base manifest with ignoreCertErrors set to true', async () => {
            const adpConfigWithIgnoreCertErrors: AdpPreviewConfig = {
                target: { url: 'https://example.com' },
                ignoreCertErrors: true
            };

            manifestService = await ManifestService.initBaseManifest('appId', adpConfigWithIgnoreCertErrors, logger);
            expect(manifestService.getManifest()).toEqual(mockManifest);
            expect(createAbapServiceProvider).toHaveBeenCalledWith(
                adpConfigWithIgnoreCertErrors.target,
                { ignoreCertErrors: true },
                true,
                logger
            );
            expect(provider.getAppIndex().getAppInfo).toHaveBeenCalledWith('appId');
        });

        it('should initialize and fetch the base manifest', async () => {
            manifestService = await ManifestService.initBaseManifest('appId', adpConfig, logger);
            expect(manifestService.getManifest()).toEqual(mockManifest);
        });

        it('should throw an error if the manifest URL is not found', async () => {
            (provider.getAppIndex().getAppInfo as jest.Mock).mockResolvedValueOnce({ appId: 'test' });

            await expect(ManifestService.initBaseManifest('appId', adpConfig, logger)).rejects.toThrow(
                'Manifest URL not found'
            );
        });

        it('should log errors on fetching or parsing failure', async () => {
            jest.spyOn(axiosExtension, 'isAxiosError').mockReturnValue(true);
            const error = new Error('fetching failed');

            provider.get.mockRejectedValue(error);
            await expect(ManifestService.initBaseManifest('appId', adpConfig, logger)).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalledWith('Manifest fetching failed');
            expect(logger.debug).toHaveBeenCalledWith(error);
        });

        it('should log an error if manifest parsing throws an exception', async () => {
            provider.get.mockResolvedValue({ data: 'invalid json' });

            await expect(ManifestService.initBaseManifest('appId', adpConfig, logger)).rejects.toThrow();
            expect(logger.error).toHaveBeenCalledWith('Manifest parsing error: Manifest is not in expected format.');
        });
    });

    describe('initMergedManifest', () => {
        it('should initialize and fetch the merged manifest with default ignoreCertErrors', async () => {
            const adpConfigWithoutIgnoreCers: AdpPreviewConfig = {
                target: { url: 'https://example.com' }
            };
            const variant = { id: 'descriptorVariantId', reference: 'referenceAppId' };
            (getWebappFiles as jest.MockedFunction<typeof getWebappFiles>).mockReturnValue([
                { relativePath: 'path', content: 'content' }
            ]);
            manifestService = await ManifestService.initMergedManifest(
                'basePath',
                variant as unknown as DescriptorVariant,
                adpConfigWithoutIgnoreCers,
                logger
            );

            expect(manifestService.getManifest()).toEqual(mockManifest);
            expect(createAbapServiceProvider).toHaveBeenCalledWith(
                adpConfig.target,
                { ignoreCertErrors: false },
                true,
                logger
            );
        });

        it('should initialize and fetch the merged manifest with additional request options', async () => {
            const adpConfigWithoutIgnoreCers: AdpPreviewConfig = {
                target: { url: 'https://example.com' }
            };
            const variant = { id: 'descriptorVariantId', reference: 'referenceAppId' };
            const requestOptions = {
                headers: {
                    'testHeader': 'testVa;'
                }
            };
            (getWebappFiles as jest.MockedFunction<typeof getWebappFiles>).mockReturnValue([
                { relativePath: 'path', content: 'content' }
            ]);
            manifestService = await ManifestService.initMergedManifest(
                'basePath',
                variant as unknown as DescriptorVariant,
                adpConfigWithoutIgnoreCers,
                logger,
                requestOptions
            );

            expect(manifestService.getManifest()).toEqual(mockManifest);
            expect(createAbapServiceProvider).toHaveBeenCalledWith(
                adpConfig.target,
                {
                    ...requestOptions,
                    ignoreCertErrors: false
                },
                true,
                logger
            );
        });

        it('should initialize and fetch the merged manifest', async () => {
            const variant = { id: 'descriptorVariantId', reference: 'referenceAppId' };
            (getWebappFiles as jest.MockedFunction<typeof getWebappFiles>).mockReturnValue([
                { relativePath: 'path', content: 'content' }
            ]);
            manifestService = await ManifestService.initMergedManifest(
                'basePath',
                variant as unknown as DescriptorVariant,
                adpConfig,
                logger
            );
            expect(manifestService.getManifest()).toEqual(mockManifest);
        });
    });

    describe('getManifestDataSources', () => {
        it('should return the data sources from the manifest', async () => {
            manifestService = await ManifestService.initBaseManifest('appId', adpConfig, logger);
            const dataSources = manifestService.getManifestDataSources();
            expect(dataSources).toEqual(mockManifest['sap.app'].dataSources);
        });

        it('should throw an error when no data sources are found in the manifest', async () => {
            provider.get.mockResolvedValue({ data: JSON.stringify({ 'sap.app': {} }) });
            manifestService = await ManifestService.initBaseManifest('appId', adpConfig, logger);

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
            manifestService = await ManifestService.initBaseManifest('appId', adpConfig, logger);
            const metadata = await manifestService.getDataSourceMetadata('someDataSource');

            expect(metadata).toEqual('metadata');
        });

        it('should fallback to local metadata if fetching metadata fails', async () => {
            provider.get
                .mockResolvedValueOnce({ data: JSON.stringify(mockManifest) })
                .mockRejectedValueOnce('fetching failed')
                .mockResolvedValueOnce({ data: 'local metadata' });
            manifestService = await ManifestService.initBaseManifest('appId', adpConfig, logger);
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
            manifestService = await ManifestService.initBaseManifest('appId', adpConfig, logger);

            try {
                await manifestService.getDataSourceMetadata('someDataSource');
            } catch (e) {
                expect(e).toEqual('fetching failed');
            }
            expect(logger.error).toHaveBeenCalledWith('Metadata fetching failed');
        });

        it('should handle base URLs ending with and without a slash properly', async () => {
            const baseConfig: AdpPreviewConfig = {
                target: { url: 'https://example.com/' },
                ignoreCertErrors: false
            };

            const baseConfigWithoutSlash: AdpPreviewConfig = {
                target: { url: 'https://example.com' },
                ignoreCertErrors: false
            };

            provider.get
                .mockResolvedValueOnce({ data: JSON.stringify(mockManifest) })
                .mockRejectedValueOnce(new Error('fetching failed'))
                .mockImplementationOnce((url) => {
                    if (url === 'https://example.com/local/uri') {
                        return Promise.resolve({ data: '<metadata>local content</metadata>' });
                    } else {
                        return Promise.reject('URL unexpected in test');
                    }
                })
                .mockResolvedValueOnce({ data: JSON.stringify(mockManifest) })
                .mockRejectedValueOnce(new Error('fetching failed'))
                .mockImplementationOnce((url: string) => {
                    if (url === 'https://example.com/local/uri') {
                        return Promise.resolve({ data: '<metadata>local content</metadata>' });
                    } else {
                        return Promise.reject('URL unexpected in test');
                    }
                });
            manifestService = await ManifestService.initBaseManifest('appId', baseConfig, logger);
            let metadata = await manifestService.getDataSourceMetadata('someDataSource');
            expect(metadata).toEqual('<metadata>local content</metadata>');

            mockAppInfoContent.appId.url = '/sapApp/';
            manifestService = await ManifestService.initBaseManifest('appId', baseConfigWithoutSlash, logger);
            metadata = await manifestService.getDataSourceMetadata('someDataSource');
            expect(metadata).toEqual('<metadata>local content</metadata>');
            mockAppInfoContent.appId.url = '/sapApp/';
        });

        it('should throw an error if local metadata fallback also fails', async () => {
            const error = new Error('fetching failed');
            provider.get
                .mockResolvedValueOnce({ data: JSON.stringify(mockManifest) })
                .mockRejectedValue(error)
                .mockRejectedValue(error);
            manifestService = await ManifestService.initBaseManifest('appId', adpConfig, logger);
            await expect(manifestService.getDataSourceMetadata('someDataSource')).rejects.toThrow(error);
            expect(logger.warn).toHaveBeenCalledWith('Metadata fetching failed. Fallback to local metadata');
            expect(logger.error).toHaveBeenCalledWith('Local metadata fallback fetching failed');
        });

        it('should throw an error if data source is not found', async () => {
            manifestService = await ManifestService.initBaseManifest('appId', adpConfig, logger);
            await expect(manifestService.getDataSourceMetadata('nonExistentDataSource')).rejects.toThrow(
                'No metadata path found in the manifest'
            );
        });
    });
});
