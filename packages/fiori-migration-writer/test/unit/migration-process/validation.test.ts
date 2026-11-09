import { describe, it, expect, beforeEach } from '@jest/globals';
import { checkForErrors, createMigrationErrorMessage } from '../../../src/migration-process/validation.js';
import type { Message } from '../../../src/types.js';
import { initI18n } from '../../../src/index.js';

describe('migration-process/validation', () => {
    beforeEach(async () => {
        await initI18n();
    });

    describe('checkForErrors', () => {
        it('should return true when no errors exist', () => {
            const messages: Message[] = [
                { type: 'WARNING', description: 'Warning message' },
                { type: 'INFO', description: 'Info message' }
            ];

            expect(checkForErrors(messages)).toBe(true);
        });

        it('should return false when errors exist', () => {
            const messages: Message[] = [
                { type: 'WARNING', description: 'Warning message' },
                { type: 'ERROR', description: 'Error message' }
            ];

            expect(checkForErrors(messages)).toBe(false);
        });

        it('should return true for empty messages array', () => {
            expect(checkForErrors([])).toBe(true);
        });

        it('should return false with multiple errors', () => {
            const messages: Message[] = [
                { type: 'ERROR', description: 'Error 1' },
                { type: 'ERROR', description: 'Error 2' }
            ];

            expect(checkForErrors(messages)).toBe(false);
        });
    });

    describe('createMigrationErrorMessage', () => {
        it('should format MigrationError correctly', () => {
            const error = { name: 'MigrationError', message: 'Migration failed' };

            const result = createMigrationErrorMessage(error);

            expect(result).toBe('Error copying common files: Migration failed');
        });

        it('should use error message for standard errors', () => {
            const error = new Error('Standard error');

            const result = createMigrationErrorMessage(error);

            expect(result).toContain('Error copying common files:');
            expect(result).toContain('Standard error');
        });

        it('should handle SyntaxError', () => {
            const error = new SyntaxError('Unexpected token');

            const result = createMigrationErrorMessage(error);

            expect(result).toContain('Error copying common files:');
        });

        it('should handle EPERM errors', () => {
            const error = new Error('EPERM: operation not permitted');

            const result = createMigrationErrorMessage(error);

            expect(result).toContain('Error copying common files:');
        });

        it('should handle error with toString', () => {
            const error = {
                name: 'CustomError',
                message: 'Custom message',
                toString: () => 'Custom toString'
            };

            const result = createMigrationErrorMessage(error);

            expect(result).toContain('Error copying common files:');
        });
    });
});
