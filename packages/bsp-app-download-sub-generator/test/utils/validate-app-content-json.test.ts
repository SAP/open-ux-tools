import { validateAppContentJsonFile } from '../../src/utils/validate-app-content-json'; 
import { AppContentConfig } from '../../src/app/types';
import { t } from '../../src/utils/i18n';
import BspAppDownloadLogger from '../../src/utils/logger';

jest.mock('../../src/utils/logger', () => ({
    logger: {
        error: jest.fn()
    }
}));

describe('validateAppContentJsonFile', () => {
    const validConfig: AppContentConfig = {
        metadata: { package: 'valid-package' },
        serviceBindingDetails: {
            serviceName: 'validService',
            serviceVersion: '1.0.0',
            mainEntityName: 'validEntity',
        },
        projectAttribute: { moduleName: 'validModule' },
        deploymentDetails: { repositoryName: 'validRepository' },
        fioriLaunchpadConfiguration: {
            semanticObject: 'semanticObject',
            action: 'action',
            title: 'title'
        },
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when all validation functions pass', () => {
        const result = validateAppContentJsonFile(validConfig);
        expect(result).toBe(true);
    });

    it('should return false and log an error when metadata validation fails', () => {
        const invalidMetadataConfig = {
            ...validConfig,
            metadata: { package: '' } // Invalid package
        } as unknown as AppContentConfig;

        const result = validateAppContentJsonFile(invalidMetadataConfig);
        expect(result).toBe(false);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidMetadataPackage')); 
    });

    it('should return false and log an error when service binding details validation fails', () => {
        const invalidServiceBindingConfig = {
            ...validConfig,
            serviceBindingDetails: {
                ...validConfig.serviceBindingDetails,
                serviceName: '', // Invalid service name
            }
        } as unknown as AppContentConfig;

        const result = validateAppContentJsonFile(invalidServiceBindingConfig);
        expect(result).toBe(false);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidServiceName'));
    });

    it('should return false and log an error when service binding version is not provided', () => {
        const invalidServiceBindingConfig = {
            ...validConfig,
            serviceBindingDetails: {
                ...validConfig.serviceBindingDetails,
                serviceVersion: '' // Invalid service version
            }
        } as unknown as AppContentConfig;

        const result = validateAppContentJsonFile(invalidServiceBindingConfig);
        expect(result).toBe(false);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidServiceVersion'));
    });

    it('should return false and log an error when main entity name is missing', () => {
        const invalidServiceBindingConfig = {
            ...validConfig,
            serviceBindingDetails: {
                ...validConfig.serviceBindingDetails,
                mainEntityName: '' // Invalid main entity name
            }
        } as unknown as AppContentConfig;

        const result = validateAppContentJsonFile(invalidServiceBindingConfig);
        expect(result).toBe(false);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidMainEntityName'));
    });

    it('should return false and log an error when project attribute validation fails', () => {
        const invalidProjectAttributeConfig = {
            ...validConfig,
            projectAttribute: { moduleName: '' } // Invalid module name
        } as unknown as AppContentConfig;

        const result = validateAppContentJsonFile(invalidProjectAttributeConfig);
        expect(result).toBe(false); 
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidModuleName'));
    });

    it('should return false and log an error when deployment details validation fails', () => {
        const invalidDeploymentDetailsConfig = {
           ...validConfig,
            deploymentDetails: { repositoryName: '' } // Invalid repository name
        } as unknown as AppContentConfig;

        const result = validateAppContentJsonFile(invalidDeploymentDetailsConfig);
        expect(result).toBe(false);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidRepositoryName'));
    });
});
