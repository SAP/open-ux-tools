/**
 * Returns the Error if the error is an instance of `Error` otherwise a new Error instance with string representation of the error.
 *
 * @param error {Error | unknown} - the error instance
 * @returns {Error} the error
 */
export function getError(error: Error | unknown): Error {
    return error instanceof Error ? error : new Error(JSON.stringify(error));
}
