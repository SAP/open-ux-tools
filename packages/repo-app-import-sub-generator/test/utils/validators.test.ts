import { validateQfaJsonFile } from '../../src/utils/validators'; 
import { QfaJsonConfig } from '../../src/app/types';
import { t } from '../../src/utils/i18n';
import RepoAppDownloadLogger from '../../src/utils/logger';

jest.mock('../../src/utils/logger', () => ({
    logger: {
        error: jest.fn()
    }
}));

describe('validateQfaJsonFile', () => {
    const validConfig: QfaJsonConfig = {
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
                serviceName: '', // Invalid service name
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
