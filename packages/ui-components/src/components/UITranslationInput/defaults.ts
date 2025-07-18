import type { TranslationInputStrings } from './UITranslationButton.types';

export const defaultTranslationInputStrings: TranslationInputStrings = {
    acceptButtonLabel: 'Substitute',
    cancelButtonLabel: 'Cancel',
    i18nKeyMissingTooltip: 'Text key or value is not available in i18n file.',
    i18nKeyMissingDescription: 'Generate a text key {{{key}}} with value {{{value}}} in i18n file.',
    i18nValueMissingTooltip: 'Text key or value for {{{value}}} is not available in i18n file.',
    i18nValueMissingDescription:
        'Generate a text key {{{key}}} in i18n file and substitute {{{value}}} with {{{i18n}}}.',
    i18nReplaceWithExistingTooltip:
        'Text key {{{key}}} for value {{{value}}} is available in i18n file. \nConsider substituting {{{value}}} with {{{i18n}}}.',
    i18nReplaceWithExistingDescription:
        'Text key {{{key}}} for value {{{value}}} is available in i18n file. Substitute {{{value}}} with {{{i18n}}}?',
    i18nEntryExistsTooltip: 'Edit in source file',
    i18nEntryExistsInputTooltip: "Value: '{{{value}}}'.\nTranslation: '{{{translation}}}'."
};
