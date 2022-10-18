import type { AxiosError } from 'axios';

/**
 * Casts an unknown error to an AxiosError.
 *
 * @param e unknown error
 * @returns exception casted to AxiosError if it is one
 */
 export function isAxiosError(e: unknown): e is AxiosError {
    return typeof e === 'object' && e !== null && 'isAxiosError' in e;
}

/**
 * Interface describing the structure of an odata error.
 */
export interface ODataError {
    '@SAP__common.ExceptionCategory'?: string;
    code: string;
    message: string;
}

/**
 * Error object that is to be thrown if an OData service responds with an error
 */
export class ODataRequestError extends Error {
    /**
     *
     * @param odata odata object
     * @returns boolean
     */
    static containsError(odata: unknown): boolean {
        if (odata?.['error']) {
            return true;
        } else {
            return false;
        }
    }

    /**
     *
     * @param responseData response Data
     */
    constructor(responseData: unknown) {
        const error: ODataError = responseData['error'];
        super(`${error.message} (${error.code})`);
    }
}
