/**
 * Returns a function which calls the callback function only after the specified idle time
 * Works similar to the Debounce operator from rxjs https://reactivex.io/documentation/operators/debounce.html link.
 *
 * @param callback Function to execute
 * @param delay Idle period in milliseconds after which the callback will be executed
 * @returns A wrapper function that should be called to invoke the callback function after delay
 */
export function debounce<T extends []>(callback: (...args: T) => void, delay: number): (...args: T) => void {
    let timerId: NodeJS.Timeout;
    return (...args: T): void => {
        clearTimeout(timerId);

        timerId = setTimeout(() => {
            callback(...args);
        }, delay) as unknown as NodeJS.Timeout;
    };
}
