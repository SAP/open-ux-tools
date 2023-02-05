import {
    TranslationTextPattern,
    TranslationKeyGenerator
} from '../../../../src/components/UITranslationInput/UITranslationButton.types';
import type { I18nBundle } from '../../../../src/components/UITranslationInput/UITranslationButton.types';
import { extractI18nKey, generateI18nKey } from '../../../../src/components/UITranslationInput/UITranslationUtils';

describe('UITranslationUtils', () => {
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
        const entries = ['dummy', 'Dummy', 'dummy1', 'Dummy1', 'test', 'Test'];
        const bundle: I18nBundle = {};
        for (const entry of entries) {
            bundle[entry] = [
                {
                    key: {
                        value: entry
                    },
                    value: {
                        value: entry
                    }
                }
            ];
        }

        test.each(testCases)('Test "$value" with generator $generator', ({ value, generator, expectedKey }) => {
            const key = generateI18nKey(value, generator, bundle);
            expect(key).toEqual(expectedKey);
        });
    });
});
