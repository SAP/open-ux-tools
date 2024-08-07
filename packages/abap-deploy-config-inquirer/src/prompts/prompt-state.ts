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

    public static get abapDeployConfig(): Partial<AbapDeployConfigAnswers> {
        return this._abapDeployConfig;
    }

    public static get transportAnswers(): TransportAnswers {
        return this._transportAnswers;
    }

    public static get isYUI(): boolean {
        return this._isYUI;
    }

    public static set abapDeployConfig(value: Partial<AbapDeployConfigAnswers>) {
        this._abapDeployConfig = value;
    }

    public static set transportAnswers(value: TransportAnswers) {
        this._transportAnswers = value;
    }

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
