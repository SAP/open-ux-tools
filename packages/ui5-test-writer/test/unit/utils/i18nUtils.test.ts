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

    test('model bundle wins over sap.app on key collision', () => {
        const resolve = buildI18nLabelResolver({
            'sap.app': { shared: [{ value: { value: 'From sap.app' } }] },
            models: { i18n: { shared: [{ value: { value: 'From model' } }] } }
        });
        expect(resolve('{i18n>shared}')).toEqual({ label: 'From model', unresolved: false });
    });

    test('trims surrounding whitespace in the returned label', () => {
        const resolve = buildI18nLabelResolver({ models: {} });
        expect(resolve('  Padded  ')).toEqual({ label: 'Padded', unresolved: false });
        expect(resolve('  {i18n>missing}  ')).toEqual({ label: '{i18n>missing}', unresolved: true });
    });
});
