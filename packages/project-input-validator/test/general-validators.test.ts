import { t } from '../src/i18n';
import { validateClient, validateUrl } from '../src/general/validators';

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
});
