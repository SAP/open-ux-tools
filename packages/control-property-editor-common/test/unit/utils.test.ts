import { convertCamelCaseToPascalCase } from '../../src/utils';

describe('utils', () => {
    describe('convertCamelCaseToPascalCase', () => {
        test('cases', () => {
            expect(convertCamelCaseToPascalCase('busy')).toMatchInlineSnapshot(`"Busy"`);
        });
        test('two words', () => {
            expect(convertCamelCaseToPascalCase('hAlign')).toMatchInlineSnapshot(`"H Align"`);
        });
        test('three words', () => {
            expect(convertCamelCaseToPascalCase('ariaHasPopup')).toMatchInlineSnapshot(`"Aria Has Popup"`);
        });
        test('abreviated words', () => {
            expect(convertCamelCaseToPascalCase('addXMLhasChangeFilesWITHspaceNOw')).toMatchInlineSnapshot(
                `"Add XMLhas Change Files WITHspace NOw"`
            );
        });
    });
});
