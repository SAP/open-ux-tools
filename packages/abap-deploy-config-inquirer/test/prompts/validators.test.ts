import { AdaptationProjectType } from '@sap-ux/axios-extension';
import { GUIDED_ANSWERS_ICON, HELP_NODES, HELP_TREE } from '@sap-ux/guided-answers-helper';
import { AxiosError } from 'axios';
import { isAppStudio } from '@sap-ux/btp-utils';
import { AuthenticationType } from '../../../store/src';
import { initI18n, t } from '../../src/i18n';
import { PromptState } from '../../src/prompts/prompt-state';
import {
    validateAppDescription,
    validateClient,
    validateClientChoiceQuestion,
    validateConfirmQuestion,
    validateCredentials,
    validateDestinationQuestion,
    validatePackage,
    validatePackageChoiceInput,
    validatePackageChoiceInputForCli,
    validateTargetSystem,
    validateTargetSystemUrlCli,
    validateTransportChoiceInput,
    validateTransportQuestion,
    validateUi5AbapRepoName,
    validateUrl
} from '../../src/prompts/validators';
import * as serviceProviderUtils from '../../src/service-provider-utils';
import { AbapServiceProviderManager } from '../../src/service-provider-utils/abap-service-provider';
import type { AbapSystemChoice } from '../../src/types';
import { ClientChoiceValue, PackageInputChoices, TargetSystemType, TransportChoices } from '../../src/types';
import * as utils from '../../src/utils';
import * as validatorUtils from '../../src/validator-utils';
import { mockDestinations } from '../fixtures/destinations';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn(),
    isS4HC: jest.fn(),
    isAbapEnvironmentOnBtp: jest.fn()
}));

jest.mock('../../src/service-provider-utils', () => ({
    getTransportListFromService: jest.fn(),
    getSystemInfo: jest.fn(),
    isAbapCloud: jest.fn()
}));

jest.mock('../../src/service-provider-utils/abap-service-provider');

const mockIsAppStudio = isAppStudio as jest.Mock;

describe('Test validators', () => {
    const previousAnswers = {
        url: 'https://mock.url.target1.com',
        package: 'ZPACKAGE'
    };

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        // reset propmt state for test isolation
        PromptState.abapDeployConfig = {};
    });

    describe('validateDestinationQuestion', () => {
        it('should return true for valid destination', async () => {
            const result = await validateDestinationQuestion('Dest2', mockDestinations);
            expect(PromptState.abapDeployConfig.destination).toBe('Dest2');
            expect(PromptState.abapDeployConfig.url).toBe('https://mock.url.dest2.com');
            expect(result).toBe(true);
        });

        it('should return false for invalid destination', async () => {
            const result = await validateDestinationQuestion('', mockDestinations);
            expect(PromptState.abapDeployConfig.destination).toBe(undefined);
            expect(PromptState.abapDeployConfig.url).toBe(undefined);
            expect(result).toBe(false);
        });

        it('should return error when selected destination is cloud and the default one is onPrem', async () => {
            jest.spyOn(serviceProviderUtils, 'isAbapCloud').mockResolvedValueOnce(true);
            jest.spyOn(AbapServiceProviderManager, 'getIsDefaultProviderAbapCloud').mockReturnValueOnce(false);
            const result = await validateDestinationQuestion('Dest2', mockDestinations, {
                additionalValidation: { shouldRestrictDifferentSystemType: true }
            });

            expect(result).toBe(t('errors.validators.invalidOnPremSystem'));
        });

        it('should return error when selected destination is onPrem and the default one is cloud', async () => {
            jest.spyOn(serviceProviderUtils, 'isAbapCloud').mockResolvedValueOnce(false);
            jest.spyOn(AbapServiceProviderManager, 'getIsDefaultProviderAbapCloud').mockReturnValueOnce(true);
            const result = await validateDestinationQuestion('Dest2', mockDestinations, {
                additionalValidation: { shouldRestrictDifferentSystemType: true }
            });

            expect(result).toBe(t('errors.validators.invalidCloudSystem'));
        });
    });

    describe('validateTargetSystem', () => {
        const abapSystemChoices: AbapSystemChoice[] = [
            {
                name: 'Target1',
                value: 'https://mock.url.target1.com',
                client: '001',
                isAbapCloud: false,
                scp: false
            },
            {
                name: 'Target2',
                value: 'https://mock.url.target2.com',
                client: '002',
                isAbapCloud: true,
                scp: false
            }
        ];
        it('should return true for valid (or empty) target system', async () => {
            let result = await validateTargetSystem('');
            expect(result).toBe(true);

            result = await validateTargetSystem(TargetSystemType.Url);
            expect(result).toBe(true);

            result = await validateTargetSystem('https://mock.url.target1.com', abapSystemChoices);
            expect(PromptState.abapDeployConfig).toStrictEqual({
                url: 'https://mock.url.target1.com',
                client: '001',
                isAbapCloud: false,
                scp: false,
                targetSystem: 'https://mock.url.target1.com'
            });
            expect(result).toBe(true);
        });

        it('should return false for invalid  target system', async () => {
            const result = await validateTargetSystem('/x/inval.z');
            expect(result).toBe(false);
        });

        it('should return error when selected destination is cloud and the default one is onPrem', async () => {
            jest.spyOn(AbapServiceProviderManager, 'getIsDefaultProviderAbapCloud').mockReturnValueOnce(false);
            const result = await validateTargetSystem('https://mock.url.target2.com', abapSystemChoices, {
                additionalValidation: { shouldRestrictDifferentSystemType: true }
            });

            expect(result).toBe(t('errors.validators.invalidOnPremSystem'));
        });

        it('should return error when selected destination is onPrem and the default one is cloud', async () => {
            jest.spyOn(AbapServiceProviderManager, 'getIsDefaultProviderAbapCloud').mockReturnValueOnce(true);
            const result = await validateTargetSystem('https://mock.url.target1.com', abapSystemChoices, {
                additionalValidation: { shouldRestrictDifferentSystemType: true }
            });
            expect(result).toBe(t('errors.validators.invalidCloudSystem'));
        });
    });

    describe('validateUrl', () => {
        it('should return true for valid URL found in backend', () => {
            jest.spyOn(utils, 'findBackendSystemByUrl').mockReturnValue({
                name: 'Target1',
                url: 'https://mock.url.target1.com',
                client: '001',
                serviceKeys: {},
                authenticationType: AuthenticationType.ReentranceTicket
            });
            const result = validateUrl('https://mock.url.target1.com');
            expect(result).toBe(true);
            expect(PromptState.abapDeployConfig).toStrictEqual({
                url: 'https://mock.url.target1.com',
                client: '001',
                isAbapCloud: true,
                scp: true,
                targetSystem: undefined
            });
        });

        it('should return true for valid URL not found in backend', () => {
            jest.spyOn(utils, 'findBackendSystemByUrl').mockReturnValue(undefined);
            const result = validateUrl('https://mock.notfound.url.target1.com');
            expect(result).toBe(true);
            expect(PromptState.abapDeployConfig).toStrictEqual({
                url: 'https://mock.notfound.url.target1.com',
                isAbapCloud: false,
                scp: false,
                targetSystem: undefined,
                client: undefined
            });
        });

        it('should return false empty URL', () => {
            const result = validateUrl('');
            expect(result).toBe(false);
        });

        it('should return error message for invalid URL', () => {
            const result = validateUrl('/x/inval.z');
            expect(result).toBe(t('errors.invalidUrl', { url: '/x/inval.z' }));
        });
    });

    describe('validateTargetSystemUrlCli', () => {
        it('should resolve when target is valid', () => {
            PromptState.isYUI = false;
            expect(validateTargetSystemUrlCli('https://mock.url.target1.com')).toBeUndefined();
        });

        it('should throw error when target is invalid', () => {
            PromptState.isYUI = true;
            try {
                validateTargetSystemUrlCli('/x/inval.z');
            } catch (e) {
                expect(e).toStrictEqual(new Error(t('errors.invalidUrl', { url: '/x/inval.z' })));
            }
        });
    });

    describe('validateClientChoiceQuestion', () => {
        it('should return true for valid client', () => {
            PromptState.resetAbapDeployConfig();
            // Base
            let result = validateClientChoiceQuestion(ClientChoiceValue.Base, '000');
            expect(PromptState.abapDeployConfig.client).toBe('000');
            expect(result).toBe(true);

            // New
            result = validateClientChoiceQuestion(ClientChoiceValue.New);
            expect(result).toBe(true);

            // Blank
            result = validateClientChoiceQuestion(ClientChoiceValue.Blank);
            expect(result).toBe(true);
        });
    });

    describe('validateClientChoiceQuestion', () => {
        it('should return true for valid client', () => {
            PromptState.resetAbapDeployConfig();
            // Base
            let result = validateClientChoiceQuestion(ClientChoiceValue.Base, '000');
            expect(PromptState.abapDeployConfig.client).toBe('000');
            expect(result).toBe(true);

            // New
            result = validateClientChoiceQuestion(ClientChoiceValue.New);
            expect(result).toBe(true);

            // Blank
            result = validateClientChoiceQuestion(ClientChoiceValue.Blank);
            expect(result).toBe(true);
        });
    });

    describe('validateClient', () => {
        it('should return true for valid client', () => {
            const result = validateClient('123');
            expect(PromptState.abapDeployConfig.client).toBe('123');
            expect(result).toBe(true);
        });

        it('should return error message for invalid client', () => {
            const result = validateClient('00');
            expect(PromptState.abapDeployConfig.client).toBe(undefined);
            expect(result).toBe(t('errors.invalidClient', { client: '00' }));
        });
    });

    describe('validateCredentials', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return error for no credentials', async () => {
            expect(await validateCredentials('', previousAnswers)).toBe(t('errors.requireCredentials'));
        });

        it('should return true for valid credentials', async () => {
            jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
                transportConfig: {} as any,
                transportConfigNeedsCreds: false
            });
            expect(await validateCredentials('pass1', { ...previousAnswers, username: 'user1' })).toBe(true);
        });

        it('should return error message for invalid credentials', async () => {
            jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
                transportConfig: {} as any,
                transportConfigNeedsCreds: true
            });
            expect(await validateCredentials('pass1', { ...previousAnswers, username: 'user1' })).toBe(
                t('errors.incorrectCredentials')
            );
        });

        it('should check system type when shouldCheckSystemType is true and in App Studio', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);

            jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
                transportConfig: {} as any,
                transportConfigNeedsCreds: false
            });
            jest.spyOn(serviceProviderUtils, 'isAbapCloud').mockResolvedValueOnce(true);

            const result = await validateCredentials(
                'pass1',
                { ...previousAnswers, username: 'user1' },
                undefined,
                true
            );

            expect(result).toBe(true);
            expect(mockIsAppStudio).toHaveBeenCalled();
            expect(serviceProviderUtils.isAbapCloud).toHaveBeenCalled();
            expect(PromptState.abapDeployConfig.isAbapCloud).toBe(true);
        });

        it('should not check system type when shouldCheckSystemType is false', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);

            jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
                transportConfig: {} as any,
                transportConfigNeedsCreds: false
            });

            const result = await validateCredentials(
                'pass1',
                { ...previousAnswers, username: 'user1' },
                undefined,
                false
            );

            expect(result).toBe(true);
            expect(mockIsAppStudio).toHaveBeenCalled();
            // isAbapCloud should not be called because shouldCheckSystemType is false
            expect(serviceProviderUtils.isAbapCloud).not.toHaveBeenCalled();
        });

        it('should not check system type when not in App Studio even if shouldCheckSystemType is true', async () => {
            mockIsAppStudio.mockReturnValueOnce(false);

            jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
                transportConfig: {} as any,
                transportConfigNeedsCreds: false
            });

            const result = await validateCredentials(
                'pass1',
                { ...previousAnswers, username: 'user1' },
                undefined,
                true
            );

            expect(result).toBe(true);
            expect(mockIsAppStudio).toHaveBeenCalled();
            // isAbapCloud should not be called because isAppStudio() returns false
            expect(serviceProviderUtils.isAbapCloud).not.toHaveBeenCalled();
        });
    });

    describe('validateUi5AbapRepoName', () => {
        beforeEach(() => {
            PromptState.resetTransportAnswers();
        });

        it('should return error message when there is a transportConfigError', () => {
            const configError = 'Transport config error';
            PromptState.transportAnswers.transportConfigError = configError;
            const result = validateUi5AbapRepoName('ZUI5_REPOSITORY');
            expect(result).toBe(
                t('errors.targetNotDeployable', {
                    systemError: configError
                })
            );
        });

        it('should return true for valid UI5 ABAP repo name', () => {
            const result = validateUi5AbapRepoName('ZUI5REPOSITORY');
            expect(result).toBe(true);
        });

        it('should return error for valid UI5 ABAP repo name', () => {
            const result = validateUi5AbapRepoName('Z?()OSITORY');
            expect(result).toBe(t('errors.validators.forbiddenCharacters'));
        });
    });

    describe('validateAppDescription', () => {
        it('should return true for valid app description', () => {
            const result = validateAppDescription('My App Description');
            expect(result).toBe(true);
        });

        it('should return error for invalid app description', () => {
            const result = validateAppDescription('a'.repeat(61));
            expect(result).toBe(t('errors.validators.descriptionLength'));
        });
    });

    describe('validatePackageChoiceInput', () => {
        it('should return true for valid package choice input (EnterManualChoice)', async () => {
            const result = await validatePackageChoiceInput(PackageInputChoices.EnterManualChoice, {});
            expect(result).toBe(true);
        });

        it('should return true when list packages is selected and querying packages is succesful', async () => {
            jest.spyOn(utils, 'queryPackages').mockResolvedValueOnce(['ZPACKAGE1', 'ZPACKAGE2']);
            const result = await validatePackageChoiceInput(PackageInputChoices.ListExistingChoice, {});
            expect(result).toBe(true);
        });

        it('should return error when list packages is selected and querying packages fails', async () => {
            jest.spyOn(utils, 'queryPackages').mockResolvedValueOnce([]);
            const result = await validatePackageChoiceInput(PackageInputChoices.ListExistingChoice, {});
            expect(result).toBe(t('warnings.packageNotFound'));
        });

        it('should return a GA link when list packages is selected and querying packages fails due to cert error', async () => {
            jest.spyOn(utils, 'queryPackages').mockRejectedValueOnce(
                new AxiosError('Expired certificate', 'CERT_HAS_EXPIRED')
            );
            const result = await validatePackageChoiceInput(PackageInputChoices.ListExistingChoice, {});
            expect(result).toEqual({
                link: {
                    icon: GUIDED_ANSWERS_ICON,
                    text: 'Need help with this error?',
                    url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.CERTIFICATE_ERROR}`
                },
                message: 'The system URL is using an expired security certificate.'
            });
        });
    });

    describe('validatePackageChoiceInputForCli', () => {
        it('should throw error for invalid package choice input', async () => {
            jest.spyOn(utils, 'queryPackages').mockResolvedValueOnce([]);
            try {
                await validatePackageChoiceInputForCli({}, PackageInputChoices.ListExistingChoice);
            } catch (e) {
                expect(e).toStrictEqual(new Error(t('warnings.packageNotFound')));
            }
        });
    });

    describe('validatePackage', () => {
        beforeEach(() => {
            PromptState.resetTransportAnswers();
            jest.resetAllMocks();
        });

        it('should return true for default onPremise package', async () => {
            const result = await validatePackage('$TMP', previousAnswers);
            expect(result).toBe(true);
        });

        it('should return true for onPremise system', async () => {
            PromptState.abapDeployConfig.isAbapCloud = false;
            const getSystemInfoSpy = jest.spyOn(serviceProviderUtils, 'getSystemInfo');
            const result = await validatePackage('ZPACKAGE', previousAnswers, {
                additionalValidation: { shouldValidatePackageType: true }
            });
            expect(getSystemInfoSpy).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return error empty package', async () => {
            const result = await validatePackage(' ', previousAnswers, {
                additionalValidation: { shouldValidatePackageType: true }
            });
            expect(result).toBe(t('warnings.providePackage'));
        });

        it('should return error for special characters', async () => {
            const result = await validatePackage('@TMP', previousAnswers, {
                additionalValidation: { shouldValidateFormatAndSpecialCharacters: true }
            });
            expect(result).toBe(t('errors.validators.charactersForbiddenInPackage'));
        });

        it('should return error for invalid format', async () => {
            const result = await validatePackage('namespace/packageName', previousAnswers, {
                additionalValidation: { shouldValidateFormatAndSpecialCharacters: true }
            });
            expect(result).toBe(t('errors.validators.abapPackageInvalidFormat'));
        });

        it('should return error for invalid starting prefix', async () => {
            PromptState.abapDeployConfig.isAbapCloud = false;
            PromptState.abapDeployConfig.scp = true;
            const result = await validatePackage(
                'namespace',
                {
                    ...previousAnswers,
                    ui5AbapRepo: 'UI5REPO'
                },
                {
                    additionalValidation: { shouldValidatePackageForStartingPrefix: true }
                },
                {
                    hideIfOnPremise: true
                }
            );
            expect(result).toBe(t('errors.validators.abapPackageStartingPrefix'));
        });

        it('should return error for invalid ui5Repo starting prefix', async () => {
            PromptState.abapDeployConfig.isAbapCloud = true;
            PromptState.abapDeployConfig.scp = false;
            const result = await validatePackage(
                'ZPACKAGE',
                {
                    ...previousAnswers,
                    ui5AbapRepo: 'UI5REPO'
                },
                {
                    additionalValidation: { shouldValidatePackageForStartingPrefix: true }
                },
                {
                    hideIfOnPremise: true
                }
            );
            expect(result).toBe(t('errors.validators.abapInvalidAppNameNamespaceOrStartingPrefix'));
        });

        it('should return error for invalid ui5Repo starting prefix package starting with namespace', async () => {
            PromptState.abapDeployConfig.isAbapCloud = true;
            PromptState.abapDeployConfig.scp = false;
            const result = await validatePackage(
                '/NAMESPACE/ZPACKAGE',
                {
                    ...previousAnswers,
                    ui5AbapRepo: 'UI5REPO'
                },
                {
                    additionalValidation: { shouldValidatePackageForStartingPrefix: true }
                },
                {
                    hideIfOnPremise: false
                }
            );
            expect(result).toBe(t('errors.validators.abapInvalidAppNameNamespaceOrStartingPrefix'));
        });

        it('should return error when package is not cloud', async () => {
            jest.spyOn(serviceProviderUtils, 'getSystemInfo').mockResolvedValueOnce({
                apiExist: true,
                systemInfo: {
                    adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE],
                    activeLanguages: []
                }
            });
            PromptState.abapDeployConfig.isAbapCloud = true;
            const result = await validatePackage('ZPACKAGE', previousAnswers, {
                additionalValidation: { shouldValidatePackageType: true }
            });
            expect(result).toBe(t('errors.validators.invalidCloudPackage'));
        });

        it('should return true when package meets all validators', async () => {
            jest.spyOn(serviceProviderUtils, 'getSystemInfo').mockResolvedValueOnce({
                apiExist: true,
                systemInfo: {
                    adaptationProjectTypes: [AdaptationProjectType.CLOUD_READY],
                    activeLanguages: []
                }
            });
            const result = await validatePackage('ZPACKAGE', previousAnswers, {
                additionalValidation: { shouldValidatePackageType: true }
            });
            expect(result).toBe(true);
        });

        it('should return true when there are more than one project type for a package', async () => {
            jest.spyOn(serviceProviderUtils, 'getSystemInfo').mockResolvedValueOnce({
                apiExist: true,
                systemInfo: {
                    adaptationProjectTypes: [AdaptationProjectType.CLOUD_READY, AdaptationProjectType.ON_PREMISE],
                    activeLanguages: []
                }
            });
            const result = await validatePackage('ZPACKAGE', previousAnswers, {
                additionalValidation: { shouldValidatePackageType: true }
            });
            expect(result).toBe(true);
        });

        it('should return true when package base validation passes and there are no additional validation', async () => {
            const result = await validatePackage('ZPACKAGE', previousAnswers);
            expect(result).toBe(true);
        });

        it('should return true when package base validation passes get systemInfo API is missing in the target system', async () => {
            jest.spyOn(serviceProviderUtils, 'getSystemInfo').mockResolvedValueOnce({
                apiExist: false
            });
            const result = await validatePackage('ZPACKAGE', previousAnswers, {
                additionalValidation: { shouldValidatePackageType: true }
            });
            expect(result).toBe(true);
        });

        it('should run getTransportListFromService when package prompts are ran standalone', async () => {
            const getTransportListFromServiceSpy = jest.spyOn(serviceProviderUtils, 'getTransportListFromService');
            const result = await validatePackage('ZPACKAGE', previousAnswers, {}, {}, undefined, true);
            expect(result).toBe(true);
            expect(getTransportListFromServiceSpy).toHaveBeenCalledTimes(1);
        });

        it('should run getTransportListFromService when the system is on-prem', async () => {
            PromptState.abapDeployConfig.scp = false;
            const getTransportListFromServiceSpy = jest.spyOn(serviceProviderUtils, 'getTransportListFromService');
            const result = await validatePackage('ZPACKAGE', previousAnswers);
            expect(result).toBe(true);
            expect(getTransportListFromServiceSpy).toHaveBeenCalledTimes(1);
        });

        it('should run getTransportListFromService when the cloud system is connected', async () => {
            PromptState.abapDeployConfig.scp = true;
            jest.spyOn(AbapServiceProviderManager, 'isConnected').mockReturnValue(true);
            const getTransportListFromServiceSpy = jest.spyOn(serviceProviderUtils, 'getTransportListFromService');
            const result = await validatePackage('ZPACKAGE', previousAnswers);
            expect(result).toBe(true);
            expect(getTransportListFromServiceSpy).toHaveBeenCalledTimes(1);
        });

        it('should not run getTransportListFromService when the cloud system is not connected', async () => {
            PromptState.abapDeployConfig.scp = true;
            jest.spyOn(AbapServiceProviderManager, 'isConnected').mockReturnValue(false);
            const getTransportListFromServiceSpy = jest.spyOn(serviceProviderUtils, 'getTransportListFromService');
            const result = await validatePackage('ZPACKAGE', previousAnswers);
            expect(result).toBe(true);
            expect(getTransportListFromServiceSpy).not.toHaveBeenCalled();
        });
    });

    describe('validateTransportChoiceInput', () => {
        beforeEach(() => {
            PromptState.resetTransportAnswers();
        });

        it('should return error for invalid package / ui5 abap repo name', async () => {
            let result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.ListExistingChoice,
                previousAnswers
            });
            expect(result).toBe(t('errors.validators.transportListPreReqs'));

            result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.ListExistingChoice,
                previousAnswers: {
                    ...previousAnswers,
                    packageManual: 'ZPACKAGE'
                }
            });
            expect(result).toBe(t('errors.validators.transportListPreReqs'));
        });

        it('should return true for listing transport when transport request found for given config', async () => {
            jest.spyOn(validatorUtils, 'getTransportList').mockResolvedValueOnce([
                { transportReqNumber: 'K123456', transportReqDescription: 'Mock transport request' }
            ]);
            const result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.ListExistingChoice,
                previousAnswers: {
                    ...previousAnswers,
                    packageManual: 'ZPACKAGE',
                    ui5AbapRepo: 'ZUI5REPO'
                }
            });

            expect(result).toBe(true);
        });

        it('should return errors messages for listing transport when transport request empty or undefined', async () => {
            jest.spyOn(validatorUtils, 'getTransportList').mockResolvedValueOnce([]);

            let result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.ListExistingChoice,
                previousAnswers: {
                    ...previousAnswers,
                    packageManual: 'ZPACKAGE',
                    ui5AbapRepo: 'ZUI5REPO'
                }
            });
            expect(result).toBe(t('warnings.noTransportReqs'));

            jest.spyOn(validatorUtils, 'getTransportList').mockResolvedValueOnce(undefined);
            result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.ListExistingChoice,
                previousAnswers: {
                    ...previousAnswers,
                    packageManual: 'ZPACKAGE',
                    ui5AbapRepo: 'ZUI5REPO'
                }
            });
            expect(result).toBe(t('warnings.noExistingTransportReqList'));
        });

        it('should return true if transport request is same as previous', async () => {
            const result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.CreateNewChoice,
                previousAnswers,
                validateInputChanged: true,
                prevTransportInputChoice: TransportChoices.CreateNewChoice
            });
            expect(result).toBe(true);
        });

        it('should return true if previous choice is undefined', async () => {
            jest.spyOn(validatorUtils, 'getTransportList').mockResolvedValueOnce([
                { transportReqNumber: 'K123456', transportReqDescription: 'Mock transport request' }
            ]);

            const result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.CreateNewChoice,
                previousAnswers,
                validateInputChanged: true
            });
            expect(PromptState.transportAnswers.newTransportNumber).toBe('K123456');
            expect(result).toBe(true);
        });

        it('should return true if creating a new transport request is successful', async () => {
            const createTransportNumberSpy = jest
                .spyOn(validatorUtils, 'createTransportNumber')
                .mockResolvedValueOnce('TR1234');

            const result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.CreateNewChoice,
                previousAnswers: {
                    ...previousAnswers,
                    packageManual: 'ZPACKAGE',
                    ui5AbapRepo: 'ZUI5REPO'
                },
                validateInputChanged: false,
                transportDescription: 'Mock description for new TR'
            });
            expect(PromptState.transportAnswers.newTransportNumber).toBe('TR1234');
            expect(createTransportNumberSpy.mock.calls[0][0]).toStrictEqual({
                packageName: 'ZPACKAGE',
                ui5AppName: 'ZUI5REPO',
                description: 'Mock description for new TR'
            });
            expect(result).toBe(true);
        });

        it('should return error if creating a new transport request returns undefined', async () => {
            jest.spyOn(validatorUtils, 'createTransportNumber').mockResolvedValueOnce(undefined);

            const result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.CreateNewChoice,
                previousAnswers,
                validateInputChanged: false
            });
            expect(PromptState.transportAnswers.newTransportNumber).toBe(undefined);
            expect(result).toBe(t('errors.createTransportReqFailed'));
        });

        it('should return error if creating a new transport request returns undefined', async () => {
            const result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.EnterManualChoice,
                previousAnswers,
                validateInputChanged: false
            });
            expect(result).toBe(true);
        });

        it('should handle cert error when listing transports', async () => {
            jest.spyOn(validatorUtils, 'getTransportList').mockRejectedValueOnce(
                new AxiosError('Unable to verify signature in chain', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE')
            );

            const result = await validateTransportChoiceInput({
                useStandalone: false,
                input: TransportChoices.ListExistingChoice,
                previousAnswers: {
                    ...previousAnswers,
                    packageManual: 'ZPACKAGE',
                    ui5AbapRepo: 'ZUI5REPO'
                }
            });
            expect(result).toEqual({
                link: {
                    icon: GUIDED_ANSWERS_ICON,
                    text: 'Need help with this error?',
                    url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.CERTIFICATE_ERROR}`
                },
                message: 'The system URL is using an unknown or invalid security certificate.'
            });
        });
    });

    describe('validateTransportQuestion', () => {
        it('should return true for valid transport', async () => {
            PromptState.transportAnswers.transportRequired = true;
            const result = validateTransportQuestion('TR1234');
            expect(result).toBe(true);
        });

        it('should return true for valid transport', async () => {
            PromptState.transportAnswers.transportRequired = true;
            const result = validateTransportQuestion('');
            expect(result).toBe(t('prompts.config.transport.common.provideTransportRequest'));
        });

        it('should return true when transport is not required', async () => {
            PromptState.transportAnswers.transportRequired = false;
            const result = validateTransportQuestion();
            expect(result).toBe(true);
        });
    });

    describe('validateConfirmQuestion', () => {
        beforeEach(() => {
            PromptState.resetAbapDeployConfig();
        });
        it('should update abort in state to be false', () => {
            validateConfirmQuestion(true);
            expect(PromptState.abapDeployConfig.abort).toBeFalsy();
        });
        it('should update abort in state to be true', () => {
            validateConfirmQuestion(false);
            expect(PromptState.abapDeployConfig.abort).toBeTruthy();
        });
    });
});
