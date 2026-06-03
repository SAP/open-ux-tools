import { jest } from '@jest/globals';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockInstance = {
    init: jest.fn(),
    t: jest.fn(),
    addResourceBundle: jest.fn()
};
jest.unstable_mockModule('i18next', () => ({
    default: {
        createInstance: () => mockInstance
    },
    createInstance: () => mockInstance
}));

const { initI18n, t, i18n } = await import('../../src/i18n');

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
            ns: ['adp-tooling'],
            showSupportNotice: false
        });
    });

    test('t', async () => {
        t('test');
        expect(i18n.t).toHaveBeenCalledWith('test', { ns: 'adp-tooling' });
    });
});
