import { jest } from '@jest/globals';
import type { RepoAppDownloadAnswers, AppItem } from '../../src/app/types.js';
import { PromptNames, AppDownloadType } from '../../src/app/types.js';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import {
    adtSourceTemplateId,
    appListResultFields,
    abapRepoResultFields,
    generatorTitleConfig
} from '../../src/utils/constants.js';
import { t } from '../../src/utils/i18n.js';
import { DatasourceType, type ConnectedSystem } from '@sap-ux/odata-service-inquirer';

jest.unstable_mockModule('../../src/utils/logger', () => {
    const mock = {
        logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
        configureLogging: jest.fn()
    };
    return { default: mock, ...mock };
});

const { fetchAppListForSelectedSystem, formatAppChoices, getYUIDetails } =
    await import('../../src/prompts/prompt-helpers.js');
const { PromptState } = await import('../../src/prompts/prompt-state.js');
const RepoAppDownloadLogger = (await import('../../src/utils/logger.js')).default;

describe('fetchAppListForSelectedSystem', () => {
    const mockServiceProvider = {
        getAppIndex: jest.fn().mockReturnValue({
            search: jest.fn().mockResolvedValue([{ id: 'app1' }, { id: 'app2' }])
        })
    } as unknown as AbapServiceProvider;

    const mockAnswers: RepoAppDownloadAnswers = {
        [PromptNames.systemSelection]: {
            datasourceType: DatasourceType.sapSystem,
            connectedSystem: {
                serviceProvider: mockServiceProvider
            } as ConnectedSystem
        },
        [PromptNames.selectedApp]: {
            appId: 'mockAppId',
            title: 'mockTitle',
            description: 'mockDescription',
            repoName: 'mockRepoName',
            url: 'mockUrl'
        },
        [PromptNames.targetFolder]: 'mockTargetFolder'
    };

    it('should fetch the application list when systemSelection and serviceProvider are provided', async () => {
        const result = await fetchAppListForSelectedSystem(
            mockAnswers[PromptNames.systemSelection].connectedSystem as ConnectedSystem,
            mockAnswers[PromptNames.selectedApp].appId
        );

        expect(mockServiceProvider.getAppIndex().search).toHaveBeenCalledWith(expect.anything(), expect.anything());
        expect(result).toEqual([{ id: 'app1' }, { id: 'app2' }]);
        expect(PromptState.systemSelection).toEqual({
            connectedSystem: { serviceProvider: mockServiceProvider }
        });
    });

    it('should return an empty array when serviceProvider is not provided', async () => {
        const result = await fetchAppListForSelectedSystem(undefined as unknown as ConnectedSystem);
        expect(result).toEqual([]);
    });

    it('should filter out ADT source template apps for AbapRepository download type on modern systems', async () => {
        const adtApp = { 'sap.app/sourceTemplate/id': adtSourceTemplateId, id: 'adt-app' };
        const regularApp = { 'sap.app/sourceTemplate/id': 'some/other/template', id: 'regular-app' };
        const noTemplateApp = { id: 'no-template-app' };
        const mockSearch = jest.fn().mockResolvedValue([adtApp, regularApp, noTemplateApp]);
        const provider = {
            getAppIndex: jest.fn().mockReturnValue({ search: mockSearch })
        } as unknown as AbapServiceProvider;

        const result = await fetchAppListForSelectedSystem(
            { serviceProvider: provider } as ConnectedSystem,
            undefined,
            AppDownloadType.AbapRepository
        );

        expect(mockSearch).toHaveBeenCalledTimes(1);
        expect(mockSearch).toHaveBeenCalledWith(expect.anything(), appListResultFields);
        expect(result).toEqual([regularApp, noTemplateApp]);
    });

    it('should retry without sourceTemplate/id for AbapRepository download type on older systems (HTTP 400)', async () => {
        const regularApp = { 'sap.app/id': 'regular-app', repoName: 'repo1', url: 'http://url' };
        const columnUnknownError = new Error('400 Column sap.app/sourceTemplate/id is unknown');
        const mockSearch = jest.fn().mockRejectedValueOnce(columnUnknownError).mockResolvedValueOnce([regularApp]);
        const provider = {
            getAppIndex: jest.fn().mockReturnValue({ search: mockSearch })
        } as unknown as AbapServiceProvider;

        const result = await fetchAppListForSelectedSystem(
            { serviceProvider: provider } as ConnectedSystem,
            undefined,
            AppDownloadType.AbapRepository
        );

        expect(mockSearch).toHaveBeenCalledTimes(2);
        expect(mockSearch).toHaveBeenNthCalledWith(1, expect.anything(), appListResultFields);
        expect(mockSearch).toHaveBeenNthCalledWith(2, expect.anything(), abapRepoResultFields);
        expect(result).toEqual([regularApp]);
    });

    it('should return empty array and log error when retry also fails on older systems', async () => {
        const columnUnknownError = new Error('400 Column sap.app/sourceTemplate/id is unknown');
        const retryError = new Error('Network failure');
        const mockSearch = jest.fn().mockRejectedValueOnce(columnUnknownError).mockRejectedValueOnce(retryError);
        const provider = {
            getAppIndex: jest.fn().mockReturnValue({ search: mockSearch })
        } as unknown as AbapServiceProvider;

        const result = await fetchAppListForSelectedSystem(
            { serviceProvider: provider } as ConnectedSystem,
            undefined,
            AppDownloadType.AbapRepository
        );

        expect(mockSearch).toHaveBeenCalledTimes(2);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.applicationListFetchError', { error: retryError.message })
        );
        expect(result).toEqual([]);
    });

    it('should not retry for AbapRepository when the error is not a sourceTemplate column unknown 400', async () => {
        const unrelatedError = new Error('500 Internal Server Error');
        const mockSearch = jest.fn().mockRejectedValueOnce(unrelatedError);
        const provider = {
            getAppIndex: jest.fn().mockReturnValue({ search: mockSearch })
        } as unknown as AbapServiceProvider;

        const result = await fetchAppListForSelectedSystem(
            { serviceProvider: provider } as ConnectedSystem,
            undefined,
            AppDownloadType.AbapRepository
        );

        expect(mockSearch).toHaveBeenCalledTimes(1);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.applicationListFetchError', { error: unrelatedError.message })
        );
        expect(result).toEqual([]);
    });

    it('should log an error if getAppList throws an error', async () => {
        const error = new Error('Mock error');
        mockServiceProvider.getAppIndex().search = jest.fn().mockRejectedValue(error) as any;
        const result = await fetchAppListForSelectedSystem(
            mockAnswers[PromptNames.systemSelection].connectedSystem as ConnectedSystem,
            mockAnswers[PromptNames.selectedApp].appId
        );
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.applicationListFetchError', { error: error.message })
        );
        expect(result).toEqual([]);
    });
});

describe('formatAppChoices', () => {
    const validApp: AppItem = {
        'sap.app/id': 'app1',
        'sap.app/title': 'App 1',
        'sap.app/description': 'Description for App 1',
        'repoName': 'repo1',
        'url': 'http://mock-url.com/app1'
    };

    const invalidApp: AppItem = {
        'sap.app/id': 'app2',
        'sap.app/title': 'App 2',
        'repoName': '', // no repo name
        'url': 'http://mock-url.com/app2'
    };

    it('should format valid app list correctly', () => {
        const appList: AppIndex = [validApp];
        const result = formatAppChoices(appList);

        expect(result).toEqual([
            {
                name: 'app1',
                value: {
                    appId: 'app1',
                    title: 'App 1',
                    description: 'Description for App 1',
                    repoName: 'repo1',
                    url: 'http://mock-url.com/app1'
                }
            }
        ]);
    });

    it('should log error if required fields are missing', () => {
        const appList: AppIndex = [invalidApp];
        const result = formatAppChoices(appList);
        expect(RepoAppDownloadLogger.logger.warn).toHaveBeenCalledWith(
            t('warn.requiredFieldsMissing', { app: JSON.stringify(appList) })
        );
    });

    it('should handle a mix of valid and invalid apps by throwing an error', () => {
        const appList: AppIndex = [validApp, invalidApp];
        const result = formatAppChoices(appList);
        expect(RepoAppDownloadLogger.logger.warn).toHaveBeenCalledWith(
            t('warn.requiredFieldsMissing', { app: JSON.stringify(appList) })
        );
    });

    it('should return an empty array if the app list is empty', () => {
        const appList: AppIndex = [];
        const result = formatAppChoices(appList);
        expect(result).toEqual([]);
    });
});

describe('getYUIDetails', () => {
    it('should return an array with the correct name and description for download of ADTQuickDeploy apps', () => {
        const result = getYUIDetails(AppDownloadType.ADTQuickDeploy);
        expect(result).toEqual([
            {
                name: generatorTitleConfig[AppDownloadType.ADTQuickDeploy].title,
                description: generatorTitleConfig[AppDownloadType.ADTQuickDeploy].description
            }
        ]);
    });

    it('should return an array with the correct name and description for download of AbapRepository apps', () => {
        const result = getYUIDetails(AppDownloadType.AbapRepository);
        expect(result).toEqual([
            {
                name: generatorTitleConfig[AppDownloadType.AbapRepository].title,
                description: generatorTitleConfig[AppDownloadType.AbapRepository].description
            }
        ]);
    });
});
