/**
 * Successful result with data.
 *
 * @template T Data type
 */
export type Success<T> = { success: true; data: T };

/**
 * Error result with message and optional code.
 *
 * @template ErrorCode Error code type
 */
export type Error<ErrorCode = string> = { success: false; message: string; code?: ErrorCode };

/**
 * Union type representing either success or error.
 *
 * @template T Data type for success case
 * @template ErrorCode Error code type for error case
 */
export type Result<T, ErrorCode = string> = Success<T> | Error<ErrorCode>;

/**
 * Creates a success result.
 *
 * @template T Data type
 * @param data The success data
 * @returns Success result
 */
export function success<T>(data: T): Success<T> {
    return { success: true, data };
}

/**
 * Creates an error result.
 *
 * @template ErrorCode Error code type
 * @param message Error message
 * @param code Optional error code
 * @returns Error result
 */
export function error<ErrorCode = string>(message: string, code?: ErrorCode): Error<ErrorCode> {
    return code !== undefined ? { success: false, message, code } : { success: false, message };
}
