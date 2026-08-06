import { jest } from '@jest/globals';

const mockInit = jest.fn() as jest.Mock;
const mockT = jest.fn() as jest.Mock;
const mockAddResourceBundle = jest.fn() as jest.Mock;
const instance = {
    init: mockInit,
    t: mockT,
    addResourceBundle: mockAddResourceBundle
};

jest.unstable_mockModule('i18next', () => ({
    default: {
        createInstance: () => instance
    },
    createInstance: () => instance
}));

const mockAddi18nResourceBundle = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/inquirer-common', () => ({
    addi18nResourceBundle: mockAddi18nResourceBundle
}));

const { initI18n, t, i18n } = await import('../../src/i18n.js');

describe('i18n', () => {
    test('initI18n', async () => {
        await initI18n();
        expect(mockInit).toHaveBeenCalled();
        expect(mockAddi18nResourceBundle).toHaveBeenCalled();
    });

    test('t', async () => {
        t('test');
        expect(mockT).toHaveBeenCalledWith('test', { ns: 'ui5-library-inquirer' });
    });
});
