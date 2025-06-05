import { validateQfaJsonFile, validateAppSelection, isValidPromptState } from '../../src/utils/validators';
import type { QfaJsonConfig, QuickDeployedAppConfig, AppInfo } from '../../src/app/types';
import { t } from '../../src/utils/i18n';
import RepoAppDownloadLogger from '../../src/utils/logger';
import { downloadApp, hasQfaJson } from '../../src/utils/download-utils';
import type { AppIndex } from '@sap-ux/axios-extension';
import { ErrorHandler, ERROR_TYPE } from '@sap-ux/inquirer-common';
import { HELP_NODES } from '@sap-ux/guided-answers-helper';
import { PromptState } from '../../src/prompts/prompt-state';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { qfaJsonFileName } from '../../src/utils/constants';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { MessageType } from '@sap-devx/yeoman-ui-types';

jest.mock('../../src/utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    }
}));

jest.mock('../../src/utils/download-utils', () => ({
    downloadApp: jest.fn(),
    hasQfaJson: jest.fn(() => true)
}));

jest.mock('@sap-ux/inquirer-common', () => ({
    ...jest.requireActual('@sap-ux/inquirer-common')
}));

ErrorHandler.getHelpLink = jest.fn();

describe('validateQfaJsonFile', () => {
    const validConfig: QfaJsonConfig = {
        metadata: { package: 'valid-package' },
        serviceBindingDetails: {
            serviceName: 'validService',
            serviceVersion: '1.0.0',
            mainEntityName: 'validEntity'
        },
        projectAttribute: { moduleName: 'validModule' },
        deploymentDetails: { repositoryName: 'validRepository' },
        fioriLaunchpadConfiguration: {
            semanticObject: 'semanticObject',
            action: 'action',
            title: 'title'
        }
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when all validation functions pass', () => {
        const result = validateQfaJsonFile(validConfig);
        expect(result).toBe(true);
    });

    it('should return false and log an error when metadata validation fails', () => {
        const invalidMetadataConfig = {
            ...validConfig,
            metadata: { package: '' } // Invalid package
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidMetadataConfig);
        expect(result).toBe(false);
        expect(RepoAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidMetadataPackage'));
    });

    it('should return false and log an error when service binding details validation fails', () => {
        const invalidServiceBindingConfig = {
            ...validConfig,
            serviceBindingDetails: {
                ...validConfig.serviceBindingDetails,
                serviceName: '' // Invalid service name
            }
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidServiceBindingConfig);
        expect(result).toBe(false);
        expect(RepoAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidServiceName'));
    });

    it('should return false and log an error when service binding version is not provided', () => {
        const invalidServiceBindingConfig = {
            ...validConfig,
            serviceBindingDetails: {
                ...validConfig.serviceBindingDetails,
                serviceVersion: '' // Invalid service version
            }
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidServiceBindingConfig);
        expect(result).toBe(false);
        expect(RepoAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidServiceVersion'));
    });

    it('should return false and log an error when main entity name is missing', () => {
        const invalidServiceBindingConfig = {
            ...validConfig,
            serviceBindingDetails: {
                ...validConfig.serviceBindingDetails,
                mainEntityName: '' // Invalid main entity name
            }
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidServiceBindingConfig);
        expect(result).toBe(false);
        expect(RepoAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidMainEntityName'));
    });

    it('should return false and log an error when project attribute validation fails', () => {
        const invalidProjectAttributeConfig = {
            ...validConfig,
            projectAttribute: { moduleName: '' } // Invalid module name
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidProjectAttributeConfig);
        expect(result).toBe(false);
        expect(RepoAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidModuleName'));
    });

    it('should return false and log an error when deployment details validation fails', () => {
        const invalidDeploymentDetailsConfig = {
            ...validConfig,
            deploymentDetails: { repositoryName: '' } // Invalid repository name
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidDeploymentDetailsConfig);
        expect(result).toBe(false);
        expect(RepoAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidRepositoryName'));
    });
});

describe('validateAppSelection', () => {
    const mockGetHelpLink = ErrorHandler.getHelpLink as jest.Mock;
    const mockDownloadApp = downloadApp as jest.Mock;
    const mockHelpLink = { url: 'https://GA-link.com' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return a help link if quickDeployedAppConfig exists and no apps are found', async () => {
        const quickDeployedAppConfig: QuickDeployedAppConfig = { appId: '12345' };
        const appList: AppIndex = [];

        mockGetHelpLink.mockResolvedValue(mockHelpLink);
        const result = await validateAppSelection({} as AppInfo, appList, quickDeployedAppConfig);

        expect(mockGetHelpLink).toHaveBeenCalledTimes(1);
        expect(mockGetHelpLink).toHaveBeenCalledWith(
            HELP_NODES.ADT_APP_NOT_FOUND_ERROR,
            ERROR_TYPE.INTERNAL_SERVER_ERROR,
            'error.noAppsDeployed'
        );
        expect(result).toBe(mockHelpLink);
    });

    it('should return a help link if no apps are available at all', async () => {
        const appList: AppIndex = [];
        const result = await validateAppSelection({} as AppInfo, appList);
        mockGetHelpLink.mockResolvedValue(mockHelpLink);

        expect(mockGetHelpLink).toHaveBeenCalledTimes(1);
        expect(mockGetHelpLink).toHaveBeenCalledWith(
            HELP_NODES.ADT_APP_NOT_FOUND_ERROR,
            ERROR_TYPE.INTERNAL_SERVER_ERROR,
            'error.noAppsDeployed'
        );
        expect(result).toBe(mockHelpLink);
    });

    it('should notify the user that the app contains no qfa.json file in it', async () => {
        const mockAppWizard = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        } as unknown as AppWizard;
        const appList: AppIndex = [{ appId: '12345', repoName: 'testRepo' }];
        const answers = { appId: '12345', repoName: 'testRepo' } as AppInfo;
        (hasQfaJson as jest.Mock).mockReturnValue(false);
        await validateAppSelection(answers, appList, undefined, mockAppWizard);
        expect(mockAppWizard.showError).toHaveBeenCalledWith(
            t('error.qfaJsonNotFound', { jsonFileName: qfaJsonFileName }),
            MessageType.notification
        );
    });

    it('should return true if a valid app is selected and download is successful', async () => {
        const appList: AppIndex = [{ appId: '12345', repoName: 'testRepo' }];
        const answers = { appId: '12345', repoName: 'testRepo' } as AppInfo;
        mockDownloadApp.mockResolvedValue(undefined);
        (hasQfaJson as jest.Mock).mockReturnValue(true);
        const result = await validateAppSelection(answers, appList);

        expect(mockDownloadApp).toHaveBeenCalledWith('testRepo');
        expect(result).toBe(true);
    });

    it('should return an error message if download fails', async () => {
        const appList: AppIndex = [{ appId: '12345', repoName: 'testRepo' }];
        const answers = { appId: '12345', repoName: 'testRepo' } as AppInfo;
        mockDownloadApp.mockRejectedValue(new Error('Download failed'));

        const result = await validateAppSelection(answers, appList);

        expect(mockDownloadApp).toHaveBeenCalledWith('testRepo');
        expect(result).toBe(t('error.appDownloadErrors.appDownloadFailure', { error: 'Download failed' }));
    });

    it('should return a message if no app is selected', async () => {
        const appList: AppIndex = [{ appId: '12345', repoName: 'testRepo' }];
        const result = await validateAppSelection({} as AppInfo, appList);

        expect(result).toBe(false);
    });
});

describe('isValidPromptState', () => {
    const mockServiceProvider = {
        defaults: {
            baseURL: 'https://mock.sap-system.com',
            params: {
                'sap-client': '100'
            }
        }
    } as unknown as AbapServiceProvider;

    beforeEach(() => {
        PromptState.reset();
        PromptState.systemSelection = {
            connectedSystem: {
                serviceProvider: mockServiceProvider
            }
        };
    });

    it('should return true when all conditions are met', () => {
        const targetFolder = '/mock/target/folder';
        const appId = 'mockAppId';
        const result = isValidPromptState(targetFolder, appId);
        expect(result).toBe(true);
    });

    it('should return false when serviceProvider is missing', () => {
        PromptState.systemSelection = {
            connectedSystem: {
                serviceProvider: null as unknown as AbapServiceProvider
            }
        };
        const targetFolder = '/mock/target/folder';
        const appId = 'mockAppId';
        const result = isValidPromptState(targetFolder, appId);
        expect(result).toBe(false);
    });

    it('should return false when appId is missing', () => {
        const targetFolder = '/mock/target/folder';
        const appId = undefined;
        const result = isValidPromptState(targetFolder, appId);
        expect(result).toBe(false);
    });

    it('should return false when targetFolder is missing', () => {
        const targetFolder = '';
        const appId = 'mockAppId';
        const result = isValidPromptState(targetFolder, appId);
        expect(result).toBe(false);
    });

    it('should return false serviceProvider, appId and targetFolder are missing', () => {
        const targetFolder = '';
        const appId = undefined;
        const result = isValidPromptState(targetFolder, appId);
        expect(result).toBe(false);
    });
});
