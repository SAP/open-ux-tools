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
            expect(manifestService.getAppInfo()?.manifestUrl).toEqual(mockAppInfoContent.appId.manifestUrl);
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
