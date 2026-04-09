import { jest } from '@jest/globals';
import { promptNames } from '../../../src/types';

const mockShowIndexQuestion = jest.fn();
const mockValidateConfirmQuestion = jest.fn();

jest.unstable_mockModule('../../../src/prompts/conditions', () => ({
    showIndexQuestion: mockShowIndexQuestion,
    showUsernameQuestion: jest.fn(),
    showPasswordQuestion: jest.fn(),
    showUrlQuestion: jest.fn(),
    showScpQuestion: jest.fn(),
    showClientChoiceQuestion: jest.fn(),
    showClientQuestion: jest.fn(),
    showUi5AppDeployConfigQuestion: jest.fn(),
    showPackageInputChoiceQuestion: jest.fn(),
    defaultOrShowManualPackageQuestion: jest.fn(),
    defaultOrShowSearchPackageQuestion: jest.fn(),
    showTransportInputChoice: jest.fn(),
    defaultOrShowTransportListQuestion: jest.fn(),
    defaultOrShowTransportCreatedQuestion: jest.fn(),
    defaultOrShowManualTransportQuestion: jest.fn()
}));

jest.unstable_mockModule('../../../src/prompts/validators', () => ({
    validateConfirmQuestion: mockValidateConfirmQuestion,
    validateUrl: jest.fn(),
    validateTargetSystem: jest.fn(),
    validateTargetSystemUrlCli: jest.fn(),
    updateDestinationPromptState: jest.fn(),
    validateDestinationQuestion: jest.fn(),
    validateClientChoiceQuestion: jest.fn(),
    validateClient: jest.fn(),
    validateCredentials: jest.fn(),
    validateUi5AbapRepoName: jest.fn(),
    validateAppDescription: jest.fn(),
    validatePackage: jest.fn(),
    validatePackageChoiceInput: jest.fn(),
    validatePackageChoiceInputForCli: jest.fn(),
    validateTransportChoiceInput: jest.fn(),
    validateTransportQuestion: jest.fn()
}));

const { initI18n, t } = await import('../../../src/i18n');
const { getConfirmPrompts } = await import('../../../src/prompts/questions');

describe('getConfirmPrompts', () => {
    beforeAll(async () => {
        await initI18n();
    });
    it('should return expected prompts', () => {
        const prompts = getConfirmPrompts({});
        expect(prompts).toMatchInlineSnapshot(`
            Array [
              Object {
                "default": false,
                "guiOptions": Object {
                  "breadcrumb": "prompts.confirm.index.hint",
                },
                "message": "Generate Standalone index.html During Deployment",
                "name": "index",
                "type": "confirm",
                "when": [Function],
              },
              Object {
                "default": true,
                "guiOptions": Object {
                  "hint": "Deployment config will abort if you choose no. Click 'Finish' to abort.",
                },
                "message": "Editing the deployment configuration will overwrite the existing configuration. Are you sure you want to continue?",
                "name": "overwriteAbapConfig",
                "type": "confirm",
                "validate": [Function],
              },
            ]
        `);
    });

    test('should return expected values from index prompt methods', async () => {
        mockShowIndexQuestion.mockReturnValueOnce(true);

        const confirmPrompts = getConfirmPrompts({});
        const indexPrompt = confirmPrompts.find((prompt) => prompt.name === promptNames.index);

        if (indexPrompt) {
            expect((indexPrompt.when as Function)()).toBe(true);
            expect(indexPrompt.message).toBe(t('prompts.confirm.index.message'));
            expect(indexPrompt.default).toBe(false);
        }
    });

    test('should return expected values from overwrite prompt methods', async () => {
        mockValidateConfirmQuestion.mockReturnValue(true);

        const confirmPrompts = getConfirmPrompts({});
        const overwritePrompt = confirmPrompts.find((prompt) => prompt.name === promptNames.overwriteAbapConfig);

        if (overwritePrompt) {
            expect(overwritePrompt.message).toBe(t('prompts.confirm.overwrite.message'));
            expect(overwritePrompt.default).toBe(true);
            expect((overwritePrompt.validate as Function)()).toBe(true);
        }
    });
});
