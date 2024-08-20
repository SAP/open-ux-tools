import * as conditions from '../../../src/prompts/conditions';
import * as validators from '../../../src/prompts/validators';
import { initI18n, t } from '../../../src/i18n';
import { getAuthPrompts } from '../../../src/prompts/questions';
import { abapDeployConfigInternalPromptNames } from '../../../src/types';

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
        jest.spyOn(conditions, 'showUsernameQuestion').mockResolvedValueOnce(true);

        const authPrompts = getAuthPrompts({});
        const usernamePrompt = authPrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.username
        );

        if (usernamePrompt) {
            expect(await (usernamePrompt.when as Function)()).toBe(true);
            expect(usernamePrompt.message).toBe(t('prompts.auth.username.message'));
        }
    });

    test('should return expected values from password prompt methods', async () => {
        jest.spyOn(conditions, 'showPasswordQuestion').mockReturnValue(true);
        jest.spyOn(validators, 'validateCredentials').mockResolvedValueOnce(true);

        const authPrompts = getAuthPrompts({});
        const passwordPrompt = authPrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.password
        );

        if (passwordPrompt) {
            expect((passwordPrompt.when as Function)()).toBe(true);
            expect(passwordPrompt.message).toBe(t('prompts.auth.password.message'));
            expect(await (passwordPrompt.validate as Function)()).toBe(true);
        }
    });
});
