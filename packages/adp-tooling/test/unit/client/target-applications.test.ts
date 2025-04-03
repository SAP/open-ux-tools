import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import type { SourceApplication } from '../../../src';
import { ABAP_APPS_PARAMS, ABAP_VARIANT_APPS_PARAMS, filterApps, loadApps } from '../../../src';

const searchMock = jest.fn();
const isAbapCloudMock = jest.fn().mockResolvedValue(false);

const mockAbapProvider = {
    getAppIndex: jest.fn().mockReturnValue({
        search: searchMock
    }),
    isAbapCloud: isAbapCloudMock
} as unknown as AbapServiceProvider;

describe('Target Applications', () => {
    const mockApps = [
        { 'sap.app/id': '1', 'sap.app/title': 'App One' },
        { 'sap.app/id': '2', 'sap.app/title': 'App Two' }
    ];

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('loadApps', () => {
        it('should load applications correctly for cloud systems', async () => {
            searchMock.mockResolvedValue(mockApps);
            isAbapCloudMock.mockResolvedValue(true);

            const apps = await loadApps(mockAbapProvider, true);
            expect(apps.length).toBe(2);
            expect(apps[0].title).toEqual('App One');
        });

        it('should load and merge applications correctly for on-premise systems', async () => {
            const mockCloudApps = [{ 'sap.app/id': '1', 'sap.app/title': 'App One' }];
            const mockVariantApps = [{ 'sap.app/id': '2', 'sap.app/title': 'App Two' }];

            isAbapCloudMock.mockResolvedValue(false);
            searchMock.mockResolvedValueOnce(mockCloudApps).mockResolvedValueOnce(mockVariantApps);

            const apps = await loadApps(mockAbapProvider, true);

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
                        title: 'App One'
                    },
                    {
                        ach: '',
                        bspName: '',
                        bspUrl: '',
                        fileType: '',
                        id: '2',
                        registrationIds: [],
                        title: 'App Two'
                    }
                ])
            );
            expect(searchMock).toHaveBeenCalledTimes(2);
            expect(searchMock).toHaveBeenCalledWith(ABAP_APPS_PARAMS);
            expect(searchMock).toHaveBeenCalledWith(ABAP_VARIANT_APPS_PARAMS);
        });

        it('should throw an error if apps cannot be loaded', async () => {
            const errorMsg = 'Could not load applications: Failed to fetch';
            searchMock.mockRejectedValue(new Error('Failed to fetch'));

            await expect(loadApps(mockAbapProvider, true)).rejects.toThrow(errorMsg);
        });
    });

    describe('filterApps', () => {
        it('sorts applications alphabetically by title', () => {
            const appA = { id: '1', title: 'Application B' } as SourceApplication;
            const appB = { id: '2', title: 'Application A' } as SourceApplication;

            expect(filterApps(appA, appB)).toBe(1);
            expect(filterApps(appB, appA)).toBe(-1);
        });

        it('uses IDs if titles are empty', () => {
            const appA = { id: '2', title: '' } as SourceApplication;
            const appB = { id: '1', title: '' } as SourceApplication;

            expect(filterApps(appA, appB)).toBe(1);
            expect(filterApps(appB, appA)).toBe(-1);
        });

        it('returns 0 when both titles and IDs are identical', () => {
            const appA = { id: '1', title: 'Application' } as SourceApplication;
            const appB = { id: '1', title: 'Application' } as SourceApplication;

            expect(filterApps(appA, appB)).toBe(0);
        });
    });
});
