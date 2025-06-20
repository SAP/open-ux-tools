/**
 * Returns a function which calls the callback function only after the specified idle time.
 *
 * @param callback Function to execute
 * @param delay Idle period in milliseconds after which the callback will be executed
 * @returns A wrapper function that should be called to invoke the callback function after delay
 */
export function debounce<T extends unknown[]>(callback: (...args: T) => void, delay: number): (...args: T) => void {
    let timerId: number;
    return (...args: T): void => {
        clearTimeout(timerId);

        timerId = window.setTimeout(() => {
            callback(...args);
        }, delay);
    };
}
