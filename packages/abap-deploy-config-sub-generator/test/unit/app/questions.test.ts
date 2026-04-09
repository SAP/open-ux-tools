import { jest } from '@jest/globals';

import type { Destination } from '@sap-ux/btp-utils';
import type { AbapDeployConfigPromptOptions } from '@sap-ux/abap-deploy-config-inquirer';

// Pre-import real modules before mocking to avoid OOM
const realBtpUtils = await import('@sap-ux/btp-utils');
const realProjectAccess = await import('@sap-ux/project-access');
const realAbapInquirer = await import('@sap-ux/abap-deploy-config-inquirer');

const mockIsAppStudio = jest.fn();
const mockReadUi5Yaml = jest.fn();
const mockGetPrompts = jest.fn();
const mockGetHostEnvironment = jest.fn();

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    readUi5Yaml: mockReadUi5Yaml
}));

jest.unstable_mockModule('@sap-ux/abap-deploy-config-inquirer', () => ({
    ...realAbapInquirer,
    getPrompts: mockGetPrompts
}));

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    getHostEnvironment: mockGetHostEnvironment,
    hostEnvironment: { cli: 'CLI', bas: 'BAS', vscode: 'VSCode' },
    DefaultLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    },
    LogWrapper: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })),
    setYeomanEnvConflicterForce: jest.fn(),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn()
    },
    sendTelemetry: jest.fn(),
    isExtensionInstalled: jest.fn(),
    YUI_EXTENSION_ID: 'SAPOSS.app-studio-toolkit',
    YUI_MIN_VER_FILES_GENERATED_MSG: '1.14.0',
    getDefaultTargetFolder: jest.fn(),
    isCommandRegistered: jest.fn(),
    getPackageScripts: jest.fn(),
    getBootstrapResourceUrls: jest.fn(),
    getFlpId: jest.fn(),
    getSemanticObject: jest.fn(),
    generateAppGenInfo: jest.fn()
}));

const { getAbapQuestions } = await import('../../../src/app/questions');
const { AuthenticationType } = await import('@sap-ux/store');
const { hostEnvironment, DefaultLogger } = await import('@sap-ux/fiori-generator-shared');
const { AdaptationProjectType } = await import('@sap-ux/axios-extension');

describe('Test getAbapQuestions', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('should return questions for destination', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.bas);
        mockIsAppStudio.mockReturnValue(true);
        mockReadUi5Yaml.mockRejectedValueOnce(new Error('No yaml config found'));
        await getAbapQuestions({
            appRootPath: 'mock/path/to/project',
            connectedSystem: {
                destination: {
                    Name: 'mock-destination',
                    Host: 'mock-host'
                } as Destination
            },
            backendConfig: undefined,
            indexGenerationAllowed: true,
            showOverwriteQuestion: false,
            logger: DefaultLogger,
            promptOptions: {
                adpProjectType: AdaptationProjectType.CLOUD_READY,
                ui5AbapRepo: { hideIfOnPremise: false },
                transportInputChoice: { hideIfOnPremise: false },
                packageAutocomplete: {
                    additionalValidation: {
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidatePackageType: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                },
                packageManual: {
                    additionalValidation: {
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidatePackageType: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                }
            } as AbapDeployConfigPromptOptions
        });

        expect(mockGetPrompts).toHaveBeenCalledWith(
            {
                adpProjectType: AdaptationProjectType.CLOUD_READY,
                backendTarget: {
                    abapTarget: {
                        'authenticationType': undefined,
                        client: '',
                        destination: 'mock-destination',
                        scp: undefined,
                        url: undefined
                    },
                    systemName: undefined,
                    serviceProvider: undefined,
                    type: 'application'
                },
                ui5AbapRepo: { default: undefined, hideIfOnPremise: false },
                description: { default: undefined },
                packageManual: {
                    default: undefined,
                    additionalValidation: {
                        shouldValidatePackageType: false,
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                },
                transportManual: { default: undefined },
                index: { indexGenerationAllowed: true },
                packageAutocomplete: {
                    useAutocomplete: true,
                    additionalValidation: {
                        shouldValidatePackageType: false,
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                },
                overwriteAbapConfig: { hide: true },
                transportInputChoice: { hideIfOnPremise: false }
            },
            expect.any(Object),
            true
        );
    });

    test('should return questions for backend system', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        mockIsAppStudio.mockReturnValue(false);
        mockReadUi5Yaml.mockRejectedValueOnce(new Error('No yaml config found'));
        await getAbapQuestions({
            appRootPath: 'mock/path/to/project',
            connectedSystem: {
                backendSystem: {
                    name: 'mock-backend-system',
                    url: 'https://mock-url',
                    client: '100',
                    authenticationType: AuthenticationType.ReentranceTicket,
                    systemType: 'AbapCloud',
                    connectionType: 'abap_catalog'
                }
            },
            backendConfig: undefined,
            configFile: 'ui5-deploy.yaml',
            logger: DefaultLogger,
            promptOptions: {
                ui5AbapRepo: { hideIfOnPremise: false },
                transportInputChoice: { hideIfOnPremise: false },
                packageAutocomplete: {
                    additionalValidation: {
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidatePackageType: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                },
                packageManual: {
                    additionalValidation: {
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidatePackageType: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                }
            } as AbapDeployConfigPromptOptions
        });

        expect(mockGetPrompts).toHaveBeenCalledWith(
            {
                backendTarget: {
                    abapTarget: {
                        url: 'https://mock-url',
                        client: '100',
                        authenticationType: AuthenticationType.ReentranceTicket,
                        scp: false,
                        destination: undefined
                    },
                    systemName: 'mock-backend-system',
                    serviceProvider: undefined,
                    type: 'application'
                },
                ui5AbapRepo: { default: undefined, hideIfOnPremise: false },
                description: { default: undefined },
                packageManual: {
                    default: undefined,
                    additionalValidation: {
                        shouldValidatePackageType: false,
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                },
                transportManual: { default: undefined },
                index: { indexGenerationAllowed: false },
                packageAutocomplete: {
                    useAutocomplete: true,
                    additionalValidation: {
                        shouldValidatePackageType: false,
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                },
                overwriteAbapConfig: { hide: true },
                transportInputChoice: { hideIfOnPremise: false }
            },
            expect.any(Object),
            false
        );
    });
});
