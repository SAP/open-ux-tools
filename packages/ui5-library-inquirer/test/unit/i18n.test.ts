import { jest } from '@jest/globals';

const mockInit = jest.fn();
const mockT = jest.fn();
const mockAddResourceBundle = jest.fn();
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

const mockAddi18nResourceBundle = jest.fn();
jest.unstable_mockModule('@sap-ux/inquirer-common', () => ({
    addi18nResourceBundle: mockAddi18nResourceBundle
}));

const { initI18n, t, i18n } = await import('../../src/i18n');

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
