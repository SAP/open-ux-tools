import type { ToolsLogger } from '@sap-ux/logger';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { Severity, type IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import type { InputQuestion, ListQuestion, PasswordQuestion } from '@sap-ux/inquirer-common';
import { type SystemLookup, getEndpointNames, getConfiguredProvider } from '@sap-ux/adp-tooling';
import type {
    AbapServiceProvider,
    AdaptationDescriptor,
    FlexVersion,
    KeyUserChangeContent
} from '@sap-ux/axios-extension';

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
import { keyUserPromptNames } from '../types';

export const DEFAULT_ADAPTATION_ID = 'DEFAULT';

/**
 * Prompter class that guides the user through importing key-user changes.
 */
export class KeyUserImportPrompter {
    /**
     * Instance of AbapServiceProvider.
     */
    private provider: AbapServiceProvider;
    /**
     * List of adaptations.
     */
    private adaptations: AdaptationDescriptor[] = [];
    /**
     * Latest message to be displayed in additional messages.
     */
    private latestMessage?: IMessageSeverity;
    /**
     * List of key-user changes.
     */
    private keyUserChanges: KeyUserChangeContent[] = [];
    /**
     * List of flex versions.
     */
    private flexVersions: FlexVersion[] = [];
    /**
     * Indicates if authentication is required.
     */
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
        const keyedPrompts: Record<keyUserPromptNames, KeyUserImportQuestion> = {
            [keyUserPromptNames.keyUserSystem]: this.getSystemPrompt(promptOptions?.[keyUserPromptNames.keyUserSystem]),
            [keyUserPromptNames.keyUserUsername]: this.getUsernamePrompt(
                promptOptions?.[keyUserPromptNames.keyUserUsername]
            ),
            [keyUserPromptNames.keyUserPassword]: this.getPasswordPrompt(
                promptOptions?.[keyUserPromptNames.keyUserPassword]
            ),
            [keyUserPromptNames.keyUserAdaptation]: this.getAdaptationPrompt(
                promptOptions?.[keyUserPromptNames.keyUserAdaptation]
            )
        };

        const questions: KeyUserImportQuestion[] = Object.entries(keyedPrompts)
            .filter(([promptName, _]) => {
                const options = promptOptions?.[promptName as keyUserPromptNames];
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
            name: keyUserPromptNames.keyUserSystem,
            message: t('prompts.systemLabel'),
            choices: async (): Promise<string[]> => {
                const systems = await this.systemLookup.getSystems();
                return getEndpointNames(systems);
            },
            guiOptions: {
                mandatory: true,
                breadcrumb: true,
                hint: t('prompts.keyUserSystemTooltip')
            },
            default: options?.default ?? '',
            validate: async (value: string, answers: KeyUserImportAnswers) => await this.validateSystem(value, answers),
            additionalMessages: () =>
                this.hasOnlyDefaultAdaptation() && !this.isAuthRequired ? this.latestMessage : undefined
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
            name: keyUserPromptNames.keyUserUsername,
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
            name: keyUserPromptNames.keyUserPassword,
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
            additionalMessages: () =>
                this.hasOnlyDefaultAdaptation() && this.isAuthRequired ? this.latestMessage : undefined
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
            name: keyUserPromptNames.keyUserAdaptation,
            message: t('prompts.keyUserAdaptationLabel'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true,
                hint: t('prompts.keyUserAdaptationLabelMulti')
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
     * @returns {Promise<Array<{ name: string; value: string }>>} The choices for the adaptation prompt.
     */
    private async getAdaptationChoices(): Promise<Array<{ name: string; value: string }>> {
        if (!this.adaptations.length) {
            this.latestMessage = {
                message: t('error.keyUserNoAdaptations'),
                severity: Severity.error
            };
            this.logger.error(`No adaptations found for component ${this.componentId}`);
            return [];
        }

        return this.adaptations.map((adaptation) => {
            if (adaptation.id === DEFAULT_ADAPTATION_ID) {
                return {
                    name: DEFAULT_ADAPTATION_ID,
                    value: DEFAULT_ADAPTATION_ID
                };
            }
            const name = adaptation.title ? `${adaptation.title} (${adaptation.id})` : adaptation.id;
            return {
                name,
                value: adaptation.id
            };
        });
    }

    /**
     * Checks if there are only DEFAULT adaptations (no context-based adaptations).
     *
     * @returns {boolean} True if there are only DEFAULT adaptations.
     */
    private hasOnlyDefaultAdaptation(): boolean {
        return this.adaptations.length === 1 && this.adaptations?.[0]?.id === DEFAULT_ADAPTATION_ID;
    }

    /**
     * Loads adaptations for the current provider.
     */
    private async loadAdaptations(): Promise<void> {
        const version = this.flexVersions?.[0]?.versionId;
        const lrep = this.provider?.getLayeredRepository();
        const response = await lrep?.listAdaptations(this.componentId, version);
        this.adaptations = response?.adaptations ?? [];
        this.logger.log(`Loaded adaptations: ${JSON.stringify(this.adaptations, null, 2)}`);
    }

    /**
     * Loads flex versions for the current provider.
     */
    private async loadFlexVersions(): Promise<void> {
        const lrep = this.provider?.getLayeredRepository();
        const response = await lrep?.getFlexVersions(this.componentId);
        this.flexVersions = response?.versions ?? [];
        this.logger.log(`Loaded flex versions: ${JSON.stringify(this.flexVersions, null, 2)}`);
    }

    /**
     * Loads flex versions and adaptations, then validates key-user changes if only DEFAULT adaptation exists.
     *
     * @returns The result of key-user validation if only DEFAULT exists, or true.
     */
    private async loadDataAndValidateKeyUserChanges(): Promise<string | boolean> {
        await this.loadFlexVersions();
        await this.loadAdaptations();

        if (this.hasOnlyDefaultAdaptation()) {
            return await this.validateKeyUserChanges(DEFAULT_ADAPTATION_ID);
        }
        return true;
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

        if (system === this.defaultSystem && this.defaultProvider) {
            this.provider = this.defaultProvider;
            this.isAuthRequired = false;
            try {
                return await this.loadDataAndValidateKeyUserChanges();
            } catch (e) {
                return e.message;
            }
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
                return await this.loadDataAndValidateKeyUserChanges();
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
            return await this.loadDataAndValidateKeyUserChanges();
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
        try {
            const lrep = this.provider?.getLayeredRepository();
            const data = await lrep?.getKeyUserData(this.componentId, adaptationId);

            this.keyUserChanges = data?.contents ?? [];
            this.logger.debug(
                `Retrieved ${this.keyUserChanges.length} key-user change(s) for adaptation ${adaptationId}`
            );

            if (!this.keyUserChanges.length) {
                const errorMessage =
                    adaptationId === DEFAULT_ADAPTATION_ID
                        ? t('error.keyUserNoChangesDefault')
                        : t('error.keyUserNoChangesAdaptation', { adaptationId });
                this.latestMessage = {
                    message: errorMessage,
                    severity: Severity.error
                };
                this.logger.warn(`No key-user changes found for adaptation: ${adaptationId}`);
                return errorMessage;
            }

            const message =
                adaptationId === DEFAULT_ADAPTATION_ID
                    ? t('prompts.keyUserChangesFoundDefault')
                    : t('prompts.keyUserChangesFoundAdaptation', { adaptationId });
            this.latestMessage = {
                message,
                severity: Severity.information
            };
            this.logger.debug(`Key-user changes validation successful for adaptation: ${adaptationId}`);

            return true;
        } catch (e) {
            this.logger.error(`Error validating key-user changes for adaptation ${adaptationId}: ${e.message}`);
            this.logger.debug(e);
            return e.message;
        }
    }
}
