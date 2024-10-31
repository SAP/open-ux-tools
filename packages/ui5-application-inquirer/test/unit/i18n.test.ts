import * as mockI18next from 'i18next';
import { initI18nUi5AppInquirer, t } from '../../src/i18n';
import * as mockInquirerCommon from '@sap-ux/inquirer-common';

jest.mock('i18next', () => ({
    ...jest.requireActual('i18next'),
    init: jest.fn(),
    addResourceBundle: jest.fn(),
    t: jest.fn()
}));

describe('i18n', () => {
    test('initI18n', async () => {
        const initSpy = jest.spyOn(mockI18next, 'init');
        const addi18nResourceBundleSpy = jest.spyOn(mockInquirerCommon, 'addi18nResourceBundle');
        await initI18nUi5AppInquirer();
        expect(initSpy).toHaveBeenCalled();
        expect(addi18nResourceBundleSpy).toHaveBeenCalled();
    });

    test('t', async () => {
        const tSpy = jest.spyOn(mockI18next, 't');
        t('test');
        expect(tSpy).toHaveBeenCalledWith('test', { ns: 'ui5-application-inquirer' });
    });
});
