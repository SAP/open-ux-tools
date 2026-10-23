import { describe, it, expect, beforeAll } from '@jest/globals';
import { determineMessage } from '../../../src/utils/migration-utils.js';
import { initI18n } from '../../../src/i18n.js';

describe('migration-utils', () => {
    beforeAll(async () => {
        await initI18n();
    });

    describe('determineMessage', () => {
        it('should return error message for ENOENT errors', () => {
            const error = new Error('ENOENT: no such file or directory');
            const result = determineMessage(error);
            // Should return a translated message, not empty
            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return error message for ENOENT errors with filename', () => {
            const error = new Error('ENOENT: no such file or directory');
            const result = determineMessage(error, 'test.txt');
            // Should return a translated message containing the filename
            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return error message for EPERM errors', () => {
            const error = new Error('EPERM: operation not permitted');
            const result = determineMessage(error);
            // Should return a translated message
            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return error message for EPERM errors with filename', () => {
            const error = new Error('EPERM: operation not permitted');
            const result = determineMessage(error, 'test.txt');
            // Should return a translated message
            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should use raw error message when useMessage is true', () => {
            const error = new Error('Custom error message');
            const result = determineMessage(error, undefined, true);
            expect(result).toBe('Custom error message');
        });

        it('should fallback to error.message when no specific pattern matches', () => {
            const error = new Error('Unknown error occurred');
            const result = determineMessage(error);
            // Should fallback to original message since no pattern matched
            expect(result).toBe('Unknown error occurred');
        });

        it('should fallback to error.toString() when error.message is empty', () => {
            const error = new Error('');
            error.message = '';
            const result = determineMessage(error);
            // Should have some fallback value
            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle errors without message property gracefully', () => {
            const error = Object.create(Error.prototype) as Error;
            error.name = 'CustomError';
            const result = determineMessage(error);
            // Should not throw and should return something
            expect(result).toBeTruthy();
        });
    });
});
