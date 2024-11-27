import {
    validateClient,
    validateUrl,
    validateEmptyString,
    validateEmptySpaces,
    validateJSON,
    validateSpecialChars,
    validateMaxLength,
    validateAllowedCharacters
} from '../src/general/validators';
import { initI18nProjectValidators, t } from '../src/i18n';

describe('project input validators', () => {
    beforeAll(async () => {
        await initI18nProjectValidators();
    });

    describe('validateClient', () => {
        test('validateClient - valid client', () => {
            const output = validateClient('001');
            expect(output).toEqual(true);
        });

        test('validateClient - default empty is valid', () => {
            const output = validateClient('');
            expect(output).toEqual(true);
        });

        test('validateClient - valid client empty space', () => {
            const output = validateClient(' ');
            expect(output).toEqual(true);
        });

        test('validateClient - valid client undefine', () => {
            const output = validateClient(undefined as any);
            expect(output).toEqual(true);
        });

        test('validateClient - invalid if not 3 digits', () => {
            const client = '01';
            const output = validateClient(client);
            expect(output).toContain(t('general.invalidClient', { client }));
        });
    });

    describe('validateUrl', () => {
        test('validateUrl - valid url', () => {
            const output = validateUrl('https://test.dev');
            expect(output).toEqual(true);
        });

        test('validateUrl - invalid url', () => {
            const url = 'https//test.dev';
            const output = validateUrl(url);
            expect(output).toContain(t('general.invalidUrl', { input: url }));
        });
    });

    describe('validateEmptyString', () => {
        test('validateEmptyString - valid input', () => {
            const output = validateEmptyString('test');
            expect(output).toEqual(true);
        });

        test('validateEmptyString - invalid empty input', () => {
            const output = validateEmptyString('');
            expect(output).toContain(t('general.inputCannotBeEmpty'));
        });
    });

    describe('validateEmptySpaces', () => {
        test('validateEmptySpaces - valid input', () => {
            const output = validateEmptySpaces('test');
            expect(output).toEqual(true);
        });

        test('validateEmptySpaces - invalid input with spaces', () => {
            const output = validateEmptySpaces('test test');
            expect(output).toContain(t('general.inputCannotHaveSpaces'));
        });
    });

    describe('validateJSON', () => {
        test('validateJSON - valid JSON', () => {
            const output = validateJSON('"test": "test"');
            expect(output).toEqual(true);
        });

        test('validateJSON - invalid JSON', () => {
            const output = validateJSON('"test: "test"');
            expect(output).toContain(t('general.invalidJSON'));
        });
    });

    describe('validateMaxLength', () => {
        it('should return true if the value does not exceed the maxLength', () => {
            const result = validateMaxLength('Hello', 10);
            expect(result).toBe(true);
        });

        it('should return true if maxLength is 0 (no length validation)', () => {
            const result = validateMaxLength('Hello', 0);
            expect(result).toBe(true);
        });

        it('should return an error message if the value exceeds the maxLength', () => {
            const result = validateMaxLength('Hello, World!', 5);
            expect(result).toBe(t('general.maxLength', { maxLength: 5 }));
        });
    });

    describe('validateAllowedCharacters', () => {
        it('should return true if the value contains only alphanumeric characters', () => {
            const result = validateAllowedCharacters('Hello123');
            expect(result).toBe(true);
        });

        it('should return true if the value contains allowed special characters', () => {
            const result = validateAllowedCharacters('Hello_123', ['_']);
            expect(result).toBe(true);
        });

        it('should return an error message if the value contains unsupported characters', () => {
            const result = validateAllowedCharacters('Hello@123', ['_']);
            expect(result).toBe(t('general.supportedFormats', { allowedCharacters: ['_'] }));
        });

        it('should return true if allowedCharacters is undefined', () => {
            const result = validateAllowedCharacters('Hello123');
            expect(result).toBe(true);
        });
    });

    describe('validateSpecialChars', () => {
        test('validateSpecialChars - valid input', () => {
            const output = validateSpecialChars('test');
            expect(output).toEqual(true);
        });

        test('validateSpecialChars - invalid input with special chars', () => {
            const output = validateSpecialChars('test@');
            expect(output).toContain(t('general.invalidValueForSpecialChars'));
        });
    });
});
