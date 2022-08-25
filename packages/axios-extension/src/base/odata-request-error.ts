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
    static containsError(odata: unknown): boolean {
        if (odata?.['error']) {
            return true;
        } else {
            return false;
        }
    }

    constructor(responseData: unknown) {
        const error: ODataError = responseData['error'];
        super(`${error.message} (${error.code})`);
    }
}
