import { jest } from '@jest/globals';
import { promptNames } from '../../../src/types.js';

const mockShowUsernameQuestion = jest.fn();
const mockShowPasswordQuestion = jest.fn();
const mockValidateCredentials = jest.fn();

const actualConditions = await import('../../../src/prompts/conditions.js');
const actualValidators = await import('../../../src/prompts/validators.js');

jest.unstable_mockModule('../../../src/prompts/conditions', () => ({
    ...actualConditions,
    showUsernameQuestion: mockShowUsernameQuestion,
    showPasswordQuestion: mockShowPasswordQuestion
}));

jest.unstable_mockModule('../../../src/prompts/validators', () => ({
    ...actualValidators,
    validateCredentials: mockValidateCredentials
}));

const { initI18n, t } = await import('../../../src/i18n.js');
const { getAuthPrompts } = await import('../../../src/prompts/questions/auth.js');

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
