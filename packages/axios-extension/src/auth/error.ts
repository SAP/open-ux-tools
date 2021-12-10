import { AxiosResponse } from 'axios';

/** Wraps `Error`. Used as base class for other specific errors */
export abstract class BaseError<T> extends Error {
    public readonly cause: T;

    constructor(message: string, cause?: T) {
        super(message);
        this.cause = cause;
        this.name = this.constructor.name;
    }
}
export class ConnectionError extends BaseError<AxiosResponse> {}
export class TimeoutError extends BaseError<Error> {}
export class UAATimeoutError extends TimeoutError {}
