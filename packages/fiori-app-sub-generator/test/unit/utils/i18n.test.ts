import { t } from '../../../src/utils/i18n';

describe('Test i18n', () => {
    // Undefined interpolation properties should output as empty strings
    test('Undefined interpolation properties', () => {
        expect(t('ERROR_AUTHENTICATION')).toEqual(`Authentication incorrect `);
        expect(t('ERROR_AUTHENTICATION', { error: 'Something went wrong' })).toEqual(
            `Authentication incorrect Something went wrong`
        );
    });
});
