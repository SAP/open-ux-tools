import { convertCamelCaseToPascalCase, toSpacedWords } from '../../src/utils';

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
    });

    describe('toSpacedWords', () => {
        test('splits correctly', () => {
            const case1 = toSpacedWords('setFlexExtensionPointEnabled');
            const case2 = toSpacedWords('addXMLAtExtensionPoint');

            expect(case1).toBe('Set Flex Extension Point Enabled');
            expect(case2).toBe('Add XML At Extension Point');
        });
    });
});
