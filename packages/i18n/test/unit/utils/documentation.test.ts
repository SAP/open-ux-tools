import { type I18nEntry, SapShortTextType, initI18n, getI18nDocumentation } from '../../../src';
import { Range } from '../../../src/parser/utils';

describe('documentation', () => {
    describe('getI18nDocumentation', () => {
        const range = Range.create(0, 0, 0, 0);
        beforeAll(async () => {
            await initI18n();
        });
        test('full annotations', () => {
            // arrange
            const input: I18nEntry = {
                filePath: 'absolute/file/path',
                key: {
                    value: 'productDetailsInfo',
                    range
                },
                value: {
                    value: 'product details info',
                    range
                },
                annotation: {
                    textType: {
                        value: SapShortTextType.Label,
                        range
                    },
                    maxLength: {
                        value: 60,
                        range
                    },
                    note: {
                        value: ' Label for a section',
                        range
                    }
                }
            };
            // act
            const result = getI18nDocumentation(input);
            // assert
            expect(result).toMatchSnapshot();
        });
        test('no note', () => {
            // arrange
            const input: I18nEntry = {
                filePath: 'absolute/file/path',
                key: {
                    value: 'productDetailsInfo',
                    range
                },
                value: {
                    value: 'product details info',
                    range
                },
                annotation: {
                    textType: {
                        value: SapShortTextType.Label,
                        range
                    },
                    maxLength: {
                        value: 60,
                        range
                    }
                }
            };
            // act
            const result = getI18nDocumentation(input);
            // assert
            expect(result).toMatchSnapshot();
        });
        test('no max length', () => {
            // arrange
            const input: I18nEntry = {
                filePath: 'absolute/file/path',
                key: {
                    value: 'productDetailsInfo',
                    range
                },
                value: {
                    value: 'product details info',
                    range
                },
                annotation: {
                    textType: {
                        value: SapShortTextType.Label,
                        range
                    }
                }
            };
            // act
            const result = getI18nDocumentation(input);
            // assert
            expect(result).toMatchSnapshot();
        });
        test('no annotation', () => {
            // arrange
            const input: I18nEntry = {
                filePath: 'absolute/file/path',
                key: {
                    value: 'productDetailsInfo',
                    range
                },
                value: {
                    value: 'product details info',
                    range
                }
            };
            // act
            const result = getI18nDocumentation(input);
            // assert
            expect(result).toMatchSnapshot();
        });
    });
});
