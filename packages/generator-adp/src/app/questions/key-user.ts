import type {
    AbapServiceProvider,
    AdaptationDescriptor,
    FlexVersion,
    KeyUserChangeContent
} from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';
import { isAxiosError } from '@sap-ux/axios-extension';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { type SystemLookup, getConfiguredProvider } from '@sap-ux/adp-tooling';
import type { InputQuestion, ListQuestion, PasswordQuestion } from '@sap-ux/inquirer-common';

import type {
    KeyUserImportPromptOptions,
    KeyUserImportAnswers,
    KeyUserImportQuestion,
    KeyUserSystemPromptOptions,
    KeyUserUsernamePromptOptions,
    KeyUserPasswordPromptOptions,
    KeyUserAdaptationPromptOptions
} from '../types';
import { t } from '../../utils/i18n';
import { keyUserPromptNames } from '../types';
import { getAdaptationChoices, getKeyUserSystemChoices } from './helper/choices';

export const DEFAULT_ADAPTATION_ID = 'DEFAULT';

/**
 * Determines the flex version to be used. If the first version is the draft (versionId "0"), use the second version (active version).
 *
 * @param {FlexVersion[]} flexVersions - The list of flex versions.
 * @returns {string} The flex version to be used.
 */
export function determineFlexVersion(flexVersions: FlexVersion[]): string {
    if (!flexVersions?.length) {
        return '';
    }
    if (flexVersions[0]?.versionId === '0') {
        return flexVersions[1]?.versionId ?? '';
    }
    return flexVersions[0]?.versionId ?? '';
}

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
    private isAuthRequired: boolean = false;

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
     * @returns {KeyUserImportQuestion} The system prompt.
     */
    private getSystemPrompt(options?: KeyUserSystemPromptOptions): KeyUserImportQuestion {
        return {
            type: 'list',
            name: keyUserPromptNames.keyUserSystem,
            message: t('prompts.systemLabel'),
            choices: async () => {
                const systems = await this.systemLookup.getSystems();
                return getKeyUserSystemChoices(systems, this.defaultSystem);
            },
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            default: options?.default ?? '',
            validate: async (value: string, answers: KeyUserImportAnswers) => await this.validateSystem(value, answers)
        } as ListQuestion<KeyUserImportAnswers>;
    }

    /**
     * Returns the username prompt.
     *
     * @param {KeyUserUsernamePromptOptions} [options] - The options for the username prompt.
     * @returns {KeyUserImportQuestion} The username prompt.
     */
    private getUsernamePrompt(options?: KeyUserUsernamePromptOptions): KeyUserImportQuestion {
        return {
            type: 'input',
            name: keyUserPromptNames.keyUserUsername,
            message: t('prompts.usernameLabel'),
            default: options?.default ?? '',
            filter: (val: string): string => val.trim(),
            guiOptions: {
                mandatory: true
            },
            when: (answers: KeyUserImportAnswers) => !!answers.keyUserSystem && this.isAuthRequired,
            validate: (value: string) => validateEmptyString(value)
        } as InputQuestion<KeyUserImportAnswers>;
    }

    /**
     * Returns the password prompt.
     *
     * @param {KeyUserPasswordPromptOptions} [options] - The options for the password prompt.
     * @returns {KeyUserImportQuestion} The password prompt.
     */
    private getPasswordPrompt(options?: KeyUserPasswordPromptOptions): KeyUserImportQuestion {
        return {
            type: 'password',
            name: keyUserPromptNames.keyUserPassword,
            message: t('prompts.passwordLabel'),
            mask: '*',
            default: options?.default ?? '',
            guiOptions: {
                mandatory: true,
                type: 'login'
            },
            when: (answers: KeyUserImportAnswers) => !!answers.keyUserSystem && this.isAuthRequired,
            validate: async (value: string, answers: KeyUserImportAnswers) =>
                await this.validatePassword(value, answers)
        } as PasswordQuestion<KeyUserImportAnswers>;
    }

    /**
     * Returns the adaptation prompt.
     *
     * @param {KeyUserAdaptationPromptOptions} [_] - The options for the adaptation prompt.
     * @returns {KeyUserImportQuestion} The adaptation prompt.
     */
    private getAdaptationPrompt(_?: KeyUserAdaptationPromptOptions): KeyUserImportQuestion {
        return {
            type: 'list',
            name: keyUserPromptNames.keyUserAdaptation,
            message: t('prompts.keyUserAdaptationLabel'),
            guiOptions: {
                mandatory: true,
                breadcrumb: t('prompts.keyUserAdaptationBreadcrumb')
            },
            choices: () => getAdaptationChoices(this.adaptations),
            default: () => getAdaptationChoices(this.adaptations)[0]?.name,
            validate: async (adaptation: AdaptationDescriptor) => await this.validateKeyUserChanges(adaptation?.id),
            when: () => this.adaptations.length > 1
        } as ListQuestion<KeyUserImportAnswers>;
    }

    /**
     * Loads adaptations for the current provider.
     */
    private async loadAdaptations(): Promise<void> {
        const version = determineFlexVersion(this.flexVersions);
        const lrep = this.provider?.getLayeredRepository();
        const response = await lrep?.listAdaptations(this.componentId, version);
        this.adaptations = response?.adaptations ?? [];
        this.logger.log(`Loaded adaptations: ${JSON.stringify(this.adaptations, null, 2)}`);
        if (!this.adaptations.length) {
            throw new Error(t('error.keyUserNoAdaptations'));
        }
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
     * Resets the state by clearing adaptations, flex versions, and key-user changes.
     */
    private resetState(): void {
        this.flexVersions = [];
        this.adaptations = [];
        this.keyUserChanges = [];
    }

    /**
     * Loads flex versions and adaptations, then validates key-user changes if only DEFAULT adaptation exists.
     *
     * @returns The result of key-user validation if only DEFAULT exists, or true.
     */
    private async loadDataAndValidateKeyUserChanges(): Promise<string | boolean> {
        /**
         * Ensure provider is authenticated for CloudReady systems before making API calls
         */
        await this.provider.isAbapCloud();

        await this.loadFlexVersions();
        await this.loadAdaptations();

        if (this.adaptations.length === 1 && this.adaptations[0]?.id === DEFAULT_ADAPTATION_ID) {
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

        try {
            this.resetState();
            if (system === this.defaultSystem && this.defaultProvider) {
                this.provider = this.defaultProvider;
                this.isAuthRequired = false;
                return await this.loadDataAndValidateKeyUserChanges();
            }

            this.isAuthRequired = await this.systemLookup.getSystemRequiresAuth(system);
            if (!this.isAuthRequired) {
                const options = {
                    system,
                    client: undefined,
                    username: answers.keyUserUsername,
                    password: answers.keyUserPassword
                };
                this.provider = await getConfiguredProvider(options, this.logger);
                return await this.loadDataAndValidateKeyUserChanges();
            }
        } catch (e) {
            return e.message;
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
            this.resetState();
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
    private async validateKeyUserChanges(adaptationId: string | undefined): Promise<string | boolean> {
        try {
            if (!this.provider || !adaptationId) {
                return false;
            }

            const lrep = this.provider?.getLayeredRepository();
            const data = await lrep?.getKeyUserData(this.componentId, adaptationId);
            this.keyUserChanges = data?.contents ?? [];
            this.logger.debug(
                `Retrieved ${this.keyUserChanges.length} key-user change(s) for adaptation ${adaptationId}`
            );

            if (!this.keyUserChanges.length) {
                if (adaptationId === DEFAULT_ADAPTATION_ID && this.adaptations.length === 1) {
                    return t('error.keyUserNoChangesDefault');
                }
                this.logger.warn(`No key-user changes found for adaptation: ${adaptationId}`);
                return t('error.keyUserNoChangesAdaptation', { adaptationId });
            }

            return true;
        } catch (e) {
            this.logger.error(`Error validating key-user changes for adaptation ${adaptationId}: ${e.message}`);
            this.logger.debug(e);

            if (isAxiosError(e) && (e.response?.status === 405 || e.response?.status === 404)) {
                return t('error.keyUserNotSupported');
            }

            return e.message;
        }
    }
}
