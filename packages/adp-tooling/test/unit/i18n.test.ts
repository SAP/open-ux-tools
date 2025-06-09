import { initI18n, t, i18n } from '../../src/i18n';

jest.mock('i18next', () => {
    const instance = {
        init: jest.fn(),
        t: jest.fn(),
        addResourceBundle: jest.fn()
    };
    return {
        createInstance: () => instance
    };
});

describe('i18n', () => {
    test('initI18n', async () => {
        await initI18n();
        expect(i18n.init).toHaveBeenCalledWith({
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
        t('test');
        expect(i18n.t).toHaveBeenCalledWith('test', { ns: 'adp-tooling' });
    });
});
