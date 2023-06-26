import type { AxiosResponse } from 'axios';

/** Wraps `Error`. Used as base class for other specific errors */
export abstract class BaseError<T> extends Error {
    public readonly cause: T;

    /**
     * Constructor taking a message and any object.
     *
     * @param message human readable error message
     * @param cause object causing the issue
     */
    constructor(message: string, cause?: T) {
        super(message);
        this.cause = cause;
        this.name = this.constructor.name;
    }
}
/**
 * Error representing a connection problem.
 */
export class ConnectionError extends BaseError<AxiosResponse> {}

/**
 * Error representing a timeout.
 */
export class TimeoutError extends BaseError<Error> {}

/**
 * Error representing a timeout from a UAA service.
 */
export class UAATimeoutError extends TimeoutError {}
