import { t } from '../src/i18n';
import {
    validateClient,
    validateUrl,
    validateEmptyString,
    validateEmptySpaces,
    validateJSON,
    validateSpecialChars
} from '../src/general/validators';

describe('project input validators', () => {
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
