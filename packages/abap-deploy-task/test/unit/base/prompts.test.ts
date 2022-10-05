import prompts from 'prompts';
import { promptConfirmation, promptCredentials } from '../../../src/base/prompt';

describe('prompts', () => {
    const message = 'Test question?';

    describe('promptConfirmation', () => {
        test('Default answer.', async () => {
            prompts.inject(['\n']);
            expect(await promptConfirmation(message)).toBe(true);
        });

        test('Yes, or no.', async () => {
            prompts.inject([true]);
            expect(await promptConfirmation(message)).toBe(true);
            prompts.inject([false]);
            expect(await promptConfirmation(message)).toBe(false);
        });
    });

    describe('promptCredentials', () => {
        const username = '~user';
        const password = '~pass';

        test('no default provided', async () => {
            prompts.inject([username, password]);
            const creds = await promptCredentials();
            expect(creds.username).toBe(username);
            expect(creds.password).toBe(password);
        });

        test('default provided', async () => {
            prompts.inject(['\n', password]);
            const providedUser = '~other';
            const creds = await promptCredentials(providedUser);
            expect(creds.username).toBe(providedUser);
            expect(creds.password).toBe(password);
        });
    });
});
