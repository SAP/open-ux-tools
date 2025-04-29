import type { ServiceConfig, SystemSelectionAnswers } from '../types';

/**
 * Much of the values returned by the ui service inquirer prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 *
 */
export class PromptState {
    private static _systemSelection: SystemSelectionAnswers = {};
    private static _serviceConfig: ServiceConfig;

    /**
     * Returns the current state of the service config.
     *
     * @returns {ServiceConfig} service config
     */
    public static get systemSelection(): SystemSelectionAnswers {
        return this._systemSelection;
    }

    /**
     * Set the state of the system selection.
     *
     * @param {SystemSelectionAnswers} value - system selection value
     */
    public static set systemSelection(value: Partial<SystemSelectionAnswers>) {
        this._systemSelection = value;
    }

    /**
     * Returns the current state of the service config.
     *
     * @returns {ServiceConfig} service config
     */
    public static get serviceConfig(): ServiceConfig {
        return this._serviceConfig;
    }

    /**
     * Set the state of the service config.
     *
     * @param {ServiceConfig} value - service config value
     */
    public static set serviceConfig(value: ServiceConfig) {
        this._serviceConfig = value;
    }

    static reset(): void {
        PromptState.systemSelection = {};
        PromptState.serviceConfig = {
            content: '',
            serviceName: '',
            showDraftEnabled: false
        };
    }

    static resetConnectedSystem(): void {
        PromptState.systemSelection = {};
    }

    static resetServiceConfig(): void {
        PromptState.serviceConfig = {
            content: '',
            serviceName: '',
            showDraftEnabled: false
        };
    }
}
