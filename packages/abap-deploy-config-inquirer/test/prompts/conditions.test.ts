import { isAppStudio } from '@sap-ux/btp-utils';
import {
    ClientChoiceValue,
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type TransportConfig
} from '../../src/types';
import {
    defaultOrShowManualPackageQuestion,
    defaultOrShowManualTransportQuestion,
    defaultOrShowSearchPackageQuestion,
    defaultOrShowTransportCreatedQuestion,
    defaultOrShowTransportListQuestion,
    showClientChoiceQuestion,
    showClientQuestion,
    showIndexQuestion,
    showPackageInputChoiceQuestion,
    showPasswordQuestion,
    showScpQuestion,
    showTransportInputChoice,
    showUi5AppDeployConfigQuestion,
    showUrlQuestion,
    showUsernameQuestion
} from '../../src/prompts/conditions';
import * as utils from '../../src/utils';
import { PromptState } from '../../src/prompts/prompt-state';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;

describe('Test abap deploy config inquirer conditions', () => {
    beforeEach(() => {
        PromptState.resetAbapDeployConfig();
        PromptState.resetTransportAnswers();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test('should show url prompt', () => {
        expect(showUrlQuestion('Url')).toBe(true);
    });

    test('should not show scp question', async () => {
        // 1 target not chosen
        expect(showScpQuestion({ url: '', package: '' })).toBe(false);
        // 2 url target chosen but no url provided
        expect(showScpQuestion({ targetSystem: 'Url', url: '', package: '' })).toBe(false);

        // 3 scp value has been retrieved from existing system
        jest.spyOn(utils, 'findBackendSystemByUrl').mockReturnValue({
            name: 'Target system 1',
            url: 'http://saved.target.url',
            client: '100'
        });
        expect(showScpQuestion({ url: 'http://saved.target.url', package: '' })).toBe(false);
    });

    test('should show scp question', async () => {
        jest.spyOn(utils, 'findBackendSystemByUrl').mockReturnValue(undefined);
        expect(showScpQuestion({ targetSystem: 'Url', url: 'http://new.target.url', package: '' })).toBe(true);
    });

    test('should show client choice question', () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        PromptState.isYUI = false;
        PromptState.abapDeployConfig.isAbapCloud = false;
        expect(
            showClientChoiceQuestion({ scp: false, targetSystem: TargetSystemType.Url, url: '', package: '' }, '100')
        ).toBe(true);
        PromptState.resetAbapDeployConfig();
        // Should not show client choice question if SCP is enabled
        PromptState.abapDeployConfig.isAbapCloud = false;
        PromptState.abapDeployConfig.scp = true;
        expect(
            showClientChoiceQuestion({ scp: false, targetSystem: TargetSystemType.Url, url: '', package: '' }, '100')
        ).toBe(false);
        PromptState.resetAbapDeployConfig();
        // Should not show client choice question if target system is not a URL
        PromptState.abapDeployConfig.isAbapCloud = false;
        PromptState.abapDeployConfig.scp = true;
        expect(showClientChoiceQuestion({ scp: true, url: '', package: '' }, '100')).toBe(false);
        PromptState.resetAbapDeployConfig();
    });

    test('should not show client choice question', () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        PromptState.isYUI = false;
        PromptState.abapDeployConfig.isAbapCloud = true;
        expect(
            showClientChoiceQuestion({ scp: true, targetSystem: TargetSystemType.Url, url: '', package: '' }, undefined)
        ).toBe(false);
        PromptState.resetAbapDeployConfig();
    });

    it.each([
        { isYui: true, scpEnabled: false, scpDisabled: true, clientChoice: undefined },
        {
            isYui: false,
            scpEnabled: false,
            scpDisabled: true,
            clientChoice: ClientChoiceValue.New
        },
        { isYui: false, scpEnabled: false, scpDisabled: true, clientChoice: undefined }
    ])(
        'Validate showClientQuestion for different environments isYui: $isYui, clientChoice: $clientChoice',
        ({ isYui, scpEnabled, scpDisabled, clientChoice }) => {
            PromptState.resetAbapDeployConfig();
            PromptState.isYUI = isYui;
            mockIsAppStudio.mockReturnValueOnce(false);
            // Validate client question if SCP is enabled
            PromptState.abapDeployConfig.isAbapCloud = false;
            expect(showClientQuestion({ scp: true, targetSystem: TargetSystemType.Url, url: '', package: '' })).toBe(
                scpEnabled
            );
            PromptState.resetAbapDeployConfig();
            // Validate client question if SCP is disabled
            PromptState.abapDeployConfig.client = '100';
            PromptState.abapDeployConfig.isAbapCloud = false;
            expect(
                showClientQuestion({
                    scp: false,
                    clientChoice,
                    targetSystem: TargetSystemType.Url,
                    url: '',
                    package: ''
                })
            ).toBe(scpDisabled);
            // Should always be shown if target system is not SCP and is URL for both CLI and YUI
            expect(
                showClientQuestion({
                    scp: false,
                    clientChoice: ClientChoiceValue.Blank,
                    targetSystem: TargetSystemType.Url,
                    url: '',
                    package: ''
                })
            ).toBe(true);
            PromptState.resetAbapDeployConfig();
        }
    );

    test('should show client question (CLI)', () => {
        PromptState.isYUI = false;
        mockIsAppStudio.mockReturnValue(false);
        expect(
            showClientQuestion({
                clientChoice: ClientChoiceValue.New,
                targetSystem: TargetSystemType.Url,
                url: '',
                package: ''
            })
        ).toBe(true);
    });

    test('should show username question', async () => {
        jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
            transportConfig: {} as any,
            transportConfigNeedsCreds: true
        });
        expect(await showUsernameQuestion(undefined)).toBe(true);
    });

    test('should not show username question', async () => {
        jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
            transportConfig: {} as any,
            transportConfigNeedsCreds: false
        });
        expect(await showUsernameQuestion(undefined)).toBe(false);
    });

    test('should show password questions', () => {
        PromptState.transportAnswers.transportConfigNeedsCreds = true;
        expect(showPasswordQuestion()).toBe(true);
    });

    test('should show ui5 app deploy config questions', () => {
        PromptState.transportAnswers.transportConfigNeedsCreds = false;
        expect(showUi5AppDeployConfigQuestion()).toBe(true);
    });

    test('should not show ui5 app deploy config questions', () => {
        const promptOptions = {
            hideIfOnPremise: true
        };
        PromptState.abapDeployConfig.scp = false;
        expect(showUi5AppDeployConfigQuestion(promptOptions)).toBe(false);
        PromptState.abapDeployConfig.isAbapCloud = false;
        expect(showUi5AppDeployConfigQuestion(promptOptions)).toBe(false);
    });

    test('should show package input choice question', () => {
        // cli
        PromptState.isYUI = false;
        expect(showPackageInputChoiceQuestion(true)).toBe(true);
        expect(showPackageInputChoiceQuestion()).toBe(false);
        // YUI
        PromptState.isYUI = true;
        expect(showPackageInputChoiceQuestion(true)).toBe(true);
    });

    test('should not show package input choice question', () => {
        PromptState.isYUI = true;
        PromptState.transportAnswers.transportConfig = {
            getPackage: () => 'ZPACKAGE1'
        } as unknown as TransportConfig;
        expect(showPackageInputChoiceQuestion(true)).toBe(false);
        expect(PromptState.abapDeployConfig.package).toBe('ZPACKAGE1');
    });

    test('should show manual package question', () => {
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.EnterManualChoice)).toBe(false);
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.EnterManualChoice, false)).toBe(false);
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.EnterManualChoice, true)).toBe(true);
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.ListExistingChoice, true)).toBe(false);
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.ListExistingChoice)).toBe(false);
    });

    test('should show search package autocomplete question', () => {
        expect(defaultOrShowSearchPackageQuestion(PackageInputChoices.ListExistingChoice)).toBe(false);
        expect(defaultOrShowSearchPackageQuestion(PackageInputChoices.ListExistingChoice)).toBe(false);
        expect(defaultOrShowSearchPackageQuestion(PackageInputChoices.ListExistingChoice, true)).toBe(true);
        expect(defaultOrShowSearchPackageQuestion(PackageInputChoices.ListExistingChoice, true)).toBe(true);
        expect(defaultOrShowSearchPackageQuestion(PackageInputChoices.EnterManualChoice, true)).toBe(false);
    });

    test('should show transport input choice question', () => {
        PromptState.transportAnswers.transportConfigError = undefined;
        PromptState.transportAnswers.transportConfigNeedsCreds = false;
        expect(showTransportInputChoice()).toBe(true);
    });

    test('should not show transport input choice question for onPremise systems', () => {
        PromptState.transportAnswers.transportRequired = false;
        PromptState.abapDeployConfig.isAbapCloud = false;
        PromptState.abapDeployConfig.scp = false;
        expect(showTransportInputChoice({ hideIfOnPremise: true })).toBe(false);
    });

    test('should not show transport input choice question when transport is not required', () => {
        PromptState.transportAnswers.transportRequired = false;
        expect(showTransportInputChoice()).toBe(false);
    });

    test('should not show transport input choice question', () => {
        PromptState.transportAnswers.transportConfigError = undefined;
        PromptState.transportAnswers.transportConfigNeedsCreds = true;
        expect(showTransportInputChoice()).toBe(false);

        PromptState.transportAnswers.transportConfig = {
            getDefaultTransport: jest.fn().mockReturnValue('K123456')
        } as unknown as TransportConfig;

        expect(showTransportInputChoice()).toBe(false);
    });

    test('should show transport list question', () => {
        PromptState.transportAnswers.transportList = [
            { transportReqNumber: 'K123456', transportReqDescription: 'Mock transport' }
        ];
        expect(defaultOrShowTransportListQuestion(TransportChoices.ListExistingChoice)).toBe(true);
    });

    test('should not show transport list question', () => {
        PromptState.abapDeployConfig.isAbapCloud = false;
        PromptState.transportAnswers.transportList = [
            { transportReqNumber: 'K123456', transportReqDescription: 'Mock transport' }
        ];
        expect(defaultOrShowTransportListQuestion(TransportChoices.ListExistingChoice, { hideIfOnPremise: true })).toBe(
            false
        );

        PromptState.transportAnswers.transportList = [];
        expect(defaultOrShowTransportListQuestion(TransportChoices.ListExistingChoice)).toBe(false);

        PromptState.transportAnswers.transportList = undefined;
        expect(defaultOrShowTransportListQuestion(TransportChoices.ListExistingChoice)).toBe(false);

        PromptState.transportAnswers.transportConfigNeedsCreds = true;
        expect(defaultOrShowTransportListQuestion(TransportChoices.ListExistingChoice)).toBe(false);
    });

    test('should show transport created question', () => {
        PromptState.transportAnswers.newTransportNumber = 'K123456';
        expect(defaultOrShowTransportCreatedQuestion(TransportChoices.CreateNewChoice)).toBe(true);
    });

    test('should not show transport created question', () => {
        PromptState.transportAnswers.newTransportNumber = undefined;
        expect(defaultOrShowTransportCreatedQuestion(TransportChoices.CreateNewChoice)).toBe(false);

        PromptState.transportAnswers.transportConfigNeedsCreds = true;
        expect(defaultOrShowTransportCreatedQuestion(TransportChoices.CreateNewChoice)).toBe(false);
    });

    test('should show manual transport question', () => {
        expect(defaultOrShowManualTransportQuestion(TransportChoices.EnterManualChoice)).toBe(true);
    });

    test('should show manual transport question when transportInput choice is not provided and transportInputChoice is hidden', () => {
        PromptState.abapDeployConfig.isAbapCloud = false;
        expect(defaultOrShowManualTransportQuestion(undefined, { hideIfOnPremise: true })).toBe(true);
    });

    test('should show index question', () => {
        PromptState.abapDeployConfig.index = undefined;
        expect(
            showIndexQuestion({
                index: { indexGenerationAllowed: true }
            })
        ).toBe(true);
    });

    test('Validate different state changes i.e. YUI | CLI', () => {
        PromptState.isYUI = false;
        expect(showPackageInputChoiceQuestion(false)).toBe(false);
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.ListExistingChoice, false)).toBe(false);
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.EnterManualChoice, true)).toBe(true);
        expect(defaultOrShowSearchPackageQuestion(PackageInputChoices.ListExistingChoice, false)).toBe(false);
        PromptState.isYUI = true;
        expect(showPackageInputChoiceQuestion(false)).toBe(false);
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.ListExistingChoice, false)).toBe(false);
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.EnterManualChoice, true)).toBe(true);
        expect(defaultOrShowManualPackageQuestion(PackageInputChoices.ListExistingChoice, true)).toBe(false);
        expect(defaultOrShowSearchPackageQuestion(PackageInputChoices.ListExistingChoice, false)).toBe(false);
    });
});
