/**
 * Returns the Error if the error is an instance of `Error` otherwise a new Error instance with string representation of the error.
 *
 * @param error {unknown} - the error instance
 * @returns {Error} the error
 */
export function getError(error: unknown): Error {
    return error instanceof Error ? error : new Error(JSON.stringify(error));
}

export class FetchError extends Error {
    readonly status: number;

    constructor(response: Response) {
        super(`Fetch error: ${response.url}, ${response.status} - ${response.statusText}`);
        this.status = response.status;
    }
}
