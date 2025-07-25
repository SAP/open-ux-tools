import { type Destination, isAppStudio } from '@sap-ux/btp-utils';
import * as abapInquirer from '@sap-ux/abap-deploy-config-inquirer';
import { getAbapQuestions } from '../../../src/app/questions';
import { readUi5Yaml } from '@sap-ux/project-access';
import type { BackendSystem } from '@sap-ux/store';
import { AuthenticationType } from '@sap-ux/store';
import { DefaultLogger, getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

jest.mock('@sap-ux/btp-utils', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/btp-utils') as {}),
    isAppStudio: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;

jest.mock('@sap-ux/project-access', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as {}),
    readUi5Yaml: jest.fn()
}));
const mockReadUi5Yaml = readUi5Yaml as jest.Mock;

jest.mock('@sap-ux/abap-deploy-config-inquirer', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/abap-deploy-config-inquirer') as {}),
    getPrompts: jest.fn()
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    getHostEnvironment: jest.fn()
}));
const mockGetHostEnvironment = getHostEnvironment as jest.Mock;

describe('Test getAbapQuestions', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('should return questions for destination', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.bas);
        const getPromptsSpy = jest.spyOn(abapInquirer, 'getPrompts');
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
                },
                targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: false } }
            }
        });

        expect(getPromptsSpy).toHaveBeenCalledWith(
            {
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
                overwrite: { hide: true },
                transportInputChoice: { hideIfOnPremise: false },
                targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: false } }
            },
            expect.any(Object),
            true
        );
    });

    test('should return questions for backend system', async () => {
        const getPromptsSpy = jest.spyOn(abapInquirer, 'getPrompts');
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
                    scp: false
                } as BackendSystem
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
                },
                targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: false } }
            }
        });

        expect(getPromptsSpy).toHaveBeenCalledWith(
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
                overwrite: { hide: true },
                transportInputChoice: { hideIfOnPremise: false },
                targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: false } }
            },
            expect.any(Object),
            false
        );
    });
});
