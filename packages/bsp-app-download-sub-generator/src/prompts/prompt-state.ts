import type { SystemSelectionAnswers } from '../app/types';

/**
 * Much of the values returned by the bsp app downloader prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 *
 */
export class PromptState {
    private static _systemSelection: SystemSelectionAnswers = {};

    /**
     * Returns the current state of the service config.
     *
     * @returns {SystemSelectionAnswers} service config
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

    static reset(): void {
        PromptState.systemSelection = {};
    }
}
