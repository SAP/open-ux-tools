import {
    getCredentialsPrompts,
    type CredentialsAnswers,
    type AdditionalValidation
} from '../../../src/prompts/credentials';
import { t, addi18nResourceBundle } from '../../../src/i18n';

import type { InputQuestion, PasswordQuestion } from '../../../src/types';

describe('getCredentialsPrompts', () => {
    beforeAll(() => {
        addi18nResourceBundle();
    });

    it('should return an array of prompts', async () => {
        const prompts = await getCredentialsPrompts();
        expect(prompts).toBeInstanceOf(Array);
        expect(prompts).toEqual([
            {
                type: 'input',
                name: 'username',
                message: 'Username',
                guiOptions: {
                    mandatory: true
                },
                store: false,
                validate: expect.any(Function)
            } as InputQuestion,
            {
                type: 'password',
                guiType: 'login',
                name: 'password',
                message: 'Password',
                mask: '*',
                guiOptions: {
                    mandatory: true
                },
                store: false,
                validate: expect.any(Function)
            } as PasswordQuestion
        ]);
    });

    it('should validate username correctly', async () => {
        const prompts = await getCredentialsPrompts();
        const validate = (prompts[0] as InputQuestion).validate;

        expect(typeof validate).toBe('function');
        expect(validate?.('')).toBe(t('errors.cannotBeEmpty', { field: t('prompts.username.message') }));
        expect(validate?.('user')).toBe(true);
    });

    it('should validate password correctly', async () => {
        const prompts = await getCredentialsPrompts();
        const validate = (prompts[1] as PasswordQuestion).validate;

        const answers: CredentialsAnswers = {
            username: undefined
        } as unknown as CredentialsAnswers;

        expect(await validate?.('', answers)).toBe(t('errors.cannotBeEmpty', { field: t('prompts.password.message') }));
        expect(await validate?.('password', answers)).toBe(
            t('errors.cannotBeEmpty', { field: t('prompts.username.message') })
        );
        answers.username = 'user';
        expect(await validate?.('pass', answers)).toBe(true);
    });

    it('should call additionalValidation if provided', async () => {
        const additionalValidation: AdditionalValidation = jest.fn().mockResolvedValue(true);
        const prompts = await getCredentialsPrompts(additionalValidation);
        const validate = (prompts[1] as PasswordQuestion).validate;

        const answers: CredentialsAnswers = { username: 'user', password: 'pass' };

        await validate?.('pass', answers);
        expect(additionalValidation).toHaveBeenCalledWith({ username: 'user', password: 'pass' });
    });

    it('should return validation message from additionalValidation if provided', async () => {
        const additionalValidation: AdditionalValidation = jest.fn().mockResolvedValue('Additional validation failed');
        const prompts = await getCredentialsPrompts(additionalValidation);
        const validate = (prompts[1] as PasswordQuestion).validate;

        const answers: CredentialsAnswers = { username: 'user', password: 'pass' };

        const result = await validate?.('pass', answers);
        expect(result).toBe('Additional validation failed');
    });

    it('should handle missing username in password validation', async () => {
        const prompts = await getCredentialsPrompts();
        const validate = (prompts[1] as PasswordQuestion).validate;

        const answers: CredentialsAnswers = { username: '', password: 'pass' };

        const result = await validate?.('pass', answers);
        expect(result).toBe(t('errors.cannotBeEmpty', { field: t('prompts.username.message') }));
    });
});
