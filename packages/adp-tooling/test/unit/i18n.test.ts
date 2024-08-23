import * as mockI18next from 'i18next';
import { initI18n, t } from '../../src/i18n';

jest.mock('i18next');

describe('i18n', () => {
    test('initI18n', async () => {
        const initSpy = jest.spyOn(mockI18next, 'init');
        await initI18n();
        expect(initSpy).toHaveBeenCalledWith({
            resources: {
                en: expect.anything()
            },
            lng: 'en',
            fallbackLng: 'en',
            defaultNS: 'adp-tooling',
            ns: ['adp-tooling']
        });
    });

    test('t', async () => {
        const tSpy = jest.spyOn(mockI18next, 't');
        t('test');
        expect(tSpy).toHaveBeenCalledWith('test', { ns: 'adp-tooling' });
    });
});
