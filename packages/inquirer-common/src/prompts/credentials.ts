import { t } from '../i18n.js';
import type { YUIQuestion, InputQuestion, PasswordQuestion, Validator, ValidationLink } from '../types.js';

export type CredentialsAnswers = { username: string; password: string };
export type AdditionalValidation = (credentials: CredentialsAnswers) => Promise<ValidationLink | boolean | string>;

/**
 * Prompts the user for credentials.
 *
 * @param {Function} additionalValidation - Optional callback function called in the validation phase of password prompt. Callback function should return a boolean or a message.
 * @returns {Array} An array of prompts.
 */
export async function getCredentialsPrompts(
    additionalValidation?: AdditionalValidation
): Promise<YUIQuestion<CredentialsAnswers>[]> {
    const usernamePrompt: InputQuestion<CredentialsAnswers> = {
        type: 'input',
        name: 'username',
        message: t('prompts.username.message'),
        guiOptions: {
            mandatory: true
        },
        store: false,
        validate: (value: unknown): string | boolean => {
            return value ? true : t('errors.cannotBeEmpty', { field: t('prompts.username.message') });
        }
    };
    const passwordPrompt: PasswordQuestion<CredentialsAnswers> = {
        type: 'password',
        guiType: 'login',
        name: 'password',
        message: t('prompts.password.message'),
        mask: '*',
        guiOptions: {
            mandatory: true,
            applyDefaultWhenDirty: true
        },
        default: '',
        store: false,
        // The validator may resolve to a `ValidationLink` for YeomanUI to render as a clickable link.
        // `Validator` is typed to the `boolean | string` primitive that `this.prompt` accepts; the cast
        // preserves the richer runtime value, which serialises via `ValidationLink.toString()` on the CLI.
        validate: (async (
            value: unknown,
            answers?: Partial<CredentialsAnswers>
        ): Promise<ValidationLink | string | boolean> => {
            if (!value || typeof value !== 'string') {
                return t('errors.cannotBeEmpty', { field: t('prompts.password.message') });
            }

            if (!answers?.username) {
                return t('errors.cannotBeEmpty', { field: t('prompts.username.message') });
            }
            if (additionalValidation) {
                return await additionalValidation({ username: answers.username, password: value });
            }
            return true;
        }) as Validator<CredentialsAnswers>
    };
    return [usernamePrompt, passwordPrompt];
}
