import { t } from '../../../src/utils/i18n';

describe('Test i18n', () => {
    // Undefined interpolation properties should output as empty strings
    test('Undefined interpolation properties', () => {
        expect(t('floorplans.label.basic')).toEqual(`Basic`);
        expect(t('floorplans.label.basic', { odataVersion: '4' })).toEqual(`Basic V4`);
    });
});
