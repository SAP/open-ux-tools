import { jest } from '@jest/globals';
import { promptNames } from '../../../src/types';

const mockShowUsernameQuestion = jest.fn();
const mockShowPasswordQuestion = jest.fn();
const mockValidateCredentials = jest.fn();

jest.unstable_mockModule('../../../src/prompts/conditions', () => ({
    showUsernameQuestion: mockShowUsernameQuestion,
    showPasswordQuestion: mockShowPasswordQuestion,
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
    defaultOrShowManualTransportQuestion: jest.fn(),
    showIndexQuestion: jest.fn()
}));

jest.unstable_mockModule('../../../src/prompts/validators', () => ({
    validateCredentials: mockValidateCredentials,
    validateUrl: jest.fn(),
    validateTargetSystem: jest.fn(),
    validateTargetSystemUrlCli: jest.fn(),
    updateDestinationPromptState: jest.fn(),
    validateDestinationQuestion: jest.fn(),
    validateClientChoiceQuestion: jest.fn(),
    validateClient: jest.fn(),
    validateUi5AbapRepoName: jest.fn(),
    validateAppDescription: jest.fn(),
    validatePackage: jest.fn(),
    validatePackageChoiceInput: jest.fn(),
    validatePackageChoiceInputForCli: jest.fn(),
    validateTransportChoiceInput: jest.fn(),
    validateTransportQuestion: jest.fn(),
    validateConfirmQuestion: jest.fn()
}));

const { initI18n, t } = await import('../../../src/i18n');
const { getAuthPrompts } = await import('../../../src/prompts/questions');

describe('getAuthPrompts', () => {
    beforeAll(async () => {
        await initI18n();
    });
    it('should return expected prompts', () => {
        const prompts = getAuthPrompts({});
        expect(prompts).toMatchInlineSnapshot(`
            Array [
              Object {
                "guiOptions": Object {
                  "mandatory": true,
                },
                "message": "Username: ",
                "name": "username",
                "type": "input",
                "when": [Function],
              },
              Object {
                "guiOptions": Object {
                  "mandatory": true,
                  "type": "login",
                },
                "mask": "*",
                "message": "Password: ",
                "name": "password",
                "type": "password",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);
    });

    test('should return expected values from username prompt methods', async () => {
        mockShowUsernameQuestion.mockResolvedValueOnce(true);

        const authPrompts = getAuthPrompts({});
        const usernamePrompt = authPrompts.find((prompt) => prompt.name === promptNames.username);

        if (usernamePrompt) {
            expect(await (usernamePrompt.when as Function)()).toBe(true);
            expect(usernamePrompt.message).toBe(t('prompts.auth.username.message'));
        }
    });

    test('should return expected values from password prompt methods', async () => {
        mockShowPasswordQuestion.mockReturnValue(true);
        mockValidateCredentials.mockResolvedValueOnce(true);

        const authPrompts = getAuthPrompts({});
        const passwordPrompt = authPrompts.find((prompt) => prompt.name === promptNames.password);

        if (passwordPrompt) {
            expect((passwordPrompt.when as Function)()).toBe(true);
            expect(passwordPrompt.message).toBe(t('prompts.auth.password.message'));
            expect(await (passwordPrompt.validate as Function)()).toBe(true);
        }
    });
});
