import { initI18n, t } from '../src/i18n.js';

describe('Test i18n', () => {
    beforeAll(async () => {
        await initI18n();
    });

    // Undefined interpolation properties should output as empty strings
    test('Undefined interpolation properties', () => {
        expect(t('floorplans.label.basic')).toEqual(`Basic`);
        expect(t('floorplans.label.basic', { odataVersion: '4' })).toEqual(`Basic V4`);
    });
});
