/**
 * Returns the Error if the error is an instance of `Error` otherwise a string representation of the error.
 *
 * @param error {Error | unknown} - the error instance
 * @returns {Error | string} the error
 */
export function getError(error: Error | unknown): Error | string {
    return error instanceof Error ? error : JSON.stringify(error);
}

/**
 * Returns error message.
 * @param e {Error | unknown} - the error instance
 * @returns {string} error message
 */
export function getErrorMessage(e: Error | unknown): string {
    const error = getError(e);
    return error instanceof Error ? error.message : error;
}
