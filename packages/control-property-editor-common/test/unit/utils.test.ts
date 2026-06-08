import { convertCamelCaseToPascalCase } from '../../src/utils.js';

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

        describe('sentence case detection', () => {
            test('should return text as-is if already in sentence case', () => {
                expect(convertCamelCaseToPascalCase('This is sentence case')).toStrictEqual('This is sentence case');
            });
            test('should return text as-is for sentence case with single space', () => {
                expect(convertCamelCaseToPascalCase('Test case')).toStrictEqual('Test case');
            });
            test('should return text as-is for sentence case with multiple spaces', () => {
                expect(convertCamelCaseToPascalCase('Multiple word sentence case')).toStrictEqual(
                    'Multiple word sentence case'
                );
            });
        });

        describe('edge cases', () => {
            test('should handle empty string', () => {
                expect(convertCamelCaseToPascalCase('')).toStrictEqual('');
            });
            test('should handle string starting with lowercase (not sentence case)', () => {
                expect(convertCamelCaseToPascalCase('lowerCaseStart')).toStrictEqual('Lower Case Start');
            });
            test('should not treat hyphenated string as sentence case', () => {
                expect(convertCamelCaseToPascalCase('Test-Hyphen-Case')).toStrictEqual('Test Hyphen Case');
            });
            test('should not treat underscored string as sentence case', () => {
                expect(convertCamelCaseToPascalCase('Test_Underscore_Case')).toStrictEqual('Test Underscore Case');
            });
            test('should handle single uppercase character', () => {
                expect(convertCamelCaseToPascalCase('A')).toStrictEqual('A');
            });
            test('should handle abbreviated words at end', () => {
                expect(convertCamelCaseToPascalCase('parseHTMLString')).toStrictEqual('Parse HTML String');
            });
            test('should handle consecutive abbreviated words', () => {
                expect(convertCamelCaseToPascalCase('XMLHTTPRequest')).toStrictEqual('XMLHTTPRequest');
            });
            test('should handle abbreviated word at start', () => {
                expect(convertCamelCaseToPascalCase('HTTPServer')).toStrictEqual('HTTPServer');
            });
            test('should handle abbreviated word at end of string', () => {
                expect(convertCamelCaseToPascalCase('dataXML')).toStrictEqual('Data XML');
            });
        });
    });
});
