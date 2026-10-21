/**
 * Executes a promise with a timeout, returning a fallback value if the promise
 * takes longer than the specified timeout or throws an error.
 *
 * @param promiseFactory - Function that returns the promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param fallbackValue - Value to return on timeout or error
 * @returns Promise resolving to either the original result or fallback
 */
export async function withTimeoutAndFallback<T>(
    promiseFactory: () => Promise<T>,
    timeoutMs: number,
    fallbackValue: T
): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
        const result = await Promise.race([promiseFactory(), timeoutPromise]);

        // Clear timeout on success
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }

        return result;
    } catch (error: unknown) {
        // Clear timeout on error
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }

        // Catch both timeout rejection and any promise errors to return a safe fallback.
        // This prevents the timeout from hanging indefinitely and allows callers to proceed
        // with a default value when network/CDN requests fail or timeout expires.
        return fallbackValue;
    }
}
