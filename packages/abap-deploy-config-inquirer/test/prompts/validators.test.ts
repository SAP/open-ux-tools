import { PromptState } from '../../src/prompts/prompt-state';
import { AuthenticationType } from '../../../store/src';
import { initI18n, t } from '../../src/i18n';
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
import * as validatorUtils from '../../src/validator-utils';
import { ClientChoiceValue, PackageInputChoices, TargetSystemType, TransportChoices } from '../../src/types';
import * as utils from '../../src/utils';
import { mockDestinations } from '../fixtures/destinations';
import * as serviceProviderUtils from '../../src/service-provider-utils';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

jest.mock('../../src/service-provider-utils', () => ({
    getTransportListFromService: jest.fn(),
    getSystemInfo: jest.fn()
}));

describe('Test validators', () => {
    const previousAnswers = {
        url: 'https://mock.url.target1.com',
        package: 'ZPACKAGE'
    };

    beforeAll(async () => {
        await initI18n();
    });
    describe('validateDestinationQuestion', () => {
        it('should return true for valid destination', async () => {
            const result = validateDestinationQuestion('Dest2', mockDestinations);
            expect(PromptState.abapDeployConfig.destination).toBe('Dest2');
            expect(PromptState.abapDeployConfig.url).toBe('https://mock.url.dest2.com');
            expect(result).toBe(true);
        });

        it('should return false for invalid destination', async () => {
            const result = validateDestinationQuestion('', mockDestinations);
            expect(PromptState.abapDeployConfig.destination).toBe(undefined);
            expect(PromptState.abapDeployConfig.url).toBe(undefined);
            expect(result).toBe(false);
        });
    });

    describe('validateTargetSystem', () => {
        const abapSystemChoices = [
            {
                name: 'Target1',
                value: 'https://mock.url.target1.com',
                client: '001',
                isS4HC: false,
                scp: false
            },
            {
                name: 'Target2',
                value: 'https://mock.url.target2.com',
                client: '002',
                isS4HC: true,
                scp: false
            }
        ];
        it('should return true for valid (or empty) target system', async () => {
            let result = validateTargetSystem('');
            expect(result).toBe(true);

            result = validateTargetSystem(TargetSystemType.Url);
            expect(result).toBe(true);

            result = validateTargetSystem('https://mock.url.target1.com', abapSystemChoices);
            expect(PromptState.abapDeployConfig).toStrictEqual({
                url: 'https://mock.url.target1.com',
                client: '001',
                destination: undefined,
                isS4HC: false,
                scp: false,
                targetSystem: 'https://mock.url.target1.com'
            });
            expect(result).toBe(true);
        });

        it('should return false for invalid  target system', async () => {
            let result = validateTargetSystem('/x/inval.z');
            expect(result).toBe(false);
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
            let result = validateUrl('https://mock.url.target1.com');
            expect(result).toBe(true);
            expect(PromptState.abapDeployConfig).toStrictEqual({
                url: 'https://mock.url.target1.com',
                client: '001',
                destination: undefined,
                isS4HC: true,
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
                client: undefined,
                destination: undefined,
                isS4HC: false,
                scp: false,
                targetSystem: undefined
            });
        });

        it('should return false empty URL', () => {
            let result = validateUrl('');
            expect(result).toBe(false);
        });

        it('should return error message for invalid URL', () => {
            let result = validateUrl('/x/inval.z');
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
            let result = validateClient('123');
            expect(PromptState.abapDeployConfig.client).toBe('123');
            expect(result).toBe(true);
        });

        it('should return error message for invalid client', () => {
            let result = validateClient('00');
            expect(PromptState.abapDeployConfig.client).toBe(undefined);
            expect(result).toBe(t('errors.invalidClient', { client: '00' }));
        });
    });

    describe('validateCredentials', () => {
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
    });

    describe('validateUi5AbapRepoName', () => {
        beforeEach(() => {
            PromptState.resetTransportAnswers();
        });

        it('should return error message when there is a transportConfigError', () => {
            const configError = 'Transport config error';
            PromptState.transportAnswers.transportConfigError = configError;
            let result = validateUi5AbapRepoName('ZUI5_REPOSITORY');
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
            expect(result).toBe('Only alphanumeric, underscore and slash characters are allowed');
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
        it('should return error for invalid package input', async () => {
            const getTransportListFromServiceSpy = jest.spyOn(serviceProviderUtils, 'getTransportListFromService');

            const result = await validatePackage('Zpackage', {
                ...previousAnswers,
                ui5AbapRepo: 'ZUI5REPO'
            });
            expect(result).toBe(true);
            expect(getTransportListFromServiceSpy).toBeCalledWith('ZPACKAGE', 'ZUI5REPO', {}, undefined);
        });
        it('should return error for invalid package input', async () => {
            const result = await validatePackage(' ', previousAnswers);
            expect(result).toBe(t('warnings.providePackage'));
        });

        it('should return true for default package', async () => {
            const result = await validatePackage('$TMP', previousAnswers);
            expect(result).toBe(true);
            expect(PromptState.transportAnswers.transportRequired).toBe(false);
        });

        it('should return error for special characters', async () => {
            const result = await validatePackage('@TMP', previousAnswers);
            expect(result).toBe(t('errors.validators.charactersForbiddenInPackage'));
        });

        it('should return error for invalid format', async () => {
            const result = await validatePackage('namespace/packageName', previousAnswers);
            expect(result).toBe(t('error.validators.abapPackageInvalidFormat'));
        });

        it('should return error for invalid starting prefix', async () => {
            const result = await validatePackage('namespace', previousAnswers);
            expect(result).toBe(t('error.validators.abapPackageStartingPrefix'));
        });
    });

    describe('validateTransportChoiceInput', () => {
        beforeEach(() => {
            PromptState.resetTransportAnswers();
        });

        it('should return error for invalid package / ui5 abap repo name', async () => {
            let result = await validateTransportChoiceInput(TransportChoices.ListExistingChoice, previousAnswers);
            expect(result).toBe(t('errors.validators.transportListPreReqs'));

            result = await validateTransportChoiceInput(TransportChoices.ListExistingChoice, {
                ...previousAnswers,
                packageManual: 'ZPACKAGE'
            });
            expect(result).toBe(t('errors.validators.transportListPreReqs'));
        });

        it('should return true for listing transport when transport request found for given config', async () => {
            jest.spyOn(validatorUtils, 'getTransportList').mockResolvedValueOnce([
                { transportReqNumber: 'K123456', transportReqDescription: 'Mock transport request' }
            ]);
            const result = await validateTransportChoiceInput(TransportChoices.ListExistingChoice, {
                ...previousAnswers,
                packageManual: 'ZPACKAGE',
                ui5AbapRepo: 'ZUI5REPO'
            });
            expect(result).toBe(true);
        });

        it('should return errors messages for listing transport when transport request empty or undefined', async () => {
            jest.spyOn(validatorUtils, 'getTransportList').mockResolvedValueOnce([]);

            let result = await validateTransportChoiceInput(TransportChoices.ListExistingChoice, {
                ...previousAnswers,
                packageManual: 'ZPACKAGE',
                ui5AbapRepo: 'ZUI5REPO'
            });
            expect(result).toBe(t('warnings.noTransportReqs'));

            jest.spyOn(validatorUtils, 'getTransportList').mockResolvedValueOnce(undefined);
            result = await validateTransportChoiceInput(TransportChoices.ListExistingChoice, {
                ...previousAnswers,
                packageManual: 'ZPACKAGE',
                ui5AbapRepo: 'ZUI5REPO'
            });
            expect(result).toBe(t('warnings.noExistingTransportReqList'));
        });

        it('should return true if transport request is same as previous', async () => {
            const result = await validateTransportChoiceInput(
                TransportChoices.CreateNewChoice,
                previousAnswers,
                true,
                TransportChoices.CreateNewChoice
            );
            expect(result).toBe(true);
        });

        it('should return true if previous choice is undefined', async () => {
            jest.spyOn(validatorUtils, 'getTransportList').mockResolvedValueOnce([
                { transportReqNumber: 'K123456', transportReqDescription: 'Mock transport request' }
            ]);

            const result = await validateTransportChoiceInput(
                TransportChoices.CreateNewChoice,
                previousAnswers,
                true,
                undefined
            );
            expect(PromptState.transportAnswers.newTransportNumber).toBe('K123456');
            expect(result).toBe(true);
        });

        it('should return true if creating a new transport request is successful', async () => {
            jest.spyOn(validatorUtils, 'createTransportNumber').mockResolvedValueOnce('TR1234');

            const result = await validateTransportChoiceInput(
                TransportChoices.CreateNewChoice,
                previousAnswers,
                false,
                undefined
            );
            expect(PromptState.transportAnswers.newTransportNumber).toBe('TR1234');
            expect(result).toBe(true);
        });

        it('should return error if creating a new transport request returns undefined', async () => {
            jest.spyOn(validatorUtils, 'createTransportNumber').mockResolvedValueOnce(undefined);

            const result = await validateTransportChoiceInput(
                TransportChoices.CreateNewChoice,
                previousAnswers,
                false,
                undefined
            );
            expect(PromptState.transportAnswers.newTransportNumber).toBe(undefined);
            expect(result).toBe(t('errors.createTransportReqFailed'));
        });

        it('should return error if creating a new transport request returns undefined', async () => {
            const result = await validateTransportChoiceInput(
                TransportChoices.EnterManualChoice,
                previousAnswers,
                false,
                undefined
            );
            expect(result).toBe(true);
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
