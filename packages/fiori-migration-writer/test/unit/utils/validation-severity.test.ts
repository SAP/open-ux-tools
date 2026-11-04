import { getMessageType, isStrictModeEnabled } from '../../../src/utils/validation-severity.js';

describe('validation-severity', () => {
    describe('getMessageType', () => {
        test('should return ERROR when default type is ERROR', () => {
            expect(getMessageType('ERROR', false, false)).toBe('ERROR');
            expect(getMessageType('ERROR', true, false)).toBe('ERROR');
            expect(getMessageType('ERROR', false, true)).toBe('ERROR');
            expect(getMessageType('ERROR', true, true)).toBe('ERROR');
        });

        test('should return ERROR when strict mode and critical', () => {
            expect(getMessageType('WARNING', true, true)).toBe('ERROR');
        });

        test('should return WARNING when strict mode but not critical', () => {
            expect(getMessageType('WARNING', true, false)).toBe('WARNING');
        });

        test('should return WARNING when not strict mode', () => {
            expect(getMessageType('WARNING', false, true)).toBe('WARNING');
            expect(getMessageType('WARNING', false, false)).toBe('WARNING');
        });

        test('should default isCritical to true', () => {
            expect(getMessageType('WARNING', true)).toBe('ERROR');
        });
    });

    describe('isStrictModeEnabled', () => {
        const originalEnv = process.env.FIORI_MIGRATION_STRICT;

        afterEach(() => {
            // Restore original env
            if (originalEnv === undefined) {
                delete process.env.FIORI_MIGRATION_STRICT;
            } else {
                process.env.FIORI_MIGRATION_STRICT = originalEnv;
            }
        });

        test('should return explicit parameter when provided', () => {
            expect(isStrictModeEnabled(true)).toBe(true);
            expect(isStrictModeEnabled(false)).toBe(false);
        });

        test('should check environment variable when no explicit parameter', () => {
            process.env.FIORI_MIGRATION_STRICT = 'true';
            expect(isStrictModeEnabled()).toBe(true);
        });

        test('should return false when env is not "true"', () => {
            process.env.FIORI_MIGRATION_STRICT = 'false';
            expect(isStrictModeEnabled()).toBe(false);

            process.env.FIORI_MIGRATION_STRICT = '';
            expect(isStrictModeEnabled()).toBe(false);
        });

        test('should default to false when no env and no explicit parameter', () => {
            delete process.env.FIORI_MIGRATION_STRICT;
            expect(isStrictModeEnabled()).toBe(false);
        });
    });
});
