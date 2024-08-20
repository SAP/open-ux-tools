import type { ToolsLogger } from '@sap-ux/logger';

import type { Application, AbapProvider } from '../../../../src';

import {
    ABAP_APPS_PARAMS,
    ABAP_VARIANT_APPS_PARAMS,
    ApplicationManager,
    filterApps,
    getApplicationChoices
} from '../../../../src';

jest.mock('i18next', () => ({
    t: jest.fn((key) => key)
}));

const searchMock = jest.fn();

const mockAbapProvider = {
    getProvider: jest.fn().mockReturnValue({
        getAppIndex: jest.fn().mockReturnValue({
            search: searchMock
        })
    })
};

describe('Application Service', () => {
    let service: ApplicationManager;

    const loggerMock = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn()
    } as Partial<ToolsLogger> as ToolsLogger;

    const mockApps = [
        { 'sap.app/id': '1', 'sap.app/title': 'App One' },
        { 'sap.app/id': '2', 'sap.app/title': 'App Two' }
    ];

    beforeEach(() => {
        service = new ApplicationManager(mockAbapProvider as unknown as AbapProvider, true, loggerMock);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('loadApps', () => {
        it('should load applications correctly for cloud systems', async () => {
            searchMock.mockResolvedValue(mockApps);

            const apps = await service.loadApps(true);
            expect(apps.length).toBe(2);
            expect(apps[0].title).toEqual('App One');
        });

        test('should check that apps are reset', async () => {
            searchMock.mockResolvedValue(mockApps);

            const apps = await service.loadApps(true);
            expect(apps.length).toBe(2);

            service.resetApps();
            expect(service.getApps().length).toBe(0);
        });

        it('should load and merge applications correctly for non-cloud customer base systems', async () => {
            const mockCloudApps = [{ 'sap.app/id': '1', 'sap.app/title': 'App One' }];
            const mockVariantApps = [{ 'sap.app/id': '3', 'sap.app/title': 'App Three' }];
            searchMock.mockResolvedValueOnce(mockCloudApps).mockResolvedValueOnce(mockVariantApps);

            const apps = await service.loadApps(false);
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
                        id: '3',
                        registrationIds: [],
                        title: 'App Three'
                    }
                ])
            );
            expect(searchMock).toHaveBeenCalledTimes(2);
            expect(searchMock).toHaveBeenCalledWith(ABAP_APPS_PARAMS);
            expect(searchMock).toHaveBeenCalledWith(ABAP_VARIANT_APPS_PARAMS);
        });

        it('should throw an error if apps cannot be loaded', async () => {
            searchMock.mockRejectedValue(new Error('Failed to fetch'));

            await expect(service.loadApps(true)).rejects.toThrow('validators.cannotLoadApplicationsError');
            expect(loggerMock.error).toHaveBeenCalledWith('Could not load apps: Failed to fetch');
        });
    });

    describe('getApplicationChoices', () => {
        const apps = [
            {
                ach: '',
                bspName: '',
                bspUrl: '',
                fileType: 'variant',
                id: '1',
                registrationIds: ['F2134'],
                title: 'App One'
            }
        ];

        test('should return apps in correct list prompt format when title is available', () => {
            expect(getApplicationChoices(apps)).toEqual([
                {
                    name: 'App One (1, F2134)',
                    value: {
                        ach: '',
                        bspName: '',
                        bspUrl: '',
                        fileType: 'variant',
                        id: '1',
                        registrationIds: ['F2134'],
                        title: 'App One'
                    }
                }
            ]);
        });

        test('should return apps in correct list prompt format when title is unavailable', () => {
            apps[0].title = undefined as unknown as string;
            expect(getApplicationChoices(apps)).toEqual([
                {
                    name: '1 (F2134)',
                    value: {
                        ach: '',
                        bspName: '',
                        bspUrl: '',
                        fileType: 'variant',
                        id: '1',
                        registrationIds: ['F2134'],
                        title: undefined
                    }
                }
            ]);
        });
    });

    describe('filterApps', () => {
        it('sorts applications alphabetically by title', () => {
            const appA = { id: '1', title: 'Application B' } as Application;
            const appB = { id: '2', title: 'Application A' } as Application;
            expect(filterApps(appA, appB)).toBe(1);
            expect(filterApps(appB, appA)).toBe(-1);
        });

        it('uses IDs if titles are empty', () => {
            const appA = { id: '2', title: '' } as Application;
            const appB = { id: '1', title: '' } as Application;
            expect(filterApps(appA, appB)).toBe(1);
            expect(filterApps(appB, appA)).toBe(-1);
        });

        it('returns 0 when both titles and IDs are identical', () => {
            const appA = { id: '1', title: 'Application' } as Application;
            const appB = { id: '1', title: 'Application' } as Application;
            expect(filterApps(appA, appB)).toBe(0);
        });
    });
});
