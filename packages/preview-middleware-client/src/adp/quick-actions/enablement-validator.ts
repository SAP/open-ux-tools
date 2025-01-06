export interface EnablementValidatorSuccess {
    type: 'success';
}

export interface EnablementValidatorError {
    type: 'error';
    message: string;
}

export type EnablementValidatorResult = undefined | EnablementValidatorError;

export interface EnablementValidator {
    /**
     * Checks if action can be executed.
     * @returns Validation result.
     */
    run: () => EnablementValidatorResult | Promise<EnablementValidatorResult>;
}
