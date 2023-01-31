export interface TranslationButtonStrings {
    acceptButtonLabel: string;
    cancelButtonLabel: string;
    i18nEntryExistsTooltip: string;
    i18nKeyMissingTooltip: string;
    i18nKeyMissingDescription: string;
    i18nValueMissingTooltip: string;
    i18nValueMissingDescription: string;
    i18nReplaceWithExistingTooltip: string;
    i18nReplaceWithExistingDescription: string;
}

export enum TranslationKeyGenerator {
    CamelCase = 'CamelCase',
    PascalCase = 'PascalCase'
}

export enum TranslationTextPattern {
    // Pattern `{{}}`
    DoubleBracketReplace = 'DoubleBracketReplace',
    // Pattern `{key>}`
    SingleBracketBinding = 'SingleBracketBinding'
    //SingleBracketAtSigninding = 'SingleBracketAtSigninding'
}

export interface TranslationEntryValue {
    value: string;
}

export interface TranslationEntry {
    key: TranslationEntryValue;
    value: TranslationEntryValue;
}

export type I18nBundle = Record<string, TranslationEntry[]>;

// {
//     "key": [
//         {
//             key:
//         }
//     ]
// }

// // Format using sapui5 binding syntax like "{i18n>value}"
// export const TRANSLATION_VALUE_FORMAT_BINDING = 'binding';
// // Format using replace syntax like {{value}}
// export const TRANSLATION_VALUE_FORMAT_REPLACE = 'replace';
// export type TranslationValueFormat = typeof TRANSLATION_VALUE_FORMAT_BINDING | typeof TRANSLATION_VALUE_FORMAT_REPLACE;

export interface UITranslationButtonProps {
    value?: string;
    id: string;
    disabled?: boolean;
    // Questionsable/refactor properties
    // appId?: string;
    // appJsonFilePath?: string;
    // name: string;
    // i18nPrefix?: string;
    // path?: PropertyPath;
    // // Default value is 'binding'
    // generateFormat?: TranslationValueFormat;

    entries: I18nBundle;
    // When entry exists in passed i18n entries and user clicked on show entry button
    // ToDo - param
    onShowExistingEntry?: (entry: TranslationEntry) => void;
    // When creation of new i18n entry is requested
    onCreateNewEntry?: (entry: TranslationEntry) => void;
    // ToDo
    onUpdateValue?: (value: string) => void;
    // PascalCase or camelCase to be used for key generation
    // Default value is -> ???
    namingConvention?: TranslationKeyGenerator;
    // Loader indicator
    busy?: boolean;

    //
    // texts?: {

    // }
    defaultPattern: TranslationTextPattern;
    i18nPrefix: string;
    allowedPatterns: TranslationTextPattern[];

    strings?: TranslationButtonStrings;
}
