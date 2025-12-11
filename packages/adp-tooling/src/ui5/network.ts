import type { NetworkError } from '../types';

/**
 * In VS Code extension host, we can't rely on navigator.onLine.
 * Focus on error messages that indicate network connectivity issues
 */
const networkErrorMessages = [
    'fetch failed',
    'Failed to fetch',
    'NetworkError',
    'ENOTFOUND', // DNS resolution failed (common in VS Code)
    'ECONNREFUSED', // Connection refused (can indicate network issues)
    'ETIMEDOUT', // Connection timeout
    'ENETUNREACH', // Network unreachable
    'getaddrinfo ENOTFOUND', // Node.js DNS error
    'connect ECONNREFUSED', // Node.js connection refused
    'connect ETIMEDOUT' // Node.js connection timeout
];

/**
 * Checks if the current environment is offline or has network connectivity issues.
 * This function is designed for VS Code's Yeoman UI environment where network
 * errors may differ from browser environments.
 *
 * @param {object} error - The error object from a failed fetch request.
 * @param {string} [error.message] - The error message string.
 * @param {string} [error.name] - The error name string.
 * @param {string} [error.code] - The error code string.
 * @returns {boolean} True if the error indicates offline/network issues.
 */
export function isOfflineError(error: NetworkError): boolean {
    return networkErrorMessages.some(
        (msg) => error.message?.includes(msg) || error.name?.includes(msg) || error.code?.includes(msg)
    );
}
