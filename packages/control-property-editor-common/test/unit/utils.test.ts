import { convertCamelCaseToPascalCase } from '../../src/utils';

describe('utils', () => {
    describe('convertCamelCaseToPascalCase', () => {
        test('cases', () => {
            expect(convertCamelCaseToPascalCase('busy')).toStrictEqual('Busy');
        });
        test('two words', () => {
            expect(convertCamelCaseToPascalCase('hAlign')).toStrictEqual('H Align');
        });
        test('setFlexExtensionPointEnabled', () => {
            expect(convertCamelCaseToPascalCase('setFlexExtensionPointEnabled')).toStrictEqual(
                'Set Flex Extension Point Enabled'
            );
        });
        test('addXMLAtExtensionPoint', () => {
            expect(convertCamelCaseToPascalCase('addXMLAtExtensionPoint')).toStrictEqual('Add XML At Extension Point');
        });
        test('three words', () => {
            expect(convertCamelCaseToPascalCase('ariaHasPopup')).toStrictEqual('Aria Has Popup');
        });
        test('test-hyphen', () => {
            expect(convertCamelCaseToPascalCase('test-hyphen')).toStrictEqual('Test Hyphen');
        });
        test('test_underscore', () => {
            expect(convertCamelCaseToPascalCase('test_underscore')).toStrictEqual('Test Underscore');
        });
        test('test space', () => {
            expect(convertCamelCaseToPascalCase('test space')).toStrictEqual('Test Space');
        });
    });
});
