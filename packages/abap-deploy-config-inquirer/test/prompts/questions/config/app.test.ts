import { jest } from '@jest/globals';
import type { TransportConfig } from '../../../../src/types';
import { promptNames } from '../../../../src/types';

const mockShowUi5AppDeployConfigQuestion = jest.fn();
const mockValidateUi5AbapRepoName = jest.fn();
const mockValidateAppDescription = jest.fn();

jest.unstable_mockModule('../../../../src/prompts/conditions', () => ({
    showUi5AppDeployConfigQuestion: mockShowUi5AppDeployConfigQuestion,
    showUsernameQuestion: jest.fn(),
    showPasswordQuestion: jest.fn(),
    showUrlQuestion: jest.fn(),
    showScpQuestion: jest.fn(),
    showClientChoiceQuestion: jest.fn(),
    showClientQuestion: jest.fn(),
    showPackageInputChoiceQuestion: jest.fn(),
    defaultOrShowManualPackageQuestion: jest.fn(),
    defaultOrShowSearchPackageQuestion: jest.fn(),
    showTransportInputChoice: jest.fn(),
    defaultOrShowTransportListQuestion: jest.fn(),
    defaultOrShowTransportCreatedQuestion: jest.fn(),
    defaultOrShowManualTransportQuestion: jest.fn(),
    showIndexQuestion: jest.fn()
}));

jest.unstable_mockModule('../../../../src/prompts/validators', () => ({
    validateUi5AbapRepoName: mockValidateUi5AbapRepoName,
    validateAppDescription: mockValidateAppDescription,
    validateUrl: jest.fn(),
    validateTargetSystem: jest.fn(),
    validateTargetSystemUrlCli: jest.fn(),
    updateDestinationPromptState: jest.fn(),
    validateDestinationQuestion: jest.fn(),
    validateClientChoiceQuestion: jest.fn(),
    validateClient: jest.fn(),
    validateCredentials: jest.fn(),
    validatePackage: jest.fn(),
    validatePackageChoiceInput: jest.fn(),
    validatePackageChoiceInputForCli: jest.fn(),
    validateTransportChoiceInput: jest.fn(),
    validateTransportQuestion: jest.fn(),
    validateConfirmQuestion: jest.fn()
}));

const { initI18n, t } = await import('../../../../src/i18n');
const { getAppConfigPrompts } = await import('../../../../src/prompts/questions');
const { PromptState } = await import('../../../../src/prompts/prompt-state');

describe('getConfirmPrompts', () => {
    beforeAll(async () => {
        await initI18n();
    });
    it('should return expected prompts', () => {
        const prompts = getAppConfigPrompts({});
        expect(prompts).toMatchInlineSnapshot(`
            Array [
              Object {
                "default": [Function],
                "filter": [Function],
                "guiOptions": Object {
                  "breadcrumb": "SAPUI5 ABAP Repository",
                  "hint": "Enter the name for the deployed application. The name must follow the rules of creating a BSP application. It must not exceed 15 characters and must consist of alphanumeric characters or underscores only. The name must be unique in the BSP repository and its namespace must be compatible with the selected package.",
                  "mandatory": true,
                },
                "message": [Function],
                "name": "ui5AbapRepo",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              Object {
                "default": [Function],
                "filter": [Function],
                "guiOptions": Object {
                  "breadcrumb": true,
                  "hint": "The description of the deployed application.",
                },
                "message": "Deployment Description",
                "name": "description",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);
    });

    test('should return expected values from ui5 abap repo prompt methods', async () => {
        mockShowUi5AppDeployConfigQuestion.mockReturnValueOnce(true);
        mockValidateUi5AbapRepoName.mockReturnValueOnce(true);

        PromptState.transportAnswers = {
            transportConfig: {
                getApplicationPrefix: jest.fn().mockReturnValue('Z')
            } as unknown as TransportConfig
        };
        const appConfigPrompts = getAppConfigPrompts({});
        const ui5AbapRepoPrompt = appConfigPrompts.find((prompt) => prompt.name === promptNames.ui5AbapRepo);

        if (ui5AbapRepoPrompt) {
            expect((ui5AbapRepoPrompt.when as Function)()).toBe(true);
            expect((ui5AbapRepoPrompt.message as Function)()).toBe(
                t('prompts.config.app.ui5AbapRepo.messageMaxLength', {
                    applicationPrefix: 'Z'
                })
            );
            PromptState.resetTransportAnswers();
            expect((ui5AbapRepoPrompt.message as Function)()).toBe(t('prompts.config.app.ui5AbapRepo.message'));
            expect((ui5AbapRepoPrompt.default as Function)({ ui5AbapRepo: 'ZTEST' })).toBe('ZTEST');
            expect((ui5AbapRepoPrompt.validate as Function)()).toBe(true);

            PromptState.isYUI = false;
            expect((ui5AbapRepoPrompt.filter as Function)('test')).toBe('TEST');
            PromptState.isYUI = true;
            expect((ui5AbapRepoPrompt.filter as Function)('test  ')).toBe('test');
        }
    });

    test('should return expected values from overwrite prompt methods', async () => {
        mockShowUi5AppDeployConfigQuestion.mockReturnValue(true);
        mockValidateAppDescription.mockReturnValue(true);

        const appConfigPrompts = getAppConfigPrompts({ description: { default: 'Mock description' } });
        const descriptionPrompt = appConfigPrompts.find((prompt) => prompt.name === promptNames.description);

        if (descriptionPrompt) {
            expect((descriptionPrompt.when as Function)()).toBe(true);
            expect(descriptionPrompt.message).toBe(t('prompts.config.app.description.message'));
            expect((descriptionPrompt.default as Function)({})).toBe('Mock description');
            expect((descriptionPrompt.filter as Function)('Mock description  ')).toBe('Mock description');
            expect((descriptionPrompt.validate as Function)()).toBe(true);
        }
    });
});
