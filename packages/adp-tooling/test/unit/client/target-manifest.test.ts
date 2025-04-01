import type { ToolsLogger } from '@sap-ux/logger';
import { AbapServiceProvider } from '@sap-ux/axios-extension';

import { TargetManifest } from '../../../src';
import { initI18n, t } from '../../../src/i18n';

jest.mock('@sap-ux/logger');

describe('ManifestManager', () => {
    let manifestManager: TargetManifest;
    let mockProvider: jest.Mocked<AbapServiceProvider>;
    let mockLogger: jest.Mocked<ToolsLogger>;

    const fakeId = 'test-app-id';
    const fakeManifestUrl = 'http://example.com/manifest';
    const fakeManifest = { 'sap.app': {} };

    const getAppInfoMock = jest.fn().mockResolvedValue({ [fakeId]: { manifestUrl: fakeManifestUrl } });
    const requestMock = jest.fn().mockResolvedValue({ data: JSON.stringify(fakeManifest) });
    const maniFirstMock = jest.fn().mockResolvedValue(true);

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        mockProvider = {
            getAppIndex: jest.fn().mockReturnValue({
                getAppInfo: getAppInfoMock,
                getIsManiFirstSupported: maniFirstMock
            }),
            request: requestMock
        } as unknown as jest.Mocked<AbapServiceProvider>;
        mockLogger = { debug: jest.fn(), error: jest.fn() } as unknown as jest.Mocked<ToolsLogger>;

        manifestManager = new TargetManifest(mockProvider, mockLogger);
        manifestManager.resetCache();
    });

    afterEach(() => {
        requestMock.mockClear();
        maniFirstMock.mockClear();
    });

    describe('loadManifestUrl', () => {
        it('should cache manifest URL if not already cached', async () => {
            await manifestManager.getUrl(fakeId);
            expect(mockProvider.getAppIndex().getAppInfo).toHaveBeenCalledWith(fakeId);

            const url = await manifestManager.getUrl(fakeId);
            expect(url).toEqual(fakeManifestUrl);
            expect(mockProvider.getAppIndex().getAppInfo).toBeCalledTimes(1);
        });
    });

    describe('loadManifest', () => {
        it('should fetch and cache manifest if URL is available and manifest is not cached', async () => {
            await manifestManager.getManifest(fakeId);
            const manifest = await manifestManager.getManifest(fakeId);

            expect(manifest).toEqual(fakeManifest);
            expect(mockProvider.request).toBeCalledTimes(1);
        });

        it('should not fetch manifest if already cached', async () => {
            await manifestManager.getManifest(fakeId);
            await manifestManager.getManifest(fakeId);
            expect(mockProvider.request).toBeCalledTimes(1);
        });

        it('should throw an error if manifest URL could not be loaded', async () => {
            requestMock.mockResolvedValue({ data: JSON.stringify(null) });
            await expect(manifestManager.getManifest('non-existent-id')).rejects.toThrow(
                'Failed to load manifest from URL: Manifest parsing error. Manifest is not in expected format.'
            );
        });
    });

    describe('isAppSupported', () => {
        it('should return true if app supports manifest-first approach', async () => {
            const isSupported = await manifestManager.isAppSupported(fakeId);

            expect(isSupported).toBe(true);
        });

        it('should throw an error if app does not support manifest-first approach', async () => {
            maniFirstMock.mockResolvedValue(false);
            await expect(manifestManager.isAppSupported(fakeId)).rejects.toThrow(
                t('validators.appDoesNotSupportManifest')
            );
        });

        it('should throw an error if the manifest url is not found after loading', async () => {
            maniFirstMock.mockResolvedValue(true);
            jest.spyOn(manifestManager, 'getUrl').mockResolvedValue(undefined);

            await expect(manifestManager.isAppSupported(fakeId)).rejects.toThrow(
                t('validators.adpDoesNotSupportSelectedApp')
            );
        });
    });
});
