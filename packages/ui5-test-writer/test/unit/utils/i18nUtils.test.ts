import { buildI18nLabelResolver, passthroughLabelResolver } from '../../../src/utils/i18nUtils.js';

describe('i18n label resolver', () => {
    test('passthroughLabelResolver returns the label unchanged', () => {
        expect(passthroughLabelResolver('My Action')).toEqual({ label: 'My Action', unresolved: false });
        expect(passthroughLabelResolver(undefined)).toEqual({ label: '', unresolved: false });
    });

    test('resolves an {i18n>key} placeholder from a model bundle', () => {
        const resolve = buildI18nLabelResolver({
            models: { i18n: { customAction1: [{ value: { value: 'My Custom Action 1' } }] } }
        });
        expect(resolve('{i18n>customAction1}')).toEqual({ label: 'My Custom Action 1', unresolved: false });
    });

    test('resolves a {{key}} placeholder from the sap.app bundle', () => {
        const resolve = buildI18nLabelResolver({
            'sap.app': { appTitle: [{ value: { value: 'The Title' } }] }
        });
        expect(resolve('{{appTitle}}')).toEqual({ label: 'The Title', unresolved: false });
    });

    test('flags an unresolved placeholder and keeps the raw label', () => {
        const resolve = buildI18nLabelResolver({ models: {} });
        expect(resolve('{i18n>missingKey}')).toEqual({ label: '{i18n>missingKey}', unresolved: true });
    });

    test('passes a literal (non-placeholder) label through unchanged', () => {
        const resolve = buildI18nLabelResolver({ models: {} });
        expect(resolve('Literal Label')).toEqual({ label: 'Literal Label', unresolved: false });
    });
});
