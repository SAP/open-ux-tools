import { initI18n, i18nText } from '../../src/index.js';

describe('i18n', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('Resolve existing i18n text', () => {
        expect(i18nText('ERROR_SYNTAX')).toEqual('A syntax error occurred.');
    });

    it('Resolve nonexistent i18n text', () => {
        expect(i18nText('DUMMY')).toEqual('DUMMY');
    });
});
