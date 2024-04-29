import type { OdataServiceAnswers } from '../types';

/**
 * Much of the values returned by the service inquirer prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 *
 */
export class PromptState {
    static odataService: Partial<OdataServiceAnswers> = {};
    static isYUI = false;
    static reset(): void {
        PromptState.odataService = {};
    }
}
