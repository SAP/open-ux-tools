import { SapShortTextType, printPropertiesI18nEntry } from '../../../src';

describe('documentation', () => {
    describe('printPropertiesI18nEntry', () => {
        test('no annotation', () => {
            const entry = printPropertiesI18nEntry('key', 'text');
            expect(entry).toEqual('\n#XFLD,20\nkey=text\n');
        });

        test('with annotation as string', () => {
            const entry = printPropertiesI18nEntry('key', 'text', 'FLD: 50: Label for a section');

            expect(entry).toEqual('\n#XFLD: 50: Label for a section\nkey=text\n');
        });

        test('with annotation text type', () => {
            const entry = printPropertiesI18nEntry('key', 'text', { textType: SapShortTextType.Label });
            expect(entry).toEqual('\n#XFLD\nkey=text\n');
        });

        test('with annotation text type and note', () => {
            const entry = printPropertiesI18nEntry('key', 'text', {
                textType: SapShortTextType.Label,
                note: 'Label for a section'
            });
            expect(entry).toEqual('\n#XFLD: Label for a section\nkey=text\n');
        });

        test('with annotation text type and length restriction', () => {
            const entry = printPropertiesI18nEntry('key', 'text', {
                textType: SapShortTextType.Label,
                maxLength: 50
            });
            expect(entry).toEqual('\n#XFLD,50\nkey=text\n');
        });

        test('with annotation text type, length restriction and note', () => {
            const entry = printPropertiesI18nEntry('key', 'text', {
                textType: SapShortTextType.Label,
                maxLength: 50,
                note: 'Label for a section'
            });
            expect(entry).toEqual('\n#XFLD,50: Label for a section\nkey=text\n');
        });
    });
});
