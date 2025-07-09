import { initI18n, t, i18n } from '../../src/i18n';
import * as mockInquirerCommon from '@sap-ux/inquirer-common';

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
        const initSpy = jest.spyOn(i18n, 'init');
        const addi18nResourceBundleSpy = jest.spyOn(mockInquirerCommon, 'addi18nResourceBundle');
        await initI18n();
        expect(initSpy).toHaveBeenCalled();
        expect(addi18nResourceBundleSpy).toHaveBeenCalled();
    });

    test('t', async () => {
        const tSpy = jest.spyOn(i18n, 't');
        t('test');
        expect(tSpy).toHaveBeenCalledWith('test', { ns: 'ui5-library-inquirer' });
    });
});
