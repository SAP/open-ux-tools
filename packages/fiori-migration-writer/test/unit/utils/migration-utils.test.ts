import { describe, it, expect, beforeAll } from '@jest/globals';
import { determineMessage, MigrationError } from '../../../src/utils/migration-utils.js';
import { initI18n } from '../../../src/index.js';

describe('determineMessage', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('falls back to the original error message when no specialized message applies', () => {
        expect(determineMessage(new Error('Something unexpected happened'))).toBe('Something unexpected happened');
    });

    it('falls back to error.toString() when the error message is empty', () => {
        const error = new Error('');
        error.name = 'CustomError';
        expect(determineMessage(error)).toBe('CustomError');
    });

    it('returns the raw message when useMessage is set', () => {
        expect(determineMessage(new Error('raw message'), undefined, true)).toBe('raw message');
    });

    it('returns a specialized message for syntax errors instead of the raw message', () => {
        const error = new SyntaxError('Unexpected token } in JSON');
        const message = determineMessage(error);
        expect(message).toBeTruthy();
        expect(message).not.toBe(error.message);
    });

    it('returns a specialized message for permission errors instead of the raw message', () => {
        const error = new Error('EPERM: operation not permitted');
        const message = determineMessage(error);
        expect(message).toBeTruthy();
        expect(message).not.toBe(error.message);
    });

    it('returns a file-specific message when a filename is provided', () => {
        const message = determineMessage(new Error('read failed'), 'manifest.json');
        expect(message).toContain('manifest.json');
    });

    it('always returns a non-empty string', () => {
        expect(determineMessage(new Error('x'))).not.toBe('');
    });
});

describe('MigrationError', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('preserves the original message when no specialized message applies', () => {
        const error = new MigrationError(new Error('plain failure'));
        expect(error.name).toBe('MigrationError');
        expect(error.message).toBe('plain failure');
    });

    it('wraps non-Error values using their string representation', () => {
        expect(new MigrationError('string failure').message).toBe('string failure');
    });
});
