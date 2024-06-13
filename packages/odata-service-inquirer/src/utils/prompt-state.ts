import type { OdataServiceAnswers } from '../types';

/**
 * Much of the values returned by the service inquirer prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 *
 */
export class PromptState {
    public static odataService: Partial<OdataServiceAnswers> = {};

    public static isYUI = false;

    static reset(): void {
        // Reset all values in the odataService object, do not reset the object reference itself as it may be used by external consumers
        Object.keys(PromptState.odataService).forEach((key) => {
            PromptState.odataService[key as keyof OdataServiceAnswers] = undefined;
        });
    }
}
