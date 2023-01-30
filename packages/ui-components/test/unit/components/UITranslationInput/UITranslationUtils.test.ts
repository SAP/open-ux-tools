import { TranslationTextPattern } from '../../../../src/components/UITranslationInput/UITranslationButton.types';
import { extractI18nKey } from '../../../../src/components/UITranslationInput/UITranslationUtils';

describe('UITranslationUtils', () => {
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
            value: '{{}}',
            patterns: [TranslationTextPattern.DoubleBracketReplace],
            expectedKey: 'test'
        },
        {
            value: '{i18n>test}',
            patterns: [TranslationTextPattern.DoubleBracketReplace, TranslationTextPattern.SingleBracketBinding],
            expectedKey: 'test'
        }
    ];
    for (const testCase of testCases) {
        it(`Test "${testCase.value}" with patterns ${JSON.stringify(testCase.patterns)}`, () => {
            extractI18nKey(testCase.value, testCase.patterns);
        });
    }
});
