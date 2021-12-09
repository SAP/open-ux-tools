/** Wraps `Error`. Used as base class for other specific errors */
export abstract class BaseError extends Error {
    public readonly cause: Error;

    constructor(message: string, cause?: Error) {
        super(message);
        this.cause = cause;
        this.name = this.constructor.name;
    }
}
export class ConnectionError extends BaseError {}
export class TimeoutError extends BaseError {}
export class UAATimeoutError extends TimeoutError {}
