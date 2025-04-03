import type { Manifest } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { initI18n, t } from '../../../src/i18n';
import { SourceManifest, isSyncLoadedView, isV4Application } from '../../../src';

describe('SourceManifest', () => {
    let sourceManifest: SourceManifest;
    let mockProvider: jest.Mocked<AbapServiceProvider>;
    let mockLogger: jest.Mocked<ToolsLogger>;

    const fakeId = 'test-app-id';
    const fakeManifestUrl = 'http://example.com/manifest';
    const fakeManifest = { 'sap.app': {} };

    const getAppInfoMock = jest.fn().mockResolvedValue({ [fakeId]: { manifestUrl: fakeManifestUrl } });
    const requestMock = jest.fn().mockResolvedValue({ data: JSON.stringify(fakeManifest) });

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        mockProvider = {
            getAppIndex: jest.fn().mockReturnValue({
                getAppInfo: getAppInfoMock
            }),
            request: requestMock
        } as unknown as jest.Mocked<AbapServiceProvider>;

        mockLogger = { debug: jest.fn() } as unknown as jest.Mocked<ToolsLogger>;

        sourceManifest = new SourceManifest(mockProvider, fakeId, mockLogger);
    });

    it('should return manifest URL via getManifestUrl()', async () => {
        const url = await sourceManifest.getManifestUrl();
        expect(url).toBe(fakeManifestUrl);
        expect(getAppInfoMock).toHaveBeenCalledWith(fakeId);
    });

    it('should return manifest via getManifest()', async () => {
        const manifest = await sourceManifest.getManifest();
        expect(manifest).toEqual(fakeManifest);
        expect(requestMock).toHaveBeenCalledWith({ url: fakeManifestUrl });
    });

    it('should throw if manifest URL is missing', async () => {
        getAppInfoMock.mockResolvedValueOnce({ [fakeId]: {} }); // No manifestUrl or manifest

        await expect(sourceManifest.getManifestUrl()).rejects.toThrow(t('validators.appDoesNotSupportManifest'));
        expect(mockLogger.debug).toHaveBeenCalledWith(`Manifest URL for app '${fakeId}' was not found!`);
    });

    it('should throw if manifest is malformed', async () => {
        requestMock.mockResolvedValueOnce({ data: 'invalid-json' });

        await expect(sourceManifest.getManifest()).rejects.toThrow('Unexpected token i in JSON at position 0');
    });

    it('should throw if parsed manifest is not an object', async () => {
        requestMock.mockResolvedValueOnce({ data: JSON.stringify(null) });

        await expect(sourceManifest.getManifest()).rejects.toThrow(
            'Manifest parsing error. Manifest is not in expected format.'
        );
    });

    it('should log and rethrow error when manifest loading fails', async () => {
        requestMock.mockRejectedValueOnce(new Error('Network fail'));

        await expect(sourceManifest.getManifest()).rejects.toThrow('Failed to load manifest from URL: Network fail');
        expect(mockLogger.debug).toHaveBeenCalledWith(`Failed to load manifest for '${fakeId}', error: Network fail`);
    });
});

describe('isV4Application', () => {
    it('returns true if sap.fe.templates is present in dependencies.libs', () => {
        const manifest = {
            'sap.ui5': {
                dependencies: {
                    libs: {
                        'sap.fe.templates': {}
                    }
                }
            }
        } as unknown as Manifest;

        expect(isV4Application(manifest)).toBe(true);
    });

    it('returns false if sap.fe.templates is not present', () => {
        const manifest = {
            'sap.ui5': {
                dependencies: {
                    libs: {
                        'sap.m': {}
                    }
                }
            }
        } as unknown as Manifest;

        expect(isV4Application(manifest)).toBe(false);
    });

    it('returns false if manifest is undefined', () => {
        expect(isV4Application(undefined)).toBe(false);
    });
});

describe('isSyncLoadedView', () => {
    it('returns true if rootView.async is false', () => {
        const ui5Settings = {
            rootView: {
                async: false
            }
        } as Manifest['sap.ui5'];

        expect(isSyncLoadedView(ui5Settings)).toBe(true);
    });

    it('returns false if rootView.async is true', () => {
        const ui5Settings = {
            rootView: {
                async: true
            }
        } as Manifest['sap.ui5'];

        expect(isSyncLoadedView(ui5Settings)).toBe(false);
    });

    it('returns true if routing.config.async is false', () => {
        const ui5Settings = {
            routing: {
                config: {
                    async: false
                }
            }
        } as Manifest['sap.ui5'];

        expect(isSyncLoadedView(ui5Settings)).toBe(true);
    });

    it('returns false if routing.config.async is true', () => {
        const ui5Settings = {
            routing: {
                config: {
                    async: true
                }
            }
        } as Manifest['sap.ui5'];

        expect(isSyncLoadedView(ui5Settings)).toBe(false);
    });

    it('returns false if ui5Settings is undefined', () => {
        expect(isSyncLoadedView(undefined)).toBe(false);
    });
});
