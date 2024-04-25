import MessageToast from 'sap/m/MessageToast';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

export interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
}

export interface FragmentChange {
    content: {
        fragmentPath: string;
    };
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

/**
 * Checks if the fragment name associated with a command matches the specified fragment name.
 *
 * @param {FlexCommand} command - The command object containing the prepared change to be examined.
 * @param {string} fragmentName - The name of the fragment to match against the command's change.
 * @returns {boolean} Returns true if the command's change contains a fragment path that matches
 *                    the specified fragment name; otherwise, returns false.
 */
export function matchesFragmentName(command: FlexCommand, fragmentName: string): boolean {
    const change = command.getPreparedChange().getDefinition() as unknown as FragmentChange;
    return change.content?.fragmentPath?.includes(`${fragmentName}.fragment.xml`) || false;
}

/**
 * Displays a message to the user indicating that an XML fragment will be created upon saving a change.
 *
 * @param {string} message - The message to be shown in the message toast.
 * @param {number} duration - The duration during which message toast will be active.
 */
export function notifyUser(message: string, duration: number = 5000) {
    MessageToast.show(message, {
        duration
    });
}
