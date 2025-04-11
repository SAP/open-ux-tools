import { validateQfaJsonFile } from '../../src/utils/validators'; 
import { QfaJsonConfig } from '../../src/app/types';
import { t } from '../../src/utils/i18n';
import BspAppDownloadLogger from '../../src/utils/logger';

jest.mock('../../src/utils/logger', () => ({
    logger: {
        error: jest.fn()
    }
}));

describe('validateQfaJsonFile', () => {
    const validConfig: QfaJsonConfig = {
        metadata: { package: 'valid-package' },
        service_binding_details: {
            service_name: 'validService',
            service_version: '1.0.0',
            main_entity_name: 'validEntity',
        },
        project_attribute: { module_name: 'validModule' },
        deployment_details: { repository_name: 'validRepository' },
        fiori_launchpad_configuration: {
            semantic_object: 'semanticObject',
            action: 'action',
            title: 'title'
        },
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
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidMetadataPackage')); 
    });

    it('should return false and log an error when service binding details validation fails', () => {
        const invalidServiceBindingConfig = {
            ...validConfig,
            service_binding_details: {
                ...validConfig.service_binding_details,
                service_name: '', // Invalid service name
            }
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidServiceBindingConfig);
        expect(result).toBe(false);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidServiceName'));
    });

    it('should return false and log an error when service binding version is not provided', () => {
        const invalidServiceBindingConfig = {
            ...validConfig,
            service_binding_details: {
                ...validConfig.service_binding_details,
                service_version: '' // Invalid service version
            }
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidServiceBindingConfig);
        expect(result).toBe(false);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidServiceVersion'));
    });

    it('should return false and log an error when main entity name is missing', () => {
        const invalidServiceBindingConfig = {
            ...validConfig,
            service_binding_details: {
                ...validConfig.service_binding_details,
                main_entity_name: '' // Invalid main entity name
            }
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidServiceBindingConfig);
        expect(result).toBe(false);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidMainEntityName'));
    });

    it('should return false and log an error when project attribute validation fails', () => {
        const invalidProjectAttributeConfig = {
            ...validConfig,
            project_attribute: { module_name: '' } // Invalid module name
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidProjectAttributeConfig);
        expect(result).toBe(false); 
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidModuleName'));
    });

    it('should return false and log an error when deployment details validation fails', () => {
        const invalidDeploymentDetailsConfig = {
           ...validConfig,
           deployment_details: { repository_name: '' } // Invalid repository name
        } as unknown as QfaJsonConfig;

        const result = validateQfaJsonFile(invalidDeploymentDetailsConfig);
        expect(result).toBe(false);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.invalidRepositoryName'));
    });
});
