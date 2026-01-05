import { type SystemLookup, getEndpointNames, getConfiguredProvider } from '@sap-ux/adp-tooling';
import type { AbapServiceProvider, AdaptationDescriptor, KeyUserChangeContent } from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { Severity, type IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import type { InputQuestion, ListQuestion, PasswordQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../utils/i18n';
import type {
    KeyUserImportPromptOptions,
    KeyUserImportAnswers,
    KeyUserImportQuestion,
    KeyUserSystemPromptOptions,
    KeyUserUsernamePromptOptions,
    KeyUserPasswordPromptOptions,
    KeyUserAdaptationPromptOptions
} from '../types';
import { keyUserImportPromptNames } from '../types';

const DEFAULT_ADAPTATION_ID = 'DEFAULT';

/**
 * Prompter that guides the user through importing key-user changes.
 */
export class KeyUserImportPrompter {
    private provider: AbapServiceProvider;
    private adaptations: AdaptationDescriptor[] = [];
    private latestMessage?: IMessageSeverity;
    private keyUserChanges: KeyUserChangeContent[] = [];
    private isAuthRequired: boolean;

    /**
     * Constructs a new KeyUserImportPrompter.
     *
     * @param {SystemLookup} systemLookup - The system lookup.
     * @param {string} componentId - The component ID.
     * @param {AbapServiceProvider} defaultProvider - The default provider.
     * @param {string} defaultSystem - The default system.
     * @param {ToolsLogger} logger - The logger.
     */
    constructor(
        private readonly systemLookup: SystemLookup,
        private readonly componentId: string,
        private readonly defaultProvider: AbapServiceProvider,
        private readonly defaultSystem: string,
        private readonly logger: ToolsLogger
    ) {
        this.provider = defaultProvider;
    }

    /**
     * Returns the key-user changes.
     *
     * @returns {KeyUserChangeContent[]} The key-user changes.
     */
    get changes(): KeyUserChangeContent[] {
        return this.keyUserChanges;
    }

    /**
     * Builds the prompts for the key-user import page.
     *
     * @param {KeyUserImportPromptOptions} [promptOptions] - Per-prompt settings (hide/default).
     * @returns {KeyUserImportQuestion[]} Questions for the key-user import page.
     */
    getPrompts(promptOptions?: KeyUserImportPromptOptions): KeyUserImportQuestion[] {
        const keyedPrompts: Record<keyUserImportPromptNames, KeyUserImportQuestion> = {
            [keyUserImportPromptNames.keyUserSystem]: this.getSystemPrompt(
                promptOptions?.[keyUserImportPromptNames.keyUserSystem]
            ),
            [keyUserImportPromptNames.keyUserUsername]: this.getUsernamePrompt(
                promptOptions?.[keyUserImportPromptNames.keyUserUsername]
            ),
            [keyUserImportPromptNames.keyUserPassword]: this.getPasswordPrompt(
                promptOptions?.[keyUserImportPromptNames.keyUserPassword]
            ),
            [keyUserImportPromptNames.keyUserAdaptation]: this.getAdaptationPrompt(
                promptOptions?.[keyUserImportPromptNames.keyUserAdaptation]
            )
        };

        const questions: KeyUserImportQuestion[] = Object.entries(keyedPrompts)
            .filter(([promptName, _]) => {
                const options = promptOptions?.[promptName as keyUserImportPromptNames];
                return !(options && 'hide' in options && options.hide);
            })
            .map(([_, question]) => question);

        return questions;
    }

    /**
     * Returns the system prompt.
     *
     * @param {KeyUserSystemPromptOptions} [options] - The options for the system prompt.
     * @returns {ListQuestion<KeyUserImportAnswers>} The system prompt.
     */
    private getSystemPrompt(options?: KeyUserSystemPromptOptions): ListQuestion<KeyUserImportAnswers> {
        return {
            type: 'list',
            name: keyUserImportPromptNames.keyUserSystem,
            message: t('prompts.keyUserSystemLabel'),
            choices: async (): Promise<string[]> => {
                const systems = await this.systemLookup.getSystems();
                return getEndpointNames(systems);
            },
            guiOptions: {
                mandatory: true,
                breadcrumb: t('prompts.systemLabel')
            },
            default: options?.default ?? '',
            validate: async (value: string, answers: KeyUserImportAnswers) => await this.validateSystem(value, answers),
            additionalMessages: () => (this.hasOnlyDefaultAdaptation() ? this.latestMessage : undefined)
        };
    }

    /**
     * Returns the username prompt.
     *
     * @param {KeyUserUsernamePromptOptions} [options] - The options for the username prompt.
     * @returns {InputQuestion<KeyUserImportAnswers>} The username prompt.
     */
    private getUsernamePrompt(options?: KeyUserUsernamePromptOptions): InputQuestion<KeyUserImportAnswers> {
        return {
            type: 'input',
            name: keyUserImportPromptNames.keyUserUsername,
            message: t('prompts.usernameLabel'),
            default: options?.default,
            filter: (val: string): string => val.trim(),
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            when: () => !!this.isAuthRequired,
            validate: (value: string) => validateEmptyString(value)
        };
    }

    /**
     * Returns the password prompt.
     *
     * @param {KeyUserPasswordPromptOptions} [options] - The options for the password prompt.
     * @returns {PasswordQuestion<KeyUserImportAnswers>} The password prompt.
     */
    private getPasswordPrompt(options?: KeyUserPasswordPromptOptions): PasswordQuestion<KeyUserImportAnswers> {
        return {
            type: 'password',
            name: keyUserImportPromptNames.keyUserPassword,
            message: t('prompts.passwordLabel'),
            mask: '*',
            default: options?.default,
            guiOptions: {
                mandatory: true,
                breadcrumb: true,
                type: 'login'
            },
            when: () => !!this.isAuthRequired,
            validate: async (value: string, answers: KeyUserImportAnswers) =>
                await this.validatePassword(value, answers),
            additionalMessages: () => (this.hasOnlyDefaultAdaptation() ? this.latestMessage : undefined)
        };
    }

    /**
     * Returns the adaptation prompt.
     *
     * @param {KeyUserAdaptationPromptOptions} [options] - The options for the adaptation prompt.
     * @returns {ListQuestion<KeyUserImportAnswers>} The adaptation prompt.
     */
    private getAdaptationPrompt(options?: KeyUserAdaptationPromptOptions): ListQuestion<KeyUserImportAnswers> {
        return {
            type: 'list',
            name: keyUserImportPromptNames.keyUserAdaptation,
            message: (_: KeyUserImportAnswers) =>
                this.adaptations.some((a) => a.id !== DEFAULT_ADAPTATION_ID)
                    ? t('prompts.keyUserAdaptationLabelMulti')
                    : t('prompts.keyUserAdaptationLabel'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            default: options?.default ?? DEFAULT_ADAPTATION_ID,
            choices: () => this.getAdaptationChoices(),
            additionalMessages: () => this.latestMessage,
            validate: async (adaptationId: string) => await this.validateKeyUserChanges(adaptationId),
            when: () => !this.hasOnlyDefaultAdaptation()
        };
    }

    /**
     * Returns the choices for the adaptation prompt.
     *
     * @returns {Promise<string[]>} The choices for the adaptation prompt.
     */
    private async getAdaptationChoices(): Promise<string[]> {
        if (!this.adaptations.length) {
            this.latestMessage = {
                message: t('error.keyUserNoAdaptations'),
                severity: Severity.error
            };
            return [];
        }
        return this.adaptations.map((adaptation) => adaptation.id);
    }

    /**
     * Checks if there are only DEFAULT adaptations (no context-based adaptations).
     *
     * @returns {boolean} True if there are only DEFAULT adaptations.
     */
    private hasOnlyDefaultAdaptation(): boolean {
        return this.adaptations.length === 1 && this.adaptations[0]?.id === DEFAULT_ADAPTATION_ID;
    }

    /**
     * Validates the system selection by testing the connection.
     *
     * @param {string} system - The selected system.
     * @param {KeyUserImportAnswers} answers - The configuration answers provided by the user.
     * @returns An error message if validation fails, or true if the system selection is valid.
     */
    private async validateSystem(system: string, answers: KeyUserImportAnswers): Promise<string | boolean> {
        const validationResult = validateEmptyString(system);
        if (typeof validationResult === 'string') {
            return validationResult;
        }

        // If it's the default system, connection is already validated
        if (system === this.defaultSystem) {
            this.provider = this.defaultProvider;
            this.isAuthRequired = false;
            try {
                const response = await this.provider.getLayeredRepository().listAdaptations(this.componentId);
                this.adaptations = response?.adaptations ?? [];

                if (this.hasOnlyDefaultAdaptation()) {
                    return await this.validateKeyUserChanges(DEFAULT_ADAPTATION_ID);
                }
            } catch (e) {
                return e.message;
            }
            return true;
        }

        this.isAuthRequired = await this.systemLookup.getSystemRequiresAuth(system);
        if (!this.isAuthRequired) {
            try {
                const options = {
                    system,
                    client: undefined,
                    username: answers.keyUserUsername,
                    password: answers.keyUserPassword
                };
                this.provider = await getConfiguredProvider(options, this.logger);
                const response = await this.provider.getLayeredRepository().listAdaptations(this.componentId);
                this.adaptations = response?.adaptations ?? [];

                if (this.hasOnlyDefaultAdaptation()) {
                    return await this.validateKeyUserChanges(DEFAULT_ADAPTATION_ID);
                }

                return true;
            } catch (e) {
                return e.message;
            }
        }

        return true;
    }

    /**
     * Validates the password by testing the connection.
     *
     * @param {string} password - The inputted password.
     * @param {KeyUserImportAnswers} answers - The configuration answers provided by the user.
     * @returns An error message if validation fails, or true if the password is valid.
     */
    private async validatePassword(password: string, answers: KeyUserImportAnswers): Promise<string | boolean> {
        const validationResult = validateEmptyString(password);
        if (typeof validationResult === 'string') {
            return validationResult;
        }

        try {
            const options = {
                system: answers.keyUserSystem,
                client: undefined,
                username: answers.keyUserUsername,
                password
            };
            this.provider = await getConfiguredProvider(options, this.logger);
            const response = await this.provider.getLayeredRepository().listAdaptations(this.componentId);
            this.adaptations = response?.adaptations ?? [];

            if (this.hasOnlyDefaultAdaptation()) {
                return await this.validateKeyUserChanges(DEFAULT_ADAPTATION_ID);
            }

            return true;
        } catch (e) {
            return e.message;
        }
    }

    /**
     * Validates the key-user changes by testing the connection.
     *
     * @param {string} adaptationId - The selected adaptation.
     * @returns An error message if validation fails, or true if the key-user changes are valid.
     */
    private async validateKeyUserChanges(adaptationId: string): Promise<string | boolean> {
        const data = await this.provider?.getLayeredRepository().getKeyUserData(this.componentId, adaptationId);

        this.keyUserChanges = data?.contents ?? [];
        if (!this.keyUserChanges.length) {
            this.latestMessage = undefined;
            return adaptationId === DEFAULT_ADAPTATION_ID
                ? t('error.keyUserNoChangesDefault')
                : t('error.keyUserNoChangesAdaptation', { adaptationId });
        }

        const message =
            adaptationId === DEFAULT_ADAPTATION_ID
                ? t('prompts.keyUserChangesFoundDefault')
                : t('prompts.keyUserChangesFoundAdaptation', { adaptationId });
        this.latestMessage = {
            message,
            severity: Severity.information
        };

        return true;
    }
}
