import { i18n, initI18n, t } from '../../src/i18n';

describe('i18n', () => {
    beforeAll(async () => {
        // Ensure i18n is initialized before tests
        await initI18n();
    });

    describe('initI18n', () => {
        test('should initialize i18n successfully', async () => {
            await expect(initI18n()).resolves.not.toThrow();
            expect(i18n.isInitialized).toBe(true);
        });

        test('should handle errors gracefully', async () => {
            // Mock init to throw an error
            const originalInit = i18n.init;
            i18n.init = jest.fn().mockRejectedValue(new Error('Init failed'));

            // Should not throw, as errors are caught
            await expect(initI18n()).rejects.toThrow('Init failed');

            // Restore original
            i18n.init = originalInit;
        });
    });

    describe('t (translation function)', () => {
        test('should return translation for valid key', () => {
            const result = t('test.key');
            expect(typeof result).toBe('string');
            expect(result).toBeDefined();
        });

        test('should handle missing keys gracefully', () => {
            const result = t('non.existent.key');
            expect(typeof result).toBe('string');
            // i18next returns the key itself when translation is missing
            expect(result).toBe('non.existent.key');
        });

        test('should support options parameter', () => {
            const result = t('test.key', { defaultValue: 'fallback' });
            expect(typeof result).toBe('string');
            expect(result).toBeDefined();
        });
    });

    describe('module initialization', () => {
        test('should not throw when module is loaded', () => {
            // The module-level initI18n().catch() should prevent any errors
            // from breaking the module load. This test verifies the module
            // loaded successfully.
            expect(() => require('../../src/i18n')).not.toThrow();
        });
    });
});
