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
}

export interface TranslationEntryValue {
    value: string;
}

export interface TranslationEntry {
    key: TranslationEntryValue;
    value: TranslationEntryValue;
}

export type I18nBundle = Record<string, TranslationEntry[]>;

export interface UITranslationProps {
    value?: string;
    id: string;
    disabled?: boolean;
    // Existing I18n entries
    entries: I18nBundle;
    // When entry exists in passed i18n entries and user clicked on show entry button
    onShowExistingEntry?: (entry: TranslationEntry) => void;
    // When creation of new i18n entry is requested
    onCreateNewEntry?: (entry: TranslationEntry) => void;
    // PascalCase or camelCase to be used for key generation
    // Default value is 'CamelCase'
    namingConvention?: TranslationKeyGenerator;
    // Loader indicator
    // ToDo
    busy?: boolean;
    // Default i18n prefix for "SingleBracketBinding"
    i18nPrefix: string;
    // Option to pass multiple allowed prefixes - if not passed then single "i18nPrefix" considered as allowed
    allowedI18nPrefixes?: string[];
    // Default pattern
    defaultPattern: TranslationTextPattern;
    // Allowed pattern
    allowedPatterns: TranslationTextPattern[];
    // Opion to pass custom Texts for component's labels and tooltips
    strings?: TranslationButtonStrings;
}
