import { isOfflineError } from '../../../src/ui5/network';
import type { NetworkError } from '../../../src/types';

describe('network utilities', () => {
    describe('isOfflineError', () => {
        it('should return true for "fetch failed" error', () => {
            const error = new Error('fetch failed');
            expect(isOfflineError(error)).toBe(true);
        });

        it('should return true for "Failed to fetch" error', () => {
            const error = new Error('Failed to fetch');
            expect(isOfflineError(error)).toBe(true);
        });

        it('should return true for "NetworkError" error', () => {
            const error = new Error('NetworkError');
            expect(isOfflineError(error)).toBe(true);
        });

        it('should return true for "getaddrinfo ENOTFOUND" error', () => {
            const error = new Error('getaddrinfo ENOTFOUND');
            expect(isOfflineError(error)).toBe(true);
        });

        it('should return true when error name contains network error', () => {
            const error = new Error('Some error message');
            error.name = 'NetworkError';
            expect(isOfflineError(error)).toBe(true);
        });

        it('should return true for partial matches in error message', () => {
            const error = new Error('Something went wrong: fetch failed due to network issues');
            expect(isOfflineError(error)).toBe(true);
        });

        it('should return false for non-network errors', () => {
            const error = new Error('Validation failed');
            expect(isOfflineError(error)).toBe(false);
        });

        it('should return false for HTTP status errors', () => {
            const error = new Error('HTTP 404 Not Found');
            expect(isOfflineError(error)).toBe(false);
        });

        it('should return false for authentication errors', () => {
            const error = new Error('HTTP 401 Unauthorized');
            expect(isOfflineError(error)).toBe(false);
        });

        it('should return false for server errors', () => {
            const error = new Error('HTTP 500 Internal Server Error');
            expect(isOfflineError(error)).toBe(false);
        });

        it('should return false for empty error message', () => {
            const error = new Error('');
            expect(isOfflineError(error)).toBe(false);
        });

        it('should return false for undefined error message', () => {
            const error = new Error();
            expect(isOfflineError(error)).toBe(false);
        });

        it('should return false for null error message', () => {
            const error = { message: null, name: null } as unknown as NetworkError;
            expect(isOfflineError(error)).toBe(false);
        });

        it('should handle error with only name property', () => {
            const error = { name: 'NetworkError' } as NetworkError;
            expect(isOfflineError(error)).toBe(true);
        });

        it('should handle error with only message property', () => {
            const error = { message: 'fetch failed' } as NetworkError;
            expect(isOfflineError(error)).toBe(true);
        });

        it('should handle error with code property', () => {
            const error = { code: 'ENOTFOUND' } as NetworkError;
            expect(isOfflineError(error)).toBe(true);
        });

        it('should return false for similar but non-matching errors', () => {
            const error = new Error('fetching data');
            expect(isOfflineError(error)).toBe(false);
        });

        it('should return false for "ERR_CONNECTION_REFUSED" (browser-specific)', () => {
            const error = new Error('ERR_CONNECTION_REFUSED');
            expect(isOfflineError(error)).toBe(false);
        });
    });
});
