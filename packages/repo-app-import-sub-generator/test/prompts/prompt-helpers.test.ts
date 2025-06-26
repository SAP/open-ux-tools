import { fetchAppListForSelectedSystem, formatAppChoices, getYUIDetails } from '../../src/prompts/prompt-helpers';
import type { RepoAppDownloadAnswers, AppItem } from '../../src/app/types';
import { PromptNames } from '../../src/app/types';
import { PromptState } from '../../src/prompts/prompt-state';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import { generatorTitle, generatorDescription } from '../../src/utils/constants';
import { t } from '../../src/utils/i18n';
import RepoAppDownloadLogger from '../../src/utils/logger';
import { DatasourceType, type ConnectedSystem } from '@sap-ux/odata-service-inquirer';

jest.mock('../../src/utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    }
}));

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

    it('should log an error if getAppList throws an error', async () => {
        const error = new Error('Mock error');
        mockServiceProvider.getAppIndex().search = jest.fn().mockRejectedValue(error);
        const result = await fetchAppListForSelectedSystem(
            mockAnswers[PromptNames.systemSelection].connectedSystem as ConnectedSystem,
            mockAnswers[PromptNames.selectedApp].appId
        );
        expect(RepoAppDownloadLogger.logger.error).toBeCalledWith(
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
        expect(RepoAppDownloadLogger.logger.warn).toBeCalledWith(
            t('warn.requiredFieldsMissing', { app: JSON.stringify(appList) })
        );
    });

    it('should handle a mix of valid and invalid apps by throwing an error', () => {
        const appList: AppIndex = [validApp, invalidApp];
        const result = formatAppChoices(appList);
        expect(RepoAppDownloadLogger.logger.warn).toBeCalledWith(
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
    it('should return an array with the correct name and description', () => {
        const result = getYUIDetails();
        expect(result).toEqual([
            {
                name: generatorTitle,
                description: generatorDescription
            }
        ]);
    });
});
