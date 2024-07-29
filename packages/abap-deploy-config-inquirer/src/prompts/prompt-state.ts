import type { AbapDeployConfigAnswers, TransportAnswers } from '../types';

/**
 * Much of the values returned by the config inquirer prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 */
export class PromptState {
    public static abapDeployConfig: Partial<AbapDeployConfigAnswers> = {};

    public static transportAnswers: TransportAnswers = {};

    public static isYUI = false;

    static resetAbapDeployConfig(): void {
        // Reset all values in the abapDeployConfig object, do not reset the object reference itself as it may be used by external consumers
        Object.keys(PromptState.abapDeployConfig).forEach((key) => {
            PromptState.abapDeployConfig[key as keyof AbapDeployConfigAnswers] = undefined;
        });
    }

    static resetTransportAnswers(): void {
        Object.keys(PromptState.transportAnswers).forEach((key) => {
            PromptState.transportAnswers[key as keyof TransportAnswers] = undefined;
        });
    }
}
