import type { AbapDeployConfigAnswersInternal, TransportAnswers } from '../types';

/**
 * Much of the values returned by the config inquirer prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 */
export class PromptState {
    private static _abapDeployConfig: Partial<AbapDeployConfigAnswersInternal> = {};
    private static _transportAnswers: TransportAnswers = {
        transportRequired: true // assumed to be required unless the package is local
    };

    public static isYUI = false;

    /**
     * Returns the current state of the abap deploy config answers.
     *
     * @returns {Partial<AbapDeployConfigAnswersInternal>} abap deploy config answers
     */
    public static get abapDeployConfig(): Partial<AbapDeployConfigAnswersInternal> {
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
     * Sets the current state of the abap deploy config answers.
     *
     * @param {Partial<AbapDeployConfigAnswersInternal>} value - abap deploy config
     */
    public static set abapDeployConfig(value: Partial<AbapDeployConfigAnswersInternal>) {
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

    static resetAbapDeployConfig(): void {
        Object.keys(PromptState._abapDeployConfig).forEach((key) => {
            PromptState._abapDeployConfig[key as keyof AbapDeployConfigAnswersInternal] = undefined;
        });
    }

    static resetTransportAnswers(): void {
        Object.keys(PromptState._transportAnswers).forEach((key) => {
            PromptState._transportAnswers[key as keyof TransportAnswers] = undefined;
        });
    }
}
