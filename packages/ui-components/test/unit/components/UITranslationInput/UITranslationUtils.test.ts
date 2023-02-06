import {
    TranslationTextPattern,
    TranslationKeyGenerator
} from '../../../../src/components/UITranslationInput/UITranslationButton.types';
import type { I18nBundle } from '../../../../src/components/UITranslationInput/UITranslationButton.types';
import {
    extractI18nKey,
    generateI18nKey,
    applyI18nPattern,
    getTranslationByKey,
    getTranslationByText
} from '../../../../src/components/UITranslationInput/UITranslationUtils';
import { getBundle } from './utils';

describe('UITranslationUtils', () => {
    const bundle: I18nBundle = getBundle();
    describe('extractI18nKey', () => {
        const testCases = [
            {
                value: '{i18n>test}',
                patterns: [TranslationTextPattern.SingleBracketBinding],
                expectedKey: 'test'
            },
            {
                value: '{{test}}',
                patterns: [TranslationTextPattern.SingleBracketBinding],
                expectedKey: undefined
            },
            {
                value: '{{test}}',
                patterns: [TranslationTextPattern.DoubleBracketReplace],
                expectedKey: 'test'
            },
            {
                value: '{{}}',
                patterns: [TranslationTextPattern.DoubleBracketReplace],
                expectedKey: undefined
            },
            {
                value: '{i18n>test}',
                patterns: [TranslationTextPattern.DoubleBracketReplace, TranslationTextPattern.SingleBracketBinding],
                expectedKey: 'test'
            }
        ];

        test.each(testCases)('Test "$value" with patterns $patterns', (testCase) => {
            const key = extractI18nKey(testCase.value, testCase.patterns, 'i18n');
            expect(key).toEqual(testCase.expectedKey);
        });
    });

    describe('generateI18nKey', () => {
        const testCases = [
            {
                value: 'dummy test',
                generator: TranslationKeyGenerator.CamelCase,
                expectedKey: 'dummyTest'
            },
            {
                value: 'dummy test',
                generator: TranslationKeyGenerator.PascalCase,
                expectedKey: 'DummyTest'
            },
            // Max words
            {
                value: 'dummy one two three foru five',
                generator: TranslationKeyGenerator.CamelCase,
                expectedKey: 'dummyOneTwoThree'
            },
            {
                value: 'dummy one two three foru five',
                generator: TranslationKeyGenerator.PascalCase,
                expectedKey: 'DummyOneTwoThree'
            },
            // Special case - empty is resolved with default key
            {
                value: '',
                generator: TranslationKeyGenerator.CamelCase,
                expectedKey: 'key'
            },
            {
                value: '',
                generator: TranslationKeyGenerator.PascalCase,
                expectedKey: 'Key'
            },
            // Duplicate entry
            {
                value: 'dummy',
                generator: TranslationKeyGenerator.CamelCase,
                expectedKey: 'dummy2'
            },
            {
                value: 'dummy',
                generator: TranslationKeyGenerator.PascalCase,
                expectedKey: 'Dummy2'
            },
            {
                value: 'test',
                generator: TranslationKeyGenerator.CamelCase,
                expectedKey: 'test1'
            },
            {
                value: 'test',
                generator: TranslationKeyGenerator.PascalCase,
                expectedKey: 'Test1'
            }
        ];

        test.each(testCases)('Test "$value" with generator $generator', ({ value, generator, expectedKey }) => {
            const key = generateI18nKey(value, generator, bundle);
            expect(key).toEqual(expectedKey);
        });
    });

    describe('applyI18nPattern', () => {
        const testCases = [
            {
                key: 'dummy',
                pattern: TranslationTextPattern.SingleBracketBinding,
                prefix: 'testI18n',
                expectedValue: '{testI18n>dummy}'
            },
            {
                key: 'dummy',
                pattern: TranslationTextPattern.DoubleBracketReplace,
                prefix: '',
                expectedValue: '{{dummy}}'
            }
        ];

        test.each(testCases)('Test "$key" with pattern $pattern', ({ key, pattern, prefix, expectedValue }) => {
            const value = applyI18nPattern(key, pattern, prefix);
            expect(value).toEqual(expectedValue);
        });
    });

    describe('getTranslationByKey', () => {
        const testCases = [
            {
                key: 'dummy1',
                expectedEntry: bundle['dummy1'][0]
            },
            {
                key: 'dummy404',
                expectedEntry: undefined
            }
        ];

        test.each(testCases)('Test "$key"', ({ key, expectedEntry }) => {
            const value = getTranslationByKey(bundle, key);
            expect(value).toEqual(expectedEntry);
        });
    });

    describe('getTranslationByText', () => {
        const testCases = [
            {
                text: 'dummy text',
                expectedEntry: bundle['dummy'][0]
            },
            {
                text: 'dummy 404',
                expectedEntry: undefined
            }
        ];

        test.each(testCases)('Test "$key"', ({ text, expectedEntry }) => {
            const value = getTranslationByText(bundle, text);
            expect(value).toEqual(expectedEntry);
        });
    });
});
