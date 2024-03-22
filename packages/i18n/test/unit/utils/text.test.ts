import { convertToCamelCase, convertToPascalCase, getI18nMaxLength, getI18nTextType } from '../../../src';

describe('text', () => {
    test('getI18nMaxLength', () => {
        // arrange
        const input = 'product details info';
        // act
        const result = getI18nMaxLength(input);
        // assert
        expect(result).toEqual(60);
    });
    describe('getI18nTextType', () => {
        test('case 0: XFLD', () => {
            // act
            const result = getI18nTextType(120);
            // assert
            expect(result).toEqual('XFLD');
        });
        test('case 1: YMSG', () => {
            // act
            const result = getI18nTextType(121);
            // assert
            expect(result).toEqual('YMSG');
        });
    });
    describe('convertToCamelCase', () => {
        test('case 0: less than 4 words', () => {
            // arrange
            const input = 'product details info';
            // act
            const result = convertToCamelCase(input);
            // assert
            expect(result).toEqual('productDetailsInfo');
        });
        test('case 1: more than 4 words', () => {
            // arrange
            const input = 'info about the latest sold products in 2020';
            // act
            const result = convertToCamelCase(input);
            // assert
            expect(result).toEqual('infoAboutTheLatest');
        });

        test('case 3: words with special characters', () => {
            // arrange
            const input = 'test = hello world';
            // act
            const result = convertToCamelCase(input);
            // assert
            expect(result).toEqual('testHelloWorld');
        });
    });
    describe('convertToPascalCase', () => {
        test('case 0: less than 4 words', () => {
            // arrange
            const input = 'product details info';
            // act
            const result = convertToPascalCase(input);
            // assert
            expect(result).toEqual('ProductDetailsInfo');
        });
        test('case 1: more than 4 words', () => {
            // arrange
            const input = 'info about the latest sold products in 2020';
            // act
            const result = convertToPascalCase(input);
            // assert
            expect(result).toEqual('InfoAboutTheLatest');
        });
        test('case 3: words with special characters', () => {
            // arrange
            const input = 'test = hello world';
            // act
            const result = convertToPascalCase(input);
            // assert
            expect(result).toEqual('TestHelloWorld');
        });
    });
});
