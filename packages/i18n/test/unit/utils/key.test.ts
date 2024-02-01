import { type I18nEntry, I18nBundle, extractI18nKey, getI18nUniqueKey } from '../../../src';
import { Range } from '../../../src/parser/utils';

describe('key', () => {
    describe('extractI18nKey', () => {
        test('case 0: >', () => {
            // arrange
            const input = '{@i18n>generalInformation}';
            // act
            const result = extractI18nKey(input);
            // assert
            expect(result).toEqual('generalInformation');
        });
        test('case 1: &gt;', () => {
            // arrange
            const input = '{@i18n&gt;generalInformation}';
            // act
            const result = extractI18nKey(input);
            // assert
            expect(result).toEqual('generalInformation');
        });
        test('case 2: withoutAt >', () => {
            // arrange
            const input = '{i18n>generalInformation}';
            // act
            const result = extractI18nKey(input, true);
            // assert
            expect(result).toEqual('generalInformation');
        });
        test('case 3: withoutAt &gt;', () => {
            // arrange
            const input = '{i18n&gt;generalInformation}';
            // act
            const result = extractI18nKey(input, true);
            // assert
            expect(result).toEqual('generalInformation');
        });
    });
    describe('getI18nUniqueKey', () => {
        const range = Range.create(0, 0, 0, 0);
        test('with list', () => {
            // arrange
            const key = 'productInfo';
            const I18nEntries: I18nEntry[] = [
                {
                    filePath: 'absolute/file/path',
                    key: {
                        value: 'productInfo',
                        range
                    },
                    value: {
                        value: 'Product information',
                        range
                    }
                },
                {
                    filePath: 'absolute/file/path',
                    key: {
                        value: 'productInfo1',
                        range
                    },
                    value: {
                        value: 'Product information',
                        range
                    }
                }
            ];
            // act
            const result = getI18nUniqueKey(key, I18nEntries);
            // assert
            expect(result).toEqual('productInfo2');
        });

        test('with bundle', () => {
            // arrange
            const key = 'productInfo';
            const I18nEntries: I18nBundle = {
                productInfo: [
                    {
                        filePath: 'absolute/file/path',
                        key: {
                            value: 'productInfo',
                            range
                        },
                        value: {
                            value: 'Product information',
                            range
                        }
                    }
                ],
                productInfo1: [
                    {
                        filePath: 'absolute/file/path',
                        key: {
                            value: 'productInfo1',
                            range
                        },
                        value: {
                            value: 'Products information',
                            range
                        }
                    }
                ]
            };
            // act
            const result = getI18nUniqueKey(key, I18nEntries);
            // assert
            expect(result).toEqual('productInfo2');
        });
    });
});
