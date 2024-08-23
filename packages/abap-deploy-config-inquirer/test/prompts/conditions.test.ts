import { isAppStudio } from '@sap-ux/btp-utils';
import { ClientChoiceValue, PackageInputChoices, TransportChoices, TransportConfig } from '../../src/types';
import {
    defaultOrShowManualPackageQuestion,
    defaultOrShowManualTransportQuestion,
    defaultOrShowSearchPackageQuestion,
    defaultOrShowTransportCreatedQuestion,
    defaultOrShowTransportListQuestion,
    showClientChoiceQuestion,
    showClientQuestion,
    showIndexQuestion,
    showOverwriteQuestion,
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
import { getHelpUrl } from '@sap-ux/guided-answers-helper';
import { isFeatureEnabled } from '@sap-ux/feature-toggle';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

jest.mock('@sap-ux/guided-answers-helper', () => ({
    ...jest.requireActual('@sap-ux/guided-answers-helper'),
    getHelpUrl: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;
const mockGetHelpUrl = getHelpUrl as jest.Mock;

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
        expect(showScpQuestion({})).toBe(false);
        // 2 url target chosen but no url provided
        expect(showScpQuestion({ targetSystem: 'Url', url: '' })).toBe(false);

        // 3 scp value has been retrieved from existing system
        jest.spyOn(utils, 'findBackendSystemByUrl').mockReturnValue({
            name: 'Target system 1',
            url: 'http://saved.target.url',
            client: '100'
        });
        expect(showScpQuestion({ url: 'http://saved.target.url' })).toBe(false);
    });

    test('should show scp question', async () => {
        jest.spyOn(utils, 'findBackendSystemByUrl').mockReturnValue(undefined);
        expect(showScpQuestion({ targetSystem: 'Url', url: 'http://new.target.url' })).toBe(true);
    });

    test('should show client choice question', () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        PromptState.isYUI = false;
        expect(showClientChoiceQuestion('100', false)).toBe(true);
    });

    test('should not show client choice question', () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        PromptState.isYUI = false;
        expect(showClientChoiceQuestion(undefined, true)).toBe(false);
    });

    test('should show client question', () => {
        PromptState.isYUI = true;
        mockIsAppStudio.mockReturnValueOnce(false);
        expect(showClientQuestion(undefined, undefined, false)).toBe(true);
    });

    test('should show client question (CLI)', () => {
        PromptState.isYUI = false;
        mockIsAppStudio.mockReturnValue(false);
        expect(showClientQuestion(ClientChoiceValue.New, undefined, false)).toBe(true);
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
            transportConfigNeedsCreds: false,
            warning: 'Warning message'
        });
        expect(await showUsernameQuestion(undefined)).toBe(false);
        expect(mockGetHelpUrl).toHaveBeenCalledWith(3046, [57266]);
    });

    test('should show password questions', () => {
        PromptState.transportAnswers.transportConfigNeedsCreds = true;
        expect(showPasswordQuestion()).toBe(true);
    });

    test('should show ui5 app deploy config questions', () => {
        PromptState.transportAnswers.transportConfigNeedsCreds = false;
        expect(showUi5AppDeployConfigQuestion(undefined)).toBe(true);
    });

    test('should not show ui5 app deploy config questions', () => {
        PromptState.abapDeployConfig.scp = true;
        expect(showUi5AppDeployConfigQuestion(true)).toBe(false);
    });

    test('should show package input choice question', () => {
        // cli
        PromptState.isYUI = false;
        expect(showPackageInputChoiceQuestion()).toBe(true);
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
        expect(defaultOrShowManualPackageQuestion(true, PackageInputChoices.EnterManualChoice)).toBe(true);
    });

    test('should show search package question', () => {
        expect(defaultOrShowSearchPackageQuestion(true, PackageInputChoices.ListExistingChoice)).toBe(true);
    });

    test('should show transport input choice question', () => {
        PromptState.transportAnswers.transportConfigError = undefined;
        PromptState.transportAnswers.transportConfigNeedsCreds = false;
        expect(showTransportInputChoice()).toBe(true);
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

    test('should show index question', () => {
        PromptState.abapDeployConfig.index = undefined;
        expect(
            showIndexQuestion({
                indexGenerationAllowed: true
            })
        ).toBe(true);
    });

    test('should show overwrite question', () => {
        PromptState.abapDeployConfig.overwrite = undefined;
        expect(
            showOverwriteQuestion({
                showOverwriteQuestion: true,
                existingDeployTaskConfig: {}
            })
        ).toBe(true);
    });
});
