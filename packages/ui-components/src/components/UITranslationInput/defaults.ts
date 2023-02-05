import type { TranslationButtonStrings } from './UITranslationButton.types';

export const defaultTranslationButtonStrings: TranslationButtonStrings = {
    acceptButtonLabel: 'Accept',
    cancelButtonLabel: 'Cancel',
    i18nKeyMissingTooltip: 'Text key or value is not available in i18n file.',
    i18nKeyMissingDescription: 'Generate a text key {{{key}}} with value {{{value}}} in i18n file.',
    i18nValueMissingTooltip: 'Text key or value for {{{value}}} is not available in i18n file.',
    i18nValueMissingDescription: 'Generate a text key {{{key}}} in i18n file and substitute {{{value}}} by {{{i18n}}}.',
    i18nReplaceWithExistingTooltip:
        'Text key {{{key}}} for value {{{value}}} is available in i18n file. \nConsider substituting {{{value}}} by {{{i18n}}}.',
    i18nReplaceWithExistingDescription:
        'Text key {{{key}}} for value {{{value}}} is available in i18n file.Substitute {{{value}}} by {{{i18n}}}.',
    i18nEntryExistsTooltip: 'Edit in source file'
};
