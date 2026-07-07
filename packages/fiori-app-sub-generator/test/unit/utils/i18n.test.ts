import { initI18nFioriAppSubGenerator, t } from '../../../src/utils/i18n.js';

describe('Test i18n', () => {
    beforeAll(async () => {
        await initI18nFioriAppSubGenerator();
    });
    // Undefined interpolation properties should output as empty strings
    test('Undefined interpolation properties', () => {
        expect(t('steps.flpConfig.description')).toEqual(`Configure SAP Fiori launchpad settings .`);
        expect(t('steps.flpConfig.description', { appFolderName: 'myApp' })).toEqual(
            `Configure SAP Fiori launchpad settings myApp.`
        );
    });
});
