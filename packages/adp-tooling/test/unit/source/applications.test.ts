import type { ToolsLogger } from '@sap-ux/logger';
import { AdaptationProjectType, type AbapServiceProvider } from '@sap-ux/axios-extension';

import { initI18n, t } from '../../../src/i18n';
import { isAppSupported, loadApps } from '../../../src';

describe('Target Applications', () => {
    const APP_FIELDS =
        'sap.app/id,sap.app/ach,sap.fiori/registrationIds,sap.app/title,url,fileType,repoName,sap.fiori/cloudDevAdaptationStatus';
    const APPS_WITH_DESCR_FILTER = {
        fields: APP_FIELDS,
        'sap.ui/technology': 'UI5',
        'sap.app/type': 'application',
        'fileType': 'appdescr'
    };
    const APPS_WITH_VARIANT_DESCR_FILTER = {
        fields: APP_FIELDS,
        'sap.ui/technology': 'UI5',
        'sap.app/type': 'application',
        'fileType': 'appdescr_variant',
        'originLayer': 'VENDOR'
    };
    const searchMock = jest.fn();

    const mockAbapProvider = {
        getAppIndex: jest.fn().mockReturnValue({
            search: searchMock
        })
    } as unknown as AbapServiceProvider;

    const cloudApps = [
        { 'sap.app/id': '1', 'sap.app/title': 'App One', 'sap.fiori/cloudDevAdaptationStatus': 'released' },
        { 'sap.app/id': '2', 'sap.app/title': 'App Two', 'sap.fiori/cloudDevAdaptationStatus': 'released' }
    ];

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('loadApps', () => {
        it('should load applications correctly for cloud project', async () => {
            searchMock.mockResolvedValue(cloudApps);

            const apps = await loadApps(mockAbapProvider, true, AdaptationProjectType.CLOUD_READY);
            expect(apps.length).toBe(2);
            expect(apps[0].title).toEqual('App One');
            expect(apps[0].cloudDevAdaptationStatus).toEqual('released');
        });

        it('should load and merge applications correctly for on-premise project', async () => {
            const mockCloudApps = [
                { 'sap.app/id': '1', 'sap.app/title': 'App One', 'sap.fiori/cloudDevAdaptationStatus': 'released' }
            ];
            const mockVariantApps = [{ 'sap.app/id': '2', 'sap.app/title': 'App Two' }];

            searchMock.mockResolvedValueOnce(mockCloudApps).mockResolvedValueOnce(mockVariantApps);

            const apps = await loadApps(mockAbapProvider, true, AdaptationProjectType.ON_PREMISE);

            expect(apps.length).toBe(2);
            expect(apps).toEqual(
                expect.arrayContaining([
                    {
                        ach: '',
                        bspName: '',
                        bspUrl: '',
                        fileType: '',
                        id: '1',
                        registrationIds: [],
                        title: 'App One',
                        cloudDevAdaptationStatus: 'released'
                    },
                    {
                        ach: '',
                        bspName: '',
                        bspUrl: '',
                        fileType: '',
                        id: '2',
                        registrationIds: [],
                        title: 'App Two',
                        cloudDevAdaptationStatus: ''
                    }
                ])
            );
            expect(searchMock).toHaveBeenCalledTimes(2);
            expect(searchMock).toHaveBeenCalledWith(APPS_WITH_DESCR_FILTER);
            expect(searchMock).toHaveBeenCalledWith(APPS_WITH_VARIANT_DESCR_FILTER);
        });

        it('should throw an error if apps cannot be loaded', async () => {
            const errorMsg = 'Could not load applications: Failed to fetch';
            searchMock.mockRejectedValue(new Error('Failed to fetch'));

            await expect(loadApps(mockAbapProvider, true, AdaptationProjectType.ON_PREMISE)).rejects.toThrow(errorMsg);
        });

        it('should return an empty array if no ADP project type is provided', async () => {
            searchMock.mockResolvedValue(cloudApps);

            const apps = await loadApps(mockAbapProvider, true);
            expect(apps).toEqual([]);
        });

        it('should sort applications alphabetically by title', async () => {
            const appA = { 'sap.app/id': '1', 'sap.app/title': 'Application A' };
            const appB = { 'sap.app/id': '2', 'sap.app/title': 'Application B' };

            searchMock.mockResolvedValue([appA, appB]);

            let apps = await loadApps(mockAbapProvider, false, AdaptationProjectType.ON_PREMISE);

            expect(apps.length).toBe(2);
            expect(apps[0].title).toBe('Application A');
            expect(apps[0].id).toBe('1');
            expect(apps[1].title).toBe('Application B');
            expect(apps[1].id).toBe('2');

            searchMock.mockResolvedValue([appB, appA]);
            apps = await loadApps(mockAbapProvider, false, AdaptationProjectType.ON_PREMISE);

            expect(apps.length).toBe(2);
            expect(apps[0].title).toBe('Application A');
            expect(apps[0].id).toBe('1');
            expect(apps[1].title).toBe('Application B');
            expect(apps[1].id).toBe('2');
        });

        it('should sort applications by ids if titles are not provided', async () => {
            const appA = { 'sap.app/id': '1' };
            const appB = { 'sap.app/id': '2', 'sap.app/title': '' };

            searchMock.mockResolvedValue([appA, appB]);

            let apps = await loadApps(mockAbapProvider, false, AdaptationProjectType.ON_PREMISE);

            expect(apps.length).toBe(2);
            expect(apps[0].id).toBe('1');
            expect(apps[1].id).toBe('2');

            searchMock.mockResolvedValue([appB, appA]);
            apps = await loadApps(mockAbapProvider, false, AdaptationProjectType.ON_PREMISE);

            expect(apps.length).toBe(2);
            expect(apps[0].id).toBe('1');
            expect(apps[1].id).toBe('2');
        });
    });

    describe('isAppSupported', () => {
        const fakeAppId = 'my.app';
        const logger: jest.Mocked<ToolsLogger> = { debug: jest.fn() } as any;

        const getIsManiFirstSupportedMock = jest.fn();
        const mockProvider = {
            getAppIndex: jest.fn().mockReturnValue({
                getIsManiFirstSupported: getIsManiFirstSupportedMock
            })
        } as unknown as AbapServiceProvider;

        beforeAll(async () => {
            await initI18n();
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should return true when manifest-first is supported', async () => {
            getIsManiFirstSupportedMock.mockResolvedValue(true);

            const result = await isAppSupported(mockProvider, fakeAppId, logger);

            expect(result).toBe(true);
            expect(getIsManiFirstSupportedMock).toHaveBeenCalledWith(fakeAppId);
            expect(logger.debug).not.toHaveBeenCalled();
        });

        it('should throw an error when manifest-first is not supported', async () => {
            getIsManiFirstSupportedMock.mockResolvedValue(false);

            await expect(isAppSupported(mockProvider, fakeAppId, logger)).rejects.toThrow(
                t('validators.appDoesNotSupportManifest')
            );

            expect(logger.debug).toHaveBeenCalledWith(
                `Application '${fakeAppId}' is not supported by Adaptation Project`
            );
        });
    });
});
