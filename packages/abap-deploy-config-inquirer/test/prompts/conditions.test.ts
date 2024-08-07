import { isAppStudio } from '@sap-ux/btp-utils';
import {
    AbapDeployConfigPromptOptions,
    ClientChoiceValue,
    PackageInputChoices,
    TransportConfig
} from '../../src/types';
import {
    defaultOrShowManualPackageQuestion,
    showClientChoiceQuestion,
    showClientQuestion,
    showPackageInputChoiceQuestion,
    showPasswordQuestion,
    showScpQuestion,
    showUi5AppDeployConfigQuestion,
    showUrlQuestion,
    showUsernameQuestion
} from '../../src/prompts/conditions';
import * as utils from '../../src/utils';
import { PromptState } from '../../src/prompts/prompt-state';
import { getHostEnvironment, hostEnvironment, getHelpUrl } from '@sap-ux/fiori-generator-shared';
import { isFeatureEnabled } from '@sap-ux/feature-toggle';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

jest.mock('@sap-ux/feature-toggle', () => ({
    isFeatureEnabled: jest.fn()
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn(),
    getHelpUrl: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;
const mockGetHostEnvironment = getHostEnvironment as jest.Mock;
const mockGetHelpUrl = getHelpUrl as jest.Mock;
const mockIsFeatureEnabled = isFeatureEnabled as jest.Mock;

const abapDeployConfigPromptOptions: AbapDeployConfigPromptOptions = {};

describe('Test abap deploy config inquirer conditions', () => {
    let options: AbapDeployConfigPromptOptions;
    beforeEach(() => {
        options = abapDeployConfigPromptOptions;
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
        // 3 scp value has already been provided in existing options
        options.backendTarget = {
            abapTarget: {
                url: 'http://known.target.url',
                scp: false,
                client: '100'
            },
            type: 'application'
        };
        expect(showScpQuestion({ url: 'http://known.target.url' })).toBe(false);
        // 4 scp value has been retrieved from existing system
        options.backendTarget.abapTarget.scp = undefined;
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
        options = {
            backendTarget: {
                abapTarget: {
                    url: 'http://known.target.url',
                    scp: false,
                    client: '100'
                }
            }
        };
        mockIsAppStudio.mockReturnValueOnce(false);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        expect(showClientChoiceQuestion(options, false)).toBe(true);
    });

    test('should not show client choice question', () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        expect(showClientChoiceQuestion({}, true)).toBe(false);
    });

    test('should show client question', () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        mockIsAppStudio.mockReturnValueOnce(false);
        expect(showClientQuestion({}, options, false)).toBe(true);
    });

    test('should show client question (CLI)', () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        mockIsAppStudio.mockReturnValue(false);
        expect(showClientQuestion({ clientChoice: ClientChoiceValue.New }, options, false)).toBe(true);
    });

    test('should show username question', async () => {
        jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
            transportConfig: {} as any,
            transportConfigNeedsCreds: true
        });
        expect(await showUsernameQuestion(options)).toBe(true);
    });

    test('should not show username question', async () => {
        jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
            transportConfig: {} as any,
            transportConfigNeedsCreds: false,
            warning: 'Warning message'
        });
        expect(await showUsernameQuestion(options)).toBe(false);
        expect(mockGetHelpUrl).toHaveBeenCalledWith(3046, [57266]);
    });

    test('should show password questions', () => {
        PromptState.transportAnswers.transportConfigNeedsCreds = true;
        expect(showPasswordQuestion()).toBe(true);
    });

    test('should show ui5 app deploy config questions', () => {
        PromptState.transportAnswers.transportConfigNeedsCreds = false;
        expect(showUi5AppDeployConfigQuestion()).toBe(true);
    });

    test('should show package input choice question', () => {
        // cli
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        expect(showPackageInputChoiceQuestion()).toBe(true);

        // feature enabled
        mockIsFeatureEnabled.mockReturnValueOnce(true);
        expect(showPackageInputChoiceQuestion()).toBe(true);
    });

    test('should not show package input choice question', () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        mockIsFeatureEnabled.mockReturnValueOnce(true);
        PromptState.transportAnswers.transportConfig = {
            getPackage: () => 'ZPACKAGE1'
        } as unknown as TransportConfig;
        expect(showPackageInputChoiceQuestion()).toBe(false);
        expect(PromptState.abapDeployConfig.package).toBe('ZPACKAGE1');
    });

    test('should show manual package question', () => {
        mockIsFeatureEnabled.mockReturnValueOnce(false);
        expect(defaultOrShowManualPackageQuestion(false, {})).toBe(true);

        // cli
        expect(
            defaultOrShowManualPackageQuestion(true, { packageInputChoice: PackageInputChoices.EnterManualChoice })
        ).toBe(true);
    });
});
