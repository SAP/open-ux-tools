import { getI18nConfiguration } from '../../../src/utils';
import { getI18nFolderNames } from '../../../src';

describe('config', () => {
    const env = Object.freeze({
        i18n: {
            folders: ['_i18n', 'i18n', 'assets/i18n'],
            default_language: 'en'
        }
    });
    test('getI18nConfiguration', () => {
        const result = getI18nConfiguration(env);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "baseFileName": "i18n",
              "defaultLanguage": "en",
              "fallbackLanguage": "",
              "folders": Array [
                "_i18n",
                "i18n",
                "assets/i18n",
              ],
            }
        `);
    });
    test('getI18nFolderNames', () => {
        const result = getI18nFolderNames(env);
        expect(result).toMatchInlineSnapshot(`
            Array [
              "_i18n",
              "i18n",
              "assets/i18n",
            ]
        `);
    });
});
