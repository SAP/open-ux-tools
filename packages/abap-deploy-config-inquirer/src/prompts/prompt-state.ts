import type { AbapDeployConfigAnswers, TransportAnswers } from '../types';

/**
 * Much of the values returned by the config inquirer prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 */
export class PromptState {
    private static _abapDeployConfig: Partial<AbapDeployConfigAnswers> = {};
    private static _transportAnswers: TransportAnswers = {};
    private static _isYUI = false;

    /**
     * Returns the current state of the abap deploy config answers.
     *
     * @returns {Partial<AbapDeployConfigAnswers>} abap deploy config answers
     */
    public static get abapDeployConfig(): Partial<AbapDeployConfigAnswers> {
        return this._abapDeployConfig;
    }

    /**
     * Returns the current state of the transport answers.
     *
     * @returns {TransportAnswers} transport answers
     */
    public static get transportAnswers(): TransportAnswers {
        return this._transportAnswers;
    }

    /**
     * Returns whether the prompting is running in YUI.
     *
     * @returns {boolean} true if running in YUI
     */
    public static get isYUI(): boolean {
        return this._isYUI;
    }

    /**
     * Sets the current state of the abap deploy config answers.
     *
     * @param {Partial<AbapDeployConfigAnswers>} value - abap deploy config
     */
    public static set abapDeployConfig(value: Partial<AbapDeployConfigAnswers>) {
        this._abapDeployConfig = value;
    }

    /**
     * Sets the current state of the transport answers.
     *
     * @param {TransportAnswers} value - transport answers
     */
    public static set transportAnswers(value: TransportAnswers) {
        this._transportAnswers = value;
    }

    /**
     * Sets the YUI property.
     *
     * @param {boolean} value - if running in YUI
     */
    public static set isYUI(value: boolean) {
        this._isYUI = value;
    }

    static resetAbapDeployConfig(): void {
        Object.keys(PromptState._abapDeployConfig).forEach((key) => {
            PromptState._abapDeployConfig[key as keyof AbapDeployConfigAnswers] = undefined;
        });
    }

    static resetTransportAnswers(): void {
        Object.keys(PromptState._transportAnswers).forEach((key) => {
            PromptState._transportAnswers[key as keyof TransportAnswers] = undefined;
        });
    }
}
