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

        // Exception is intentionally caught and suppressed to return fallback value.
        // This utility's purpose is to provide graceful degradation when operations fail:
        // - Timeout rejection: CDN/network requests taking too long
        // - Promise rejection: Network errors, invalid URLs, service unavailable
        // Callers expect a fallback value in all error scenarios, not exceptions to handle.
        // See ui5-version.ts for usage - migration continues with sensible defaults.
        return fallbackValue;
    }
}
