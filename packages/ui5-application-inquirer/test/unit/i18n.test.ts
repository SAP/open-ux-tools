import { jest } from '@jest/globals';

const mockAddi18nResourceBundle = jest.fn();
jest.unstable_mockModule('@sap-ux/inquirer-common', () => ({
    addi18nResourceBundle: mockAddi18nResourceBundle
}));

const mockAddi18nResourceBundleProjectInputValidator = jest.fn();
jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    addi18nResourceBundle: mockAddi18nResourceBundleProjectInputValidator
}));

const mockInit = jest.fn();
const mockT = jest.fn();
const mockAddResourceBundle = jest.fn();
jest.unstable_mockModule('i18next', () => ({
    default: {
        createInstance: () => ({
            init: mockInit,
            t: mockT,
            addResourceBundle: mockAddResourceBundle
        })
    }
}));

const { initI18nUi5AppInquirer, t, i18n } = await import('../../src/i18n');

describe('i18n', () => {
    test('initI18n', async () => {
        await initI18nUi5AppInquirer();
        expect(mockInit).toHaveBeenCalled();
        expect(mockAddi18nResourceBundle).toHaveBeenCalled();
    });

    test('t', async () => {
        t('test');
        expect(mockT).toHaveBeenCalledWith('test', { ns: 'ui5-application-inquirer' });
    });
});
