import type { ServiceConfig, SystemSelectionAnswers } from '../types';

/**
 * Much of the values returned by the ui service inquirer prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 *
 */
export class PromptState {
    public static systemSelection: SystemSelectionAnswers = {};
    public static serviceConfig: ServiceConfig;

    static reset(): void {
        PromptState.systemSelection = {};
        PromptState.serviceConfig = {
            content: '',
            serviceName: ''
        };
    }

    static resetConnectedSystem(): void {
        PromptState.systemSelection = {};
    }

    static resetServiceConfig(): void {
        PromptState.serviceConfig = {
            content: '',
            serviceName: ''
        };
    }
}
