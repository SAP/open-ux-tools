export interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
}

/**
 * Defers the resolution of the promise, stores resolve/reject functions so that they can be accessed at a later stage.
 *
 * @description A Deferred object contains an unresolved promise along with the functions to resolve or reject that promise.
 *
 * @returns {Deferred} Deferred object
 */
export function createDeferred<T>(): Deferred<T> {
    let resolve: Deferred<T>['resolve'] | null = null;
    let reject: Deferred<T>['reject'] | null = null;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    if (resolve === null || reject === null) {
        throw new Error('Failed to initialize resolve and reject functions.');
    }

    return { promise, resolve, reject };
}
